<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\TelegramBot;
use App\Models\TelegramSettings;
use App\Models\User;
use App\Services\TelegramBotService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TelegramConfigController extends Controller
{
    public function broadcastPage(Request $request): Response
    {
        $user = auth()->user();
        $hasManagerPower = $user->hasRole('Ticket Super Admin')
            || !empty($user->managedDepartmentIds())
            || $user->can('view telegram config')
            || $user->can('ticket.view.department')
            || $user->can('ticket.view.all');

        if (!$hasManagerPower) {
            abort(403, 'Only managers and administrators can access Broadcast Announcements.');
        }

        $user->loadMissing(['employee.department']);
        $senderDept = $user->employee?->department?->name ?? 'Company Management';

        $linkedBranchesCount = Branch::whereNotNull('telegram_chat_id')->where('telegram_chat_id', '!=', '')->count();
        $linkedUsersCount = User::whereNotNull('telegram_chat_id')->where('telegram_chat_id', '!=', '')->count();

        $departments = \App\Models\Department::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('broadcast-announcements/index', [
            'senderDepartment' => $senderDept,
            'departments' => $departments,
            'linkedBranchesCount' => $linkedBranchesCount,
            'linkedUsersCount' => $linkedUsersCount,
        ]);
    }

    public function index(TelegramBotService $botService): Response
    {
        $user = auth()->user();
        $canView = $user->hasRole(['Super Admin', 'Admin', 'Ticket Super Admin'])
            || $user->can('view telegram config')
            || $user->can('manage telegram config');

        if (!$canView) {
            abort(403, 'You do not have permission to view Telegram configuration.');
        }

        $settings = TelegramSettings::getInstance();
        $settings->load('updater');

        $botInfo = $botService->getMe();
        $webhookInfo = $botService->getWebhookInfo();

        $primaryToken = $settings->helpdesk_bot_token ?: $settings->bot_token;
        $budgetToken = $settings->budget_bot_token;
        $memoToken = $settings->memo_bot_token;

        $isSeparateBudgetBot = !empty($budgetToken) && trim($budgetToken) !== trim($primaryToken);
        $isSeparateMemoBot = !empty($memoToken) && trim($memoToken) !== trim($primaryToken);

        $budgetBotInfo = null;
        $budgetWebhookInfo = null;
        if ($isSeparateBudgetBot) {
            try {
                $responseMe = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$budgetToken}/getMe");
                if ($responseMe->successful()) {
                    $budgetBotInfo = $responseMe->json();
                }

                $responseWh = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$budgetToken}/getWebhookInfo");
                if ($responseWh->successful()) {
                    $budgetWebhookInfo = $responseWh->json();
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Budget bot info fetch error: " . $e->getMessage());
            }
        } elseif (!empty($primaryToken)) {
            $budgetBotInfo = $botInfo;
            $budgetWebhookInfo = $webhookInfo;
        }

        $memoBotInfo = null;
        $memoWebhookInfo = null;
        if ($isSeparateMemoBot) {
            try {
                $responseMe = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$memoToken}/getMe");
                if ($responseMe->successful()) {
                    $memoBotInfo = $responseMe->json();
                }

                $responseWh = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$memoToken}/getWebhookInfo");
                if ($responseWh->successful()) {
                    $memoWebhookInfo = $responseWh->json();
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Memo bot info fetch error: " . $e->getMessage());
            }
        } elseif (!empty($primaryToken)) {
            $memoBotInfo = $botInfo;
            $memoWebhookInfo = $webhookInfo;
        }

        // Fetch dynamic bot list with live getMe and getWebhookInfo
        $allBots = TelegramBot::orderBy('id')->get()->map(function ($bot) {
            $botInfo = null;
            $webhookInfo = null;
            if (!empty($bot->bot_token)) {
                try {
                    $respMe = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(5)->get("https://api.telegram.org/bot{$bot->bot_token}/getMe");
                    if ($respMe->successful()) {
                        $botInfo = $respMe->json('result');
                    }
                    $respWh = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(5)->get("https://api.telegram.org/bot{$bot->bot_token}/getWebhookInfo");
                    if ($respWh->successful()) {
                        $webhookInfo = $respWh->json('result');
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Fetch bot info error for {$bot->slug}: " . $e->getMessage());
                }
            }

            return [
                'id' => $bot->id,
                'name' => $bot->name,
                'slug' => $bot->slug,
                'bot_token' => $bot->bot_token,
                'bot_username' => $bot->bot_username ?: ($botInfo['username'] ?? null),
                'webhook_url' => $bot->webhook_url ?: ($webhookInfo['url'] ?? null),
                'is_active' => (bool) $bot->is_active,
                'description' => $bot->description,
                'created_at' => $bot->created_at?->toIso8601String(),
                'bot_info' => $botInfo,
                'webhook_info' => $webhookInfo,
            ];
        });

        $users = User::with(['employee.department', 'employee.branch', 'roles'])
            ->select('id', 'name', 'email', 'telegram_chat_id', 'telegram_username', 'employee_id')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->employee?->phone ?? null,
                    'telegram_chat_id' => $user->telegram_chat_id,
                    'telegram_username' => $user->telegram_username,
                    'department' => $user->employee?->department?->name ?? 'N/A',
                    'branch' => $user->employee?->branch?->name ?? 'N/A',
                    'branch_id' => $user->employee?->branch_id,
                    'roles' => $user->roles->pluck('name')->toArray(),
                    'is_linked' => !empty($user->telegram_chat_id),
                ];
            });

        $budgetPermissions = ['view department budgets', 'view finance budgets', 'view ceo budgets', 'manage weekly budgets', 'create weekly budgets'];

        $budgetUsers = User::with(['employee.department', 'employee.branch', 'roles', 'permissions'])
            ->where(function ($q) use ($budgetPermissions) {
                $q->whereHas('permissions', fn($pq) => $pq->whereIn('name', $budgetPermissions))
                  ->orWhereHas('roles.permissions', fn($rpq) => $rpq->whereIn('name', $budgetPermissions))
                  ->orWhereHas('employee.department', fn($dq) => $dq->where('name', 'like', '%Finance%')->orWhere('name', 'like', '%Budget%')->orWhere('name', 'like', '%Executive%'))
                  ->orWhereExists(function ($subq) {
                      $subq->select(\Illuminate\Support\Facades\DB::raw(1))
                           ->from('weekly_budgets')
                           ->whereColumn('weekly_budgets.created_by', 'users.id');
                  });
            })
            ->select('id', 'name', 'email', 'telegram_chat_id', 'telegram_username', 'employee_id')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->employee?->phone ?? null,
                    'telegram_chat_id' => $user->telegram_chat_id,
                    'telegram_username' => $user->telegram_username,
                    'department' => $user->employee?->department?->name ?? 'N/A',
                    'branch' => $user->employee?->branch?->name ?? 'N/A',
                    'branch_id' => $user->employee?->branch_id,
                    'roles' => $user->roles->pluck('name')->toArray(),
                    'is_linked' => !empty($user->telegram_chat_id),
                ];
            });

        $branches = Branch::select('id', 'branch_code', 'name', 'location', 'telegram_chat_id')
            ->orderBy('name')
            ->get()
            ->map(function ($branch) {
                return [
                    'id' => $branch->id,
                    'branch_code' => $branch->branch_code,
                    'name' => $branch->name,
                    'location' => $branch->location,
                    'telegram_chat_id' => $branch->telegram_chat_id,
                    'is_linked' => !empty($branch->telegram_chat_id),
                ];
            });

        $defaultWebhookUrl = config('app.url', 'http://localhost:8000') . '/api/telegram/webhook';

        $preOrderBot = TelegramBot::where('slug', 'pre_order')->first();
        $preOrderToken = $preOrderBot?->bot_token ?: $settings->pre_order_bot_token;

        $preOrderBotInfo = null;
        $preOrderWebhookInfo = null;
        if (!empty($preOrderToken)) {
            try {
                $responseMe = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$preOrderToken}/getMe");
                if ($responseMe->successful()) {
                    $preOrderBotInfo = $responseMe->json();
                }

                $responseWh = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$preOrderToken}/getWebhookInfo");
                if ($responseWh->successful()) {
                    $preOrderWebhookInfo = $responseWh->json();
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Pre-order bot info fetch error: " . $e->getMessage());
            }
        }

        $trainingBot = TelegramBot::where('slug', 'training')->first();
        $trainingToken = $trainingBot?->bot_token ?: $settings->training_bot_token;

        $trainingBotInfo = null;
        $trainingWebhookInfo = null;
        if (!empty($trainingToken)) {
            try {
                $responseMe = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$trainingToken}/getMe");
                if ($responseMe->successful()) {
                    $trainingBotInfo = $responseMe->json();
                }

                $responseWh = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get("https://api.telegram.org/bot{$trainingToken}/getWebhookInfo");
                if ($responseWh->successful()) {
                    $trainingWebhookInfo = $responseWh->json();
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Training bot info fetch error: " . $e->getMessage());
            }
        }

        return Inertia::render('telegram-config/index', [
            'settings' => $settings,
            'botInfo' => $botInfo,
            'webhookInfo' => $webhookInfo,
            'budgetBotInfo' => $budgetBotInfo,
            'budgetWebhookInfo' => $budgetWebhookInfo,
            'memoBotInfo' => $memoBotInfo,
            'memoWebhookInfo' => $memoWebhookInfo,
            'preOrderBotInfo' => $preOrderBotInfo,
            'preOrderWebhookInfo' => $preOrderWebhookInfo,
            'trainingBotInfo' => $trainingBotInfo,
            'trainingWebhookInfo' => $trainingWebhookInfo,
            'allBots' => $allBots,
            'users' => $users,
            'budgetUsers' => $budgetUsers,
            'branches' => $branches,
            'defaultWebhookUrl' => $defaultWebhookUrl,
            'canManage' => auth()->user()->hasRole(['Super Admin', 'Admin']) || auth()->user()->can('manage telegram config'),
            'userPermissions' => auth()->user()->getAllPermissions()->pluck('name')->toArray(),
        ]);
    }

    protected function authorizeManager(): void
    {
        $user = auth()->user();
        $isAuthorized = $user->hasRole(['Super Admin', 'Admin', 'Ticket Super Admin'])
            || $user->can('manage telegram config')
            || $user->can('view telegram config');

        if (!$isAuthorized) {
            abort(403, 'You do not have permission to manage Telegram configuration.');
        }
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'bot_token' => ['nullable', 'string', 'max:255'],
            'helpdesk_bot_token' => ['nullable', 'string', 'max:255'],
            'helpdesk_bot_username' => ['nullable', 'string', 'max:255'],
            'budget_bot_token' => ['nullable', 'string', 'max:255'],
            'budget_bot_username' => ['nullable', 'string', 'max:255'],
            'memo_bot_token' => ['nullable', 'string', 'max:255'],
            'memo_bot_username' => ['nullable', 'string', 'max:255'],
            'pre_order_bot_token' => ['nullable', 'string', 'max:255'],
            'pre_order_bot_username' => ['nullable', 'string', 'max:255'],
            'training_bot_token' => ['nullable', 'string', 'max:255'],
            'training_bot_username' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
            'parse_mode' => ['required', 'string', 'in:HTML,Markdown,MarkdownV2'],
            'deactivation_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $settings = TelegramSettings::getInstance();
        $helpdeskToken = $validated['helpdesk_bot_token'] ?? $validated['bot_token'] ?? $settings->helpdesk_bot_token;

        $settings->update([
            'bot_token' => $helpdeskToken,
            'helpdesk_bot_token' => $helpdeskToken,
            'helpdesk_bot_username' => $validated['helpdesk_bot_username'] ?? $settings->helpdesk_bot_username,
            'budget_bot_token' => $validated['budget_bot_token'] ?? $settings->budget_bot_token,
            'budget_bot_username' => $validated['budget_bot_username'] ?? $settings->budget_bot_username,
            'memo_bot_token' => $validated['memo_bot_token'] ?? $settings->memo_bot_token,
            'memo_bot_username' => $validated['memo_bot_username'] ?? $settings->memo_bot_username,
            'pre_order_bot_token' => $validated['pre_order_bot_token'] ?? $settings->pre_order_bot_token,
            'pre_order_bot_username' => $validated['pre_order_bot_username'] ?? $settings->pre_order_bot_username,
            'training_bot_token' => $validated['training_bot_token'] ?? $settings->training_bot_token,
            'training_bot_username' => $validated['training_bot_username'] ?? $settings->training_bot_username,
            'is_active' => $validated['is_active'],
            'parse_mode' => $validated['parse_mode'],
            'deactivation_reason' => $validated['is_active'] ? null : ($validated['deactivation_reason'] ?? 'Disabled by administrator'),
            'updated_by' => auth()->id(),
        ]);

        // Sync with telegram_bots table
        if (!empty($helpdeskToken)) {
            TelegramBot::updateOrCreate(['slug' => 'helpdesk'], [
                'name' => 'Helpdesk & Ticketing Bot',
                'bot_token' => $helpdeskToken,
                'bot_username' => $settings->helpdesk_bot_username,
                'is_active' => $validated['is_active'],
            ]);
        }
        if (!empty($settings->budget_bot_token)) {
            TelegramBot::updateOrCreate(['slug' => 'budget'], [
                'name' => 'Budget System Bot',
                'bot_token' => $settings->budget_bot_token,
                'bot_username' => $settings->budget_bot_username,
                'is_active' => $validated['is_active'],
            ]);
        }
        if (!empty($settings->memo_bot_token)) {
            TelegramBot::updateOrCreate(['slug' => 'memo'], [
                'name' => 'Internal Memorandum Bot',
                'bot_token' => $settings->memo_bot_token,
                'bot_username' => $settings->memo_bot_username,
                'is_active' => $validated['is_active'],
            ]);
        }
        if (!empty($settings->pre_order_bot_token)) {
            TelegramBot::updateOrCreate(['slug' => 'pre_order'], [
                'name' => 'Pre-Order Bot',
                'bot_token' => $settings->pre_order_bot_token,
                'bot_username' => $settings->pre_order_bot_username,
                'is_active' => $validated['is_active'],
            ]);
        }
        if (!empty($settings->training_bot_token)) {
            TelegramBot::updateOrCreate(['slug' => 'training'], [
                'name' => 'Training & LMS System Bot',
                'bot_token' => $settings->training_bot_token,
                'bot_username' => $settings->training_bot_username,
                'is_active' => $validated['is_active'],
            ]);
        }

        return redirect()->back()->with('success', 'Telegram bot credentials updated successfully.');
    }

    public function setWebhook(Request $request, TelegramBotService $botService): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'webhook_url' => ['required', 'url', 'max:500'],
            'bot_type' => ['nullable', 'string'],
        ]);

        $botType = $validated['bot_type'] ?? 'all';

        if ($botType !== 'all') {
            $targetBot = TelegramBot::where('slug', $botType)->first();
            if ($targetBot) {
                return $this->setBotWebhook($request, $targetBot);
            }
        }

        $rawInputUrl = rtrim($validated['webhook_url'], '/');
        $cleanBaseUrl = preg_replace('#/api/telegram(/.*)?$#i', '', $rawInputUrl);

        $settings = TelegramSettings::getInstance();

        $primaryToken = $settings->helpdesk_bot_token ?: $settings->bot_token;
        $budgetToken = $settings->budget_bot_token;
        $memoToken = $settings->memo_bot_token;

        $isSeparateBudgetBot = !empty($budgetToken) && trim($budgetToken) !== trim($primaryToken);
        $isSeparateMemoBot = !empty($memoToken) && trim($memoToken) !== trim($primaryToken);

        $helpdeskWebhook = ($isSeparateBudgetBot || $isSeparateMemoBot)
            ? "{$cleanBaseUrl}/api/telegram/helpdesk-webhook"
            : "{$cleanBaseUrl}/api/telegram/webhook";

        $budgetWebhookUrl = "{$cleanBaseUrl}/api/telegram/budget-webhook";
        $memoWebhookUrl = "{$cleanBaseUrl}/api/telegram/memo-webhook";
        $preOrderWebhookUrl = "{$cleanBaseUrl}/api/telegram/pre-order-webhook";

        $messages = [];

        // 1. Register Primary / Helpdesk Bot Webhook
        if (in_array($botType, ['all', 'helpdesk'])) {
            $resultHelpdesk = $botService->setWebhook($helpdeskWebhook);
            if ($resultHelpdesk['ok'] ?? false) {
                $settings->update(['webhook_url' => $helpdeskWebhook]);
                $messages[] = "Helpdesk bot webhook set to: {$helpdeskWebhook}";
            } else {
                $error = $resultHelpdesk['description'] ?? $resultHelpdesk['error'] ?? 'Failed to set Helpdesk webhook.';
                return redirect()->back()->withErrors(['webhook_url' => "Helpdesk Bot: {$error}"]);
            }
        }

        // 2. Register Budget Bot Webhook
        if (in_array($botType, ['all', 'budget'], true)) {
            $bToken = $botService->getBudgetBotToken();
            if (!empty($bToken)) {
                try {
                    $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$bToken}/setWebhook", [
                        'url' => $budgetWebhookUrl
                    ]);
                    $json = $resp->json();
                    if ($json['ok'] ?? false) {
                        $messages[] = "Budget bot webhook set to: {$budgetWebhookUrl}";
                        $bBot = TelegramBot::whereIn('slug', ['budget', 'budget-bot', 'budget-system-bot'])->first();
                        if ($bBot) $bBot->update(['webhook_url' => $budgetWebhookUrl]);
                    } elseif ($botType === 'budget') {
                        return redirect()->back()->withErrors(['webhook_url' => "Budget Bot: " . ($json['description'] ?? 'Failed to set webhook.')]);
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Budget bot setWebhook error: " . $e->getMessage());
                }
            } elseif ($botType === 'budget') {
                return redirect()->back()->withErrors(['webhook_url' => "Budget Bot token is not configured."]);
            }
        }

        // 3. Register Memo Bot Webhook
        if (in_array($botType, ['all', 'memo'], true)) {
            $mToken = $botService->getMemoBotToken();
            if (!empty($mToken)) {
                try {
                    $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$mToken}/setWebhook", [
                        'url' => $memoWebhookUrl
                    ]);
                    $json = $resp->json();
                    if ($json['ok'] ?? false) {
                        $messages[] = "Memorandum bot webhook set to: {$memoWebhookUrl}";
                        $mBot = TelegramBot::whereIn('slug', ['memo', 'memo-bot', 'internal-memorandum', 'internal-memorandum-bot'])->first();
                        if ($mBot) $mBot->update(['webhook_url' => $memoWebhookUrl]);
                    } elseif ($botType === 'memo') {
                        return redirect()->back()->withErrors(['webhook_url' => "Memorandum Bot: " . ($json['description'] ?? 'Failed to set webhook.')]);
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Memo bot setWebhook error: " . $e->getMessage());
                }
            } elseif ($botType === 'memo') {
                return redirect()->back()->withErrors(['webhook_url' => "Internal Memorandum Bot token is not configured."]);
            }
        }

        // 4. Register Pre-Order Bot Webhook
        if (in_array($botType, ['all', 'pre_order', 'pre-order'], true)) {
            $pToken = $botService->getPreOrderBotToken();
            if (!empty($pToken)) {
                try {
                    $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$pToken}/setWebhook", [
                        'url' => $preOrderWebhookUrl
                    ]);
                    $json = $resp->json();
                    if ($json['ok'] ?? false) {
                        $messages[] = "Pre-Order bot webhook set to: {$preOrderWebhookUrl}";
                        $pBot = TelegramBot::whereIn('slug', ['pre_order', 'pre-order', 'pre-order-bot'])->first();
                        if ($pBot) $pBot->update(['webhook_url' => $preOrderWebhookUrl]);
                    } elseif (in_array($botType, ['pre_order', 'pre-order'], true)) {
                        return redirect()->back()->withErrors(['webhook_url' => "Pre-Order Bot: " . ($json['description'] ?? 'Failed to set webhook.')]);
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Pre-order bot setWebhook error: " . $e->getMessage());
                }
            } elseif (in_array($botType, ['pre_order', 'pre-order'], true)) {
                return redirect()->back()->withErrors(['webhook_url' => "Pre-Order Bot token is not configured."]);
            }
        }

        // 5. Register Training Bot Webhook
        if (in_array($botType, ['all', 'training'], true)) {
            $tToken = $botService->getTrainingBotToken();
            $trainingWebhookUrl = "{$cleanBaseUrl}/api/telegram/training-webhook";
            if (!empty($tToken)) {
                try {
                    $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$tToken}/setWebhook", [
                        'url' => $trainingWebhookUrl
                    ]);
                    $json = $resp->json();
                    if ($json['ok'] ?? false) {
                        $messages[] = "Training bot webhook set to: {$trainingWebhookUrl}";
                        $tBot = TelegramBot::whereIn('slug', ['training', 'training-bot', 'training-and-lms'])->first();
                        if ($tBot) $tBot->update(['webhook_url' => $trainingWebhookUrl]);
                    } elseif ($botType === 'training') {
                        return redirect()->back()->withErrors(['webhook_url' => "Training Bot: " . ($json['description'] ?? 'Failed to set webhook.')]);
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Training bot setWebhook error: " . $e->getMessage());
                }
            } elseif ($botType === 'training') {
                return redirect()->back()->withErrors(['webhook_url' => "Training Bot token is not configured."]);
            }
        }

        // 6. Register custom dynamic bots in telegram_bots table
        if ($botType === 'all') {
            $dynamicBots = TelegramBot::where('is_active', true)->get();
            foreach ($dynamicBots as $dBot) {
                if (in_array($dBot->slug, ['helpdesk', 'helpdesk-bot', 'budget', 'budget-bot', 'memo', 'memo-bot', 'pre_order', 'pre-order', 'pre-order-bot', 'training', 'training-bot'], true)) continue;
                if (!empty($dBot->bot_token)) {
                    $dWebhookUrl = "{$cleanBaseUrl}/api/telegram/webhook/{$dBot->slug}";
                    try {
                        \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$dBot->bot_token}/setWebhook", [
                            'url' => $dWebhookUrl
                        ]);
                        $dBot->update(['webhook_url' => $dWebhookUrl]);
                        $messages[] = "Custom bot '{$dBot->name}' webhook set to: {$dWebhookUrl}";
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::error("Dynamic bot setWebhook error ({$dBot->slug}): " . $e->getMessage());
                    }
                }
            }
        }

        $summary = count($messages) > 0 ? implode(" | ", $messages) : "Webhooks updated successfully.";
        return redirect()->back()->with('success', $summary);
    }

    public function removeWebhook(Request $request, TelegramBotService $botService): RedirectResponse
    {
        $this->authorizeManager();

        $botType = $request->input('bot_type', 'all');

        if ($botType !== 'all') {
            $targetBot = TelegramBot::where('slug', $botType)->first();
            if ($targetBot) {
                return $this->removeBotWebhook($targetBot);
            }
        }

        $settings = TelegramSettings::getInstance();

        $budgetToken = $botService->getBudgetBotToken();
        $memoToken = $botService->getMemoBotToken();
        $preOrderToken = $botService->getPreOrderBotToken();
        $trainingToken = $botService->getTrainingBotToken();

        $messages = [];

        if (in_array($botType, ['all', 'helpdesk'], true)) {
            $result = $botService->deleteWebhook();
            if ($result['ok'] ?? false) {
                $settings->update(['webhook_url' => null]);
                $messages[] = "Helpdesk bot webhook removed.";
            }
        }

        if (in_array($botType, ['all', 'budget'], true) && !empty($budgetToken)) {
            try {
                \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$budgetToken}/deleteWebhook");
                $messages[] = "Budget bot webhook removed.";
                $bBot = TelegramBot::whereIn('slug', ['budget', 'budget-bot', 'budget-system-bot'])->first();
                if ($bBot) $bBot->update(['webhook_url' => null]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Budget bot deleteWebhook error: " . $e->getMessage());
            }
        }

        if (in_array($botType, ['all', 'memo'], true) && !empty($memoToken)) {
            try {
                \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$memoToken}/deleteWebhook");
                $messages[] = "Memorandum bot webhook removed.";
                $mBot = TelegramBot::whereIn('slug', ['memo', 'memo-bot', 'internal-memorandum', 'internal-memorandum-bot'])->first();
                if ($mBot) $mBot->update(['webhook_url' => null]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Memo bot deleteWebhook error: " . $e->getMessage());
            }
        }

        if (in_array($botType, ['all', 'pre_order', 'pre-order'], true) && !empty($preOrderToken)) {
            try {
                \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$preOrderToken}/deleteWebhook");
                $messages[] = "Pre-Order bot webhook removed.";
                $pBot = TelegramBot::whereIn('slug', ['pre_order', 'pre-order', 'pre-order-bot'])->first();
                if ($pBot) $pBot->update(['webhook_url' => null]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Pre-order bot deleteWebhook error: " . $e->getMessage());
            }
        }

        if (in_array($botType, ['all', 'training'], true) && !empty($trainingToken)) {
            try {
                \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$trainingToken}/deleteWebhook");
                $messages[] = "Training bot webhook removed.";
                $tBot = TelegramBot::whereIn('slug', ['training', 'training-bot', 'training-and-lms'])->first();
                if ($tBot) $tBot->update(['webhook_url' => null]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Training bot deleteWebhook error: " . $e->getMessage());
            }
        }

        if ($botType === 'all') {
            $dynamicBots = TelegramBot::all();
            foreach ($dynamicBots as $dBot) {
                if (!empty($dBot->bot_token) && !in_array($dBot->slug, ['helpdesk', 'helpdesk-bot', 'budget', 'budget-bot', 'memo', 'memo-bot', 'pre_order', 'pre-order', 'pre-order-bot', 'training', 'training-bot'], true)) {
                    try {
                        \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$dBot->bot_token}/deleteWebhook");
                        $dBot->update(['webhook_url' => null]);
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::error("Dynamic bot deleteWebhook error ({$dBot->slug}): " . $e->getMessage());
                    }
                }
            }
        }

        $summary = count($messages) > 0 ? implode(" | ", $messages) : "Webhooks removed successfully.";
        return redirect()->back()->with('success', $summary);
    }

    public function storeBot(Request $request): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'bot_token' => ['required', 'string', 'max:255'],
            'bot_username' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
        ]);

        $slug = \Illuminate\Support\Str::slug($validated['name']);
        if (TelegramBot::where('slug', $slug)->exists()) {
            $slug .= '-' . time();
        }

        $newBot = TelegramBot::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'bot_token' => $validated['bot_token'],
            'bot_username' => $validated['bot_username'],
            'description' => $validated['description'],
            'is_active' => $validated['is_active'],
            'created_by' => auth()->id(),
        ]);

        if (in_array($slug, ['training', 'training-bot']) || str_contains(strtolower($validated['name']), 'training')) {
            TelegramSettings::getInstance()->update([
                'training_bot_token' => $validated['bot_token'],
                'training_bot_username' => $validated['bot_username'],
            ]);
        }

        return redirect()->back()->with('success', "Bot credential '{$validated['name']}' created successfully.");
    }

    public function updateBot(Request $request, TelegramBot $bot): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'bot_token' => ['nullable', 'string', 'max:255'],
            'bot_username' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
        ]);

        $bot->update([
            'name' => $validated['name'],
            'bot_token' => $validated['bot_token'] ?? $bot->bot_token,
            'bot_username' => $validated['bot_username'],
            'description' => $validated['description'],
            'is_active' => $validated['is_active'],
        ]);

        // Sync with telegram_settings singleton
        $settings = TelegramSettings::getInstance();
        if ($bot->slug === 'helpdesk') {
            $settings->update([
                'bot_token' => $bot->bot_token,
                'helpdesk_bot_token' => $bot->bot_token,
                'helpdesk_bot_username' => $bot->bot_username,
            ]);
        } elseif ($bot->slug === 'budget') {
            $settings->update([
                'budget_bot_token' => $bot->bot_token,
                'budget_bot_username' => $bot->bot_username,
            ]);
        } elseif ($bot->slug === 'memo') {
            $settings->update([
                'memo_bot_token' => $bot->bot_token,
                'memo_bot_username' => $bot->bot_username,
            ]);
        } elseif (in_array($bot->slug, ['pre_order', 'pre-order', 'pre-order-bot'])) {
            $settings->update([
                'pre_order_bot_token' => $bot->bot_token,
                'pre_order_bot_username' => $bot->bot_username,
            ]);
        } elseif (in_array($bot->slug, ['training', 'training-bot']) || str_contains(strtolower($bot->name), 'training')) {
            $settings->update([
                'training_bot_token' => $bot->bot_token,
                'training_bot_username' => $bot->bot_username,
            ]);
        }

        // Auto re-register webhook with Telegram if token was updated & webhook_url exists
        if (!empty($bot->bot_token) && !empty($bot->webhook_url)) {
            try {
                \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$bot->bot_token}/setWebhook", [
                    'url' => $bot->webhook_url,
                ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Auto setWebhook on updateBot failed for {$bot->name}: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', "Bot credential '{$bot->name}' updated and synced successfully.");
    }

    public function destroyBot(TelegramBot $bot): RedirectResponse
    {
        $this->authorizeManager();

        $botName = $bot->name;
        $bot->delete();

        return redirect()->back()->with('success', "Bot credential '{$botName}' removed successfully.");
    }

    public function sendTestMessage(Request $request, TelegramBotService $botService): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'target_type' => ['required', 'string', 'in:user,branch,custom'],
            'target_id' => ['required_if:target_type,user,branch', 'nullable', 'string'],
            'custom_chat_id' => ['required_if:target_type,custom', 'nullable', 'string'],
            'message' => ['required', 'string', 'max:1000'],
            'bot_slug' => ['nullable', 'string'],
        ]);

        $chatId = null;

        if ($validated['target_type'] === 'user') {
            $user = User::find($validated['target_id']);
            $chatId = $user?->telegram_chat_id;
        } elseif ($validated['target_type'] === 'branch') {
            $branch = Branch::find($validated['target_id']);
            $chatId = $branch?->telegram_chat_id;
        } else {
            $chatId = $validated['custom_chat_id'];
        }

        if (empty($chatId)) {
            return redirect()->back()->withErrors(['test_message' => 'Selected target does not have a linked Telegram Chat ID.']);
        }

        $botSlug = $validated['bot_slug'] ?? 'helpdesk';
        $botName = ucfirst(str_replace(['-', '_'], ' ', $botSlug));
        $success = $botService->sendBotMessage($botSlug, $chatId, "🧪 <b>TEST MESSAGE ({$botName} Bot)</b>\n\n" . e($validated['message']));

        if ($success) {
            return redirect()->back()->with('success', 'Test message sent successfully!');
        }

        return redirect()->back()->withErrors(['test_message' => 'Failed to send message. Please check Telegram Bot token & chat ID.']);
    }

    public function updateUserChatId(Request $request, User $user): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'telegram_chat_id' => ['nullable', 'string', 'max:100'],
            'telegram_username' => ['nullable', 'string', 'max:100'],
        ]);

        $user->update([
            'telegram_chat_id' => $validated['telegram_chat_id'] ?: null,
            'telegram_username' => $validated['telegram_username'] ? ltrim($validated['telegram_username'], '@') : null,
        ]);

        return redirect()->back()->with('success', "Telegram link for user '{$user->name}' updated.");
    }

    public function updateBranchChatId(Request $request, Branch $branch): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'telegram_chat_id' => ['nullable', 'string', 'max:100'],
        ]);

        $branch->update([
            'telegram_chat_id' => $validated['telegram_chat_id'] ?: null,
        ]);

        return redirect()->back()->with('success', "Telegram chat ID for branch '{$branch->name}' updated.");
    }

    public function broadcastAnnouncement(Request $request, TelegramBotService $botService): RedirectResponse
    {
        $user = auth()->user();
        $hasManagerPower = $user->hasRole('Ticket Super Admin')
            || !empty($user->managedDepartmentIds())
            || $user->can('view telegram config')
            || $user->can('ticket.view.department')
            || $user->can('ticket.view.all');

        if (!$hasManagerPower) {
            abort(403, 'Only managers and administrators can send broadcast announcements.');
        }

        $rawTarget = $request->input('target_audience') ?: $request->input('target', 'everything');
        $targetAudience = match ($rawTarget) {
            'all', 'everything' => 'everything',
            'branches', 'all_branches' => 'all_branches',
            'users', 'all_users' => 'all_users',
            'department', 'department_users' => 'department_users',
            'specific_branch' => 'specific_branch',
            default => 'everything',
        };

        $request->merge(['target_audience' => $targetAudience]);

        $validated = $request->validate([
            'target_audience' => ['required', 'string', 'in:all_users,all_branches,department_users,specific_branch,everything'],
            'department_id' => ['nullable'],
            'branch_id' => ['nullable'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $botService->sendBroadcastAnnouncement(
            $user,
            $validated['target_audience'],
            $validated['title'],
            $validated['message'],
            !empty($validated['department_id']) ? (int) $validated['department_id'] : null,
            !empty($validated['branch_id']) ? (int) $validated['branch_id'] : null
        );

        return redirect()->back()->with('success', 'Broadcast announcement queued and dispatched successfully.');
    }

    public function setBotWebhook(Request $request, TelegramBot $bot): RedirectResponse
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'webhook_url' => ['required', 'url', 'max:500'],
        ]);

        if (empty($bot->bot_token)) {
            return redirect()->back()->withErrors(['bot_token' => 'Bot token is missing for this credential.']);
        }

        $rawInputUrl = rtrim($validated['webhook_url'], '/');
        $cleanBaseUrl = preg_replace('#/api/telegram(/.*)?$#i', '', $rawInputUrl);

        if (in_array($bot->slug, ['helpdesk', 'budget', 'memo', 'pre_order', 'pre-order', 'training'])) {
            $slugName = ($bot->slug === 'pre_order' || $bot->slug === 'pre-order') ? 'pre-order' : $bot->slug;
            $targetUrl = "{$cleanBaseUrl}/api/telegram/" . ($bot->slug === 'helpdesk' ? 'helpdesk-webhook' : "{$slugName}-webhook");
        } else {
            $targetUrl = "{$cleanBaseUrl}/api/telegram/webhook/{$bot->slug}";
        }

        try {
            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$bot->bot_token}/setWebhook", [
                'url' => $targetUrl,
            ]);

            $json = $response->json();
            if ($json['ok'] ?? false) {
                $bot->update(['webhook_url' => $targetUrl]);
                return redirect()->back()->with('success', "Webhook for bot '{$bot->name}' set to: {$targetUrl}");
            }

            $desc = $json['description'] ?? 'Failed to set webhook with Telegram.';
            return redirect()->back()->withErrors(['webhook_url' => $desc]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("setBotWebhook failed for {$bot->name}: " . $e->getMessage());
            return redirect()->back()->withErrors(['webhook_url' => 'HTTP request failed: ' . $e->getMessage()]);
        }
    }

    public function removeBotWebhook(TelegramBot $bot): RedirectResponse
    {
        $this->authorizeManager();

        if (empty($bot->bot_token)) {
            return redirect()->back()->withErrors(['bot_token' => 'Bot token is missing for this credential.']);
        }

        try {
            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$bot->bot_token}/deleteWebhook");
            $json = $response->json();
            if ($json['ok'] ?? false) {
                $bot->update(['webhook_url' => null]);
                return redirect()->back()->with('success', "Webhook for bot '{$bot->name}' removed successfully.");
            }

            $desc = $json['description'] ?? 'Failed to remove webhook with Telegram.';
            return redirect()->back()->withErrors(['webhook_url' => $desc]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("removeBotWebhook failed for {$bot->name}: " . $e->getMessage());
            return redirect()->back()->withErrors(['webhook_url' => 'HTTP request failed: ' . $e->getMessage()]);
        }
    }
}
