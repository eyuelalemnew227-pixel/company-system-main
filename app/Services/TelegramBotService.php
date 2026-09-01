<?php

namespace App\Services;

use App\Enums\TicketPriority;
use App\Enums\TicketSeverity;
use App\Enums\TicketStatus;
use App\Models\Branch;
use App\Models\Department;
use App\Models\TelegramBot;
use App\Models\TelegramSettings;
use App\Models\Ticket;
use App\Models\TicketMainCategory;
use App\Models\TicketSubCategory;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TelegramBotService
{
    /**
     * Get bot token dynamically by slug.
     */
    public function getBotTokenBySlug(string $slug): ?string
    {
        $cleanSlug = strtolower(trim($slug));

        // 1. Query telegram_bots table first
        $bot = TelegramBot::where('is_active', true)
            ->where(function ($q) use ($cleanSlug) {
                $q->where('slug', $cleanSlug);
                if (in_array($cleanSlug, ['helpdesk', 'helpdesk-bot', 'ticket', 'ticketing'], true)) {
                    $q->orWhereIn('slug', ['helpdesk', 'helpdesk-bot']);
                } elseif (in_array($cleanSlug, ['budget', 'budget-bot', 'budget-system-bot'], true)) {
                    $q->orWhereIn('slug', ['budget', 'budget-bot', 'budget-system-bot']);
                } elseif (in_array($cleanSlug, ['memo', 'memo-bot', 'internal-memorandum', 'internal-memorandum-bot'], true)) {
                    $q->orWhereIn('slug', ['memo', 'memo-bot', 'internal-memorandum', 'internal-memorandum-bot']);
                } elseif (in_array($cleanSlug, ['pre_order', 'pre-order', 'pre-order-bot'], true)) {
                    $q->orWhereIn('slug', ['pre_order', 'pre-order', 'pre-order-bot']);
                } elseif (in_array($cleanSlug, ['training', 'training-bot', 'training-and-lms', 'lms'], true)) {
                    $q->orWhereIn('slug', ['training', 'training-bot', 'training-and-lms']);
                }
            })
            ->whereNotNull('bot_token')
            ->where('bot_token', '!=', '')
            ->first();

        if ($bot && !empty($bot->bot_token)) {
            return $bot->bot_token;
        }

        // 2. Query TelegramSettings table for standard bot slug columns
        $settings = TelegramSettings::getInstance();
        if (in_array($cleanSlug, ['helpdesk', 'helpdesk-bot', 'ticket', 'ticketing'], true)) {
            return $settings->helpdesk_bot_token ?: ($settings->bot_token ?: null);
        }
        if (in_array($cleanSlug, ['budget', 'budget-bot', 'budget-system-bot'], true)) {
            return $settings->budget_bot_token ?: null;
        }
        if (in_array($cleanSlug, ['memo', 'memo-bot', 'internal-memorandum', 'internal-memorandum-bot'], true)) {
            return $settings->memo_bot_token ?: null;
        }
        if (in_array($cleanSlug, ['pre_order', 'pre-order', 'pre-order-bot'], true)) {
            return $settings->pre_order_bot_token ?: null;
        }
        if (in_array($cleanSlug, ['training', 'training-bot', 'training-and-lms', 'lms'], true)) {
            return $settings->training_bot_token ?: null;
        }

        return null;
    }

    public function getHelpdeskBotToken(): ?string
    {
        return $this->getBotTokenBySlug('helpdesk');
    }

    public function getBudgetBotToken(): ?string
    {
        return $this->getBotTokenBySlug('budget');
    }

    public function getMemoBotToken(): ?string
    {
        return $this->getBotTokenBySlug('memo');
    }

    public function getPreOrderBotToken(): ?string
    {
        return $this->getBotTokenBySlug('pre_order');
    }

    public function getTrainingBotToken(): ?string
    {
        return $this->getBotTokenBySlug('training');
    }

    /**
     * Send a Telegram message dynamically using any bot slug.
     */
    public function sendBotMessage(string $slug, string|int $chatId, string $text, ?array $replyMarkup = null): bool
    {
        $settings = TelegramSettings::getInstance();
        if (!$settings->is_active || empty($chatId)) {
            return false;
        }

        $token = $this->getBotTokenBySlug($slug);
        if (empty($token)) {
            Log::warning("sendBotMessage failed: Bot token not configured for slug '{$slug}'");
            return false;
        }

        try {
            $payload = [
                'chat_id' => (string) $chatId,
                'text' => $text,
                'parse_mode' => $settings->parse_mode ?? 'HTML',
                'disable_web_page_preview' => true,
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = is_string($replyMarkup) ? json_decode($replyMarkup, true) : $replyMarkup;
            }

            $res = Http::withoutVerifying()->timeout(3)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
            return $res->successful() && ($res->json()['ok'] ?? false);
        } catch (\Throwable $e) {
            Log::error("sendBotMessage error for slug '{$slug}': " . $e->getMessage());
            return false;
        }
    }

    private function baseUrl(): ?string
    {
        $token = $this->getHelpdeskBotToken();
        if (empty($token)) {
            return null;
        }

        return "https://api.telegram.org/bot{$token}";
    }

    /**
     * Create an HTTP client pending request with disabled SSL verification for local dev / self-signed certificate handling.
     */
    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withoutVerifying()->timeout(3);
    }

    /**
     * Get basic information about the bot (getMe).
     */
    public function getMe(): array
    {
        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return ['ok' => false, 'error' => 'Bot token is not configured.'];
        }

        try {
            $response = $this->http()->get("{$baseUrl}/getMe");
            return $response->json() ?? ['ok' => false, 'error' => 'Invalid response from Telegram.'];
        } catch (\Exception $e) {
            Log::error("Telegram getMe error: {$e->getMessage()}");
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Register Webhook URL with Telegram API.
     */
    public function setWebhook(string $webhookUrl): array
    {
        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return ['ok' => false, 'error' => 'Bot token is not configured.'];
        }

        try {
            $response = $this->http()->post("{$baseUrl}/setWebhook", [
                'url' => $webhookUrl,
            ]);

            $result = $response->json();
            if ($result['ok'] ?? false) {
                $settings = TelegramSettings::getInstance();
                $settings->update(['webhook_url' => $webhookUrl]);
            }

            return $result ?? ['ok' => false, 'error' => 'Invalid response from Telegram.'];
        } catch (\Exception $e) {
            Log::error("Telegram setWebhook error: {$e->getMessage()}");
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Delete existing Webhook registration from Telegram.
     */
    public function deleteWebhook(): array
    {
        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return ['ok' => false, 'error' => 'Bot token is not configured.'];
        }

        try {
            $response = $this->http()->post("{$baseUrl}/deleteWebhook");
            $result = $response->json();

            if ($result['ok'] ?? false) {
                $settings = TelegramSettings::getInstance();
                $settings->update(['webhook_url' => null]);
            }

            return $result ?? ['ok' => false, 'error' => 'Invalid response from Telegram.'];
        } catch (\Exception $e) {
            Log::error("Telegram deleteWebhook error: {$e->getMessage()}");
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get webhook status details from Telegram (getWebhookInfo).
     */
    public function getWebhookInfo(): array
    {
        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return ['ok' => false, 'error' => 'Bot token is not configured.'];
        }

        try {
            $response = $this->http()->get("{$baseUrl}/getWebhookInfo");
            return $response->json() ?? ['ok' => false, 'error' => 'Invalid response from Telegram.'];
        } catch (\Exception $e) {
            Log::error("Telegram getWebhookInfo error: {$e->getMessage()}");
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send a broadcast announcement to selected audience channels & chat IDs.
     */
    public function sendBroadcastAnnouncement(
        User $sender,
        string $targetAudience,
        string $title,
        string $message,
        ?int $departmentId = null,
        ?int $branchId = null
    ): int {
        $senderName = e($sender->name);
        $cleanTitle = e($title);
        $cleanMessage = e($message);
        $dateStr = now()->format('M d, Y g:i A');

        $formattedText = "📢 <b>BROADCAST ANNOUNCEMENT</b>\n\n" .
                         "📌 <b>Title:</b> {$cleanTitle}\n" .
                         "👤 <b>From:</b> {$senderName}\n" .
                         "📅 <b>Date:</b> {$dateStr}\n\n" .
                         "📝 <b>Announcement:</b>\n" .
                         "{$cleanMessage}";

        $chatIds = [];

        if (in_array($targetAudience, ['everything', 'all_branches'], true)) {
            $branchChatIds = Branch::whereNotNull('telegram_chat_id')
                ->where('telegram_chat_id', '!=', '')
                ->pluck('telegram_chat_id')
                ->toArray();
            $chatIds = array_merge($chatIds, $branchChatIds);
        }

        if (in_array($targetAudience, ['everything', 'all_users'], true)) {
            $userChatIds = User::whereNotNull('telegram_chat_id')
                ->where('telegram_chat_id', '!=', '')
                ->pluck('telegram_chat_id')
                ->toArray();
            $chatIds = array_merge($chatIds, $userChatIds);
        }

        if ($targetAudience === 'department_users' && $departmentId) {
            $deptUserChatIds = User::query()
                ->join('employees', 'users.employee_id', '=', 'employees.id')
                ->where('employees.department_id', $departmentId)
                ->whereNotNull('users.telegram_chat_id')
                ->where('users.telegram_chat_id', '!=', '')
                ->pluck('users.telegram_chat_id')
                ->toArray();
            $chatIds = array_merge($chatIds, $deptUserChatIds);
        }

        if ($targetAudience === 'specific_branch' && $branchId) {
            $branch = Branch::find($branchId);
            if ($branch && !empty($branch->telegram_chat_id)) {
                $chatIds[] = $branch->telegram_chat_id;
            }
        }

        $chatIds = array_unique(array_filter($chatIds));
        $sentCount = 0;

        foreach ($chatIds as $cid) {
            if ($this->sendMessage($cid, $formattedText)) {
                $sentCount++;
            }
        }

        return $sentCount;
    }

    /**
     * Send a raw message to a Telegram Chat ID.
     */
    public function sendMessage(string|int $chatId, string $text, ?array $replyMarkup = null): bool
    {
        $settings = TelegramSettings::getInstance();
        if (!$settings->is_active || empty($settings->bot_token) || empty($chatId)) {
            return false;
        }

        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return false;
        }

        try {
            $payload = [
                'chat_id' => (string) $chatId,
                'text' => $text,
                'parse_mode' => $settings->parse_mode ?? 'HTML',
                'disable_web_page_preview' => true,
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = is_string($replyMarkup) ? json_decode($replyMarkup, true) : $replyMarkup;
            }

            $response = $this->http()->asJson()->post("{$baseUrl}/sendMessage", $payload);

            if (!$response->successful()) {
                Log::warning("Telegram sendMessage failed for chat_id {$chatId}: " . $response->body());
                return false;
            }

            return true;
        } catch (\Exception $e) {
            Log::error("Telegram sendMessage exception: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Send notification to a Branch model if it has a valid telegram_chat_id.
     */
    public function sendToBranch(Branch $branch, string $text, ?array $replyMarkup = null): bool
    {
        if (empty($branch->telegram_chat_id)) {
            return false;
        }

        return $this->sendMessage($branch->telegram_chat_id, $text, $replyMarkup);
    }

    /**
     * Send notification to a User model if they have a valid telegram_chat_id.
     */
    public function sendToUser(User $user, string $text, ?array $replyMarkup = null): bool
    {
        if (empty($user->telegram_chat_id)) {
            return false;
        }

        return $this->sendMessage($user->telegram_chat_id, $text, $replyMarkup);
    }

    public function sendToUsers(array $userOrIds, string $text, ?array $replyMarkup = null): void
    {
        $sentChatIds = [];
        foreach ($userOrIds as $item) {
            $user = is_numeric($item) ? User::find($item) : $item;
            if ($user instanceof User && !empty($user->telegram_chat_id)) {
                $chatId = (string) $user->telegram_chat_id;
                if (!in_array($chatId, $sentChatIds, true)) {
                    $this->sendToUser($user, $text, $replyMarkup);
                    $sentChatIds[] = $chatId;
                }
            }
        }
    }

    /**
     * Edit text of an existing message.
     */
    public function editMessageText(string|int $chatId, int $messageId, string $text, ?array $replyMarkup = null): bool
    {
        $settings = TelegramSettings::getInstance();
        if (!$settings->is_active || empty($settings->bot_token) || empty($chatId)) {
            return false;
        }

        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return false;
        }

        try {
            $payload = [
                'chat_id' => (string) $chatId,
                'message_id' => $messageId,
                'text' => $text,
                'parse_mode' => $settings->parse_mode ?? 'HTML',
                'disable_web_page_preview' => true,
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = is_string($replyMarkup) ? json_decode($replyMarkup, true) : $replyMarkup;
            }

            $response = $this->http()->asJson()->post("{$baseUrl}/editMessageText", $payload);
            return $response->successful();
        } catch (\Exception $e) {
            Log::error("Telegram editMessageText exception: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Answer callback query to dismiss telegram button loading spinner.
     */
    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null): void
    {
        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return;
        }

        try {
            $payload = ['callback_query_id' => $callbackQueryId];
            if ($text) {
                $payload['text'] = $text;
            }
            $this->http()->asJson()->post("{$baseUrl}/answerCallbackQuery", $payload);
        } catch (\Exception $e) {
            Log::error("Telegram answerCallbackQuery exception: {$e->getMessage()}");
        }
    }

    /**
     * Download a file from Telegram (e.g. photo attachment).
     */
    public function downloadTelegramFile(string $fileId): ?string
    {
        $baseUrl = $this->baseUrl();
        if (!$baseUrl) {
            return null;
        }

        try {
            $response = $this->http()->get("{$baseUrl}/getFile", ['file_id' => $fileId]);
            $result = $response->json();
            if (!($result['ok'] ?? false) || empty($result['result']['file_path'])) {
                return null;
            }

            $filePath = $result['result']['file_path'];
            $settings = TelegramSettings::getInstance();
            $fileUrl = "https://api.telegram.org/file/bot{$settings->bot_token}/{$filePath}";

            $fileContents = Http::withoutVerifying()->timeout(30)->get($fileUrl)->body();
            if (empty($fileContents)) {
                return null;
            }

            $ext = pathinfo($filePath, PATHINFO_EXTENSION) ?: 'jpg';
            $filename = 'tickets/images/tg_' . uniqid() . '.' . $ext;
            Storage::disk('public')->put($filename, $fileContents);

            return $filename;
        } catch (\Exception $e) {
            Log::error("Telegram downloadTelegramFile exception: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Resolve User model from telegram_chat_id or linked branch.
     */
    public function resolveUserFromChatId(string|int $chatId): ?User
    {
        $chatIdStr = (string) $chatId;
        $user = User::where('telegram_chat_id', $chatIdStr)->first();
        if ($user) {
            return $user;
        }

        $branch = Branch::where('telegram_chat_id', $chatIdStr)->first();
        if ($branch) {
            $branchUser = User::whereHas('employee', fn($q) => $q->where('branch_id', $branch->id))->first();
            if ($branchUser) {
                return $branchUser;
            }
        }

        return null;
    }

    /**
     * Process incoming Telegram webhook updates.
     */
    public function handleWebhookUpdate(array $update): void
    {
        if (isset($update['callback_query'])) {
            $this->handleCallbackQuery($update['callback_query']);
            return;
        }

        if (!isset($update['message'])) {
            return;
        }

        $message = $update['message'];
        $chatId = $message['chat']['id'] ?? null;
        $text = trim($message['text'] ?? ($message['caption'] ?? ''));
        $username = $message['from']['username'] ?? null;
        $photo = $message['photo'] ?? null;

        if (!$chatId) {
            return;
        }

        if (str_starts_with($text, '/help') || $text === 'help') {
            Cache::forget("tg_wizard_{$chatId}");
            Cache::forget("tg_status_reason_{$chatId}");
            Cache::forget("tg_comment_{$chatId}");
            $this->showHelpGuide($chatId);
            return;
        }

        if (str_starts_with($text, '/start') || str_starts_with($text, '/chatid') || str_starts_with($text, '/link')) {
            Cache::forget("tg_wizard_{$chatId}");
            Cache::forget("tg_status_reason_{$chatId}");
            Cache::forget("tg_comment_{$chatId}");
            $this->handleStartCommand($chatId, $text, $username);
            return;
        }

        if (str_starts_with($text, '/search') || str_starts_with($text, '/find')) {
            Cache::forget("tg_wizard_{$chatId}");
            Cache::forget("tg_status_reason_{$chatId}");
            Cache::forget("tg_comment_{$chatId}");
            $queryStr = trim(str_replace(['/search', '/find'], '', $text));
            $this->handleSearchCommand($chatId, $queryStr);
            return;
        }

        if (str_starts_with($text, '/ticket') || str_starts_with($text, '/newticket')) {
            Cache::forget("tg_wizard_{$chatId}");
            Cache::forget("tg_status_reason_{$chatId}");
            Cache::forget("tg_comment_{$chatId}");
            $this->startTicketWizard($chatId);
            return;
        }

        if (str_starts_with($text, '/cancel')) {
            Cache::forget("tg_wizard_{$chatId}");
            Cache::forget("tg_status_reason_{$chatId}");
            Cache::forget("tg_comment_{$chatId}");
            $this->sendMessage($chatId, "❌ Action cancelled.");
            return;
        }

        if (str_starts_with($text, '/mytickets') || str_starts_with($text, '/status')) {
            Cache::forget("tg_wizard_{$chatId}");
            Cache::forget("tg_status_reason_{$chatId}");
            Cache::forget("tg_comment_{$chatId}");
            $this->showMyTickets($chatId, 'all');
            return;
        }

        if (str_starts_with($text, '/broadcast')) {
            $this->handleBroadcastCommand($chatId, $text);
            return;
        }

        if (str_starts_with($text, '/weeklyreport') || str_starts_with($text, '/monthlyreport') || str_starts_with($text, '/report')) {
            $user = User::where('telegram_chat_id', (string) $chatId)->first();
            if (!$user) {
                $this->sendMessage($chatId, "⚠️ Your Telegram account is not linked yet. Use /start <user_id> or set your Telegram Chat ID in your profile.");
                return;
            }

            $period = str_contains($text, 'monthly') ? 'monthly' : 'weekly';
            $reportService = app(\App\Services\TelegramReportNotificationService::class);
            $sent = $reportService->sendReportToManager($user, $period);

            if (!$sent) {
                $this->sendMessage($chatId, "ℹ️ No managed department reports found for your account.");
            }
            return;
        }

        // Handle non-command messages/photos within comment or reason states
        $commentState = Cache::get("tg_comment_{$chatId}");
        if ($commentState && !empty($text)) {
            $this->processCommentInput($chatId, (int) $commentState, $text);
            return;
        }

        $reasonState = Cache::get("tg_status_reason_{$chatId}");
        if ($reasonState && !empty($text)) {
            $this->processStatusReasonInput($chatId, $reasonState, $text);
            return;
        }

        $wizardState = Cache::get("tg_wizard_{$chatId}");
        if ($wizardState) {
            $this->handleWizardStep($chatId, $wizardState, $text, $photo, $message);
            return;
        }

        // Fallback for unhandled messages/photos: instruct user to use /ticket or /help commands
        $this->sendMessage($chatId, "🤖 <b>Company System Bot</b>\n\nTo submit a new support ticket, please type <b>/ticket</b>.\n\nAvailable commands:\n• <b>/ticket</b> — Create a new support ticket\n• <b>/mytickets</b> — View & update status of active cases\n• <b>/search &lt;query&gt;</b> — Search tickets by ID or keyword\n• <b>/help</b> — View command manual & workflow guide");
    }

    public function getPublicBaseUrl(): string
    {
        try {
            $settings = TelegramSettings::getInstance();
            if (!empty($settings->webhook_url)) {
                $parsed = parse_url($settings->webhook_url);
                if (!empty($parsed['scheme']) && !empty($parsed['host']) && $parsed['scheme'] === 'https') {
                    $port = !empty($parsed['port']) ? ":{$parsed['port']}" : '';
                    return "https://{$parsed['host']}{$port}";
                }
            }
        } catch (\Throwable $e) {}

        $url = config('app.url', 'http://localhost:8000');
        if (str_starts_with($url, 'http://')) {
            $url = 'https://' . substr($url, 7);
        }
        return rtrim($url, '/');
    }

    public function handleTrainingWebhookUpdate(array $update): void
    {
        $token = $this->getTrainingBotToken();
        if (empty($token)) {
            Log::warning("Training webhook update received, but Training Bot token is not configured.");
            return;
        }

        $baseUrl = $this->getPublicBaseUrl();

        // Handle Telegram Callback Query for Feedback
        if (isset($update['callback_query'])) {
            $cb = $update['callback_query'];
            $queryId = $cb['id'] ?? '';
            $chatId = (string) ($cb['message']['chat']['id'] ?? '');
            $data = $cb['data'] ?? '';

            if (str_starts_with($data, 'tf_rate_')) {
                $rating = (int) str_replace('tf_rate_', '', $data);
                $user = User::where('telegram_chat_id', $chatId)->first();
                $bId = $user?->employee?->branch_id;
                $uName = $user ? $user->name : "Branch Manager ({$chatId})";

                \App\Models\Training\TrainingFeedbackResponse::create([
                    'user_id' => $user?->id,
                    'branch_id' => $bId,
                    'trainee_name' => $uName,
                    'q1_relevance' => $rating,
                    'q2_objective_clarity' => 'Yes',
                    'q3_response_quality' => $rating,
                    'q4_participatory' => $rating,
                    'q5_motivating' => $rating,
                    'q6_gained_new_knowledge' => 'Yes',
                    'q9_one_word_summary' => 'Telegram Bot',
                    'q11_additional_comments' => "Feedback rating {$rating}/5 submitted directly via Telegram Bot.",
                ]);

                \Illuminate\Support\Facades\Http::withoutVerifying()->post("https://api.telegram.org/bot{$token}/answerCallbackQuery", [
                    'callback_query_id' => $queryId,
                    'text' => '✅ Thank you! Your feedback was recorded.',
                ]);

                \Illuminate\Support\Facades\Http::withoutVerifying()->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => "✅ <b>FEEDBACK RECEIVED!</b>\n\nThank you <b>{$uName}</b>. Your <b>{$rating}/5 Star</b> training rating has been successfully saved.\n\n🌐 Complete full 11 Amharic Questionnaires:\n{$baseUrl}/training/feedback/create",
                    'parse_mode' => 'HTML',
                ]);
                return;
            }
        }

        if (!isset($update['message'])) {
            return;
        }

        $message = $update['message'];
        $chatId = (string) ($message['chat']['id'] ?? '');
        $text = trim($message['text'] ?? '');
        $username = $message['from']['username'] ?? null;

        if (!$chatId) {
            return;
        }

        if ($username) {
            $user = User::where('telegram_username', ltrim($username, '@'))->first();
            if ($user && empty($user->telegram_chat_id)) {
                $user->update(['telegram_chat_id' => $chatId]);
            }
        }

        $user = User::where('telegram_chat_id', $chatId)->first();
        $userBranch = $user?->employee?->branch?->name ?? 'Branch Manager';
        $isBranchUser = !empty($user?->employee?->branch_id)
            || str_contains(strtolower($user?->employee?->position ?? ''), 'manager')
            || str_contains(strtolower($user?->employee?->position ?? ''), 'bm')
            || str_contains(strtolower($userBranch), 'branch');

        // Only for Branch Managers / Branch Users: Redirect to Telegram Mini App
        if ($isBranchUser) {
            $uName = $user ? $user->name : 'Branch Manager';

            // Configure Telegram Chat Menu Button to open Mini App
            if (str_starts_with($baseUrl, 'https://')) {
                try {
                    \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(5)->post("https://api.telegram.org/bot{$token}/setChatMenuButton", [
                        'chat_id' => (string) $chatId,
                        'menu_button' => [
                            'type' => 'web_app',
                            'text' => '📝 Submit Feedback',
                            'web_app' => ['url' => "{$baseUrl}/training/feedback/create"]
                        ]
                    ]);
                } catch (\Throwable $e) {}
            }

            $msg = "🏢 <b>KALDI'S BRANCH TRAINING FEEDBACK (የቅርንጫፍ ስልጠና አስተያየት መስጫ)</b>\n\n";
            $msg .= "Welcome <b>{$uName}</b> ({$userBranch})!\n\n";
            $msg .= "Please tap the button below to open and submit your <b>Training Feedback Questionnaire</b> directly inside Telegram Mini App:";

            $inlineKeyboard = [];
            if (str_starts_with($baseUrl, 'https://')) {
                $inlineKeyboard[] = [
                    ['text' => '📝 Open Feedback Form (Telegram Mini App)', 'web_app' => ['url' => "{$baseUrl}/training/feedback/create"]]
                ];
            } else {
                $inlineKeyboard[] = [
                    ['text' => '⭐⭐⭐⭐⭐ Quick 5-Star Rating', 'callback_data' => 'tf_rate_5']
                ];
            }

            \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => (string) $chatId,
                'text' => $msg,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode(['inline_keyboard' => $inlineKeyboard]),
            ]);
            return;
        }

        if (str_starts_with($text, '/feedback') || str_contains($text, 'feedback') || str_contains($text, 'Feedback')) {
            $msg = "📝 <b>SUBMIT TRAINING FEEDBACK (የስልጠና አስተያየት መስጫ)</b>\n\n";
            $msg .= "Hello <b>{$userBranch}</b>!\n\nHow would you rate the overall quality & usefulness of your recent training session?\n\nSelect rating below:";

            $inlineKeyboard = [
                [
                    ['text' => '⭐⭐⭐⭐⭐ 5 - Excellent (ድንቅ)', 'callback_data' => 'tf_rate_5'],
                ],
                [
                    ['text' => '⭐⭐⭐⭐ 4 - Very Good (በጣም ጥሩ)', 'callback_data' => 'tf_rate_4'],
                ],
                [
                    ['text' => '⭐⭐⭐ 3 - Good (ጥሩ)', 'callback_data' => 'tf_rate_3'],
                ],
            ];

            if (str_starts_with($baseUrl, 'https://')) {
                $inlineKeyboard[] = [
                    ['text' => '🌐 Open Full 11 Amharic Form on Web', 'url' => "{$baseUrl}/training/feedback/create"]
                ];
            }

            \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => (string) $chatId,
                'text' => $msg,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode(['inline_keyboard' => $inlineKeyboard]),
            ]);
            return;
        }

        $msg = "🎓 <b>KALDIS COFFEE TRAINING & LMS BOT</b>\n\n";
        $msg .= "Welcome! Your Chat ID: <code>{$chatId}</code>\n\n";
        $msg .= "Commands & Actions:\n";
        $msg .= "• 📝 /feedback - <b>Submit Training Feedback</b>\n";
        $msg .= "• 📋 <b>View Department Agendas & Schedules</b>\n\n";
        $msg .= "<i>Use the button below or type /feedback anytime to evaluate training sessions!</i>";

        $inlineKeyboard = [
            [
                ['text' => '📝 Submit Training Feedback', 'callback_data' => 'tf_rate_5'],
            ]
        ];

        if (str_starts_with($baseUrl, 'https://')) {
            $inlineKeyboard[] = [
                ['text' => '🌐 Open Feedback Form on Web App', 'url' => "{$baseUrl}/training/feedback/create"]
            ];
        }

        \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => (string) $chatId,
            'text' => $msg,
            'parse_mode' => 'HTML',
            'reply_markup' => json_encode(['inline_keyboard' => $inlineKeyboard]),
            'disable_web_page_preview' => true,
        ]);
    }

    public function startTicketWizard(string|int $chatId): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        if (!$user) {
            $this->sendMessage($chatId, "⚠️ <b>Account Not Linked</b>\n\nYour Telegram account or Branch is not linked yet. Please link your account or ask your Administrator to set your Chat ID in Telegram Config.");
            return;
        }

        $departments = Department::where('is_active_on_ticketing', true)
            ->orderBy('name')
            ->get();

        if ($departments->isEmpty()) {
            $departments = Department::where('is_active', true)->orderBy('name')->take(10)->get();
        }

        $buttons = [];
        foreach ($departments as $dept) {
            $buttons[] = [['text' => "🏢 " . e($dept->name), 'callback_data' => "t_dept_{$dept->id}"]];
        }
        $buttons[] = [['text' => "❌ Cancel", 'callback_data' => "t_cancel"]];

        Cache::put("tg_wizard_{$chatId}", [
            'step' => 'select_language',
            'user_id' => $user->id,
        ], 600);

        $buttons = [
            [
                ['text' => "🇬🇧 English", 'callback_data' => "t_lang_en"],
                ['text' => "🇪🇹 አማርኛ", 'callback_data' => "t_lang_am"],
            ],
            [
                ['text' => "❌ Cancel / ሰርዝ", 'callback_data' => "t_cancel"]
            ]
        ];

        $reply = "🌐 <b>LANGUAGE SELECTION / ቋንቋ ይምረጡ</b>\n\nStep 1/6: Please select your preferred language:\nእባክዎን የሚፈልጉትን ቋንቋ ይምረጡ:";
        $this->sendMessage($chatId, $reply, ['inline_keyboard' => $buttons]);
    }

    public function handleCallbackQuery(array $cb): void
    {
        $queryId = $cb['id'] ?? '';
        $message = $cb['message'] ?? null;
        $chatId = $message['chat']['id'] ?? null;
        $messageId = $message['message_id'] ?? null;
        $data = $cb['data'] ?? '';

        if (!$chatId || !$queryId) {
            return;
        }

        $this->answerCallbackQuery($queryId);

        if (str_starts_with($data, 't_cmd_')) {
            $cmd = str_replace('t_cmd_', '', $data);
            if ($cmd === 'ticket') {
                $this->startTicketWizard($chatId);
            } elseif ($cmd === 'mytickets') {
                $this->showMyTickets($chatId, 'all');
            } elseif ($cmd === 'help') {
                $this->showHelpGuide($chatId);
            }
            return;
        }

        if ($data === 't_cancel') {
            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';
            Cache::forget("tg_wizard_{$chatId}");
            if ($messageId) {
                $cancelText = $lang === 'am' ? "❌ የድጋፍ ጥያቄ መመዝገቢያው ተሰርዟል።" : "❌ Ticket creation request cancelled.";
                $this->editMessageText($chatId, $messageId, $cancelText);
            }
            return;
        }

        if ($data === 't_skip_photo') {
            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';
            if (!empty($state)) {
                if ($messageId) {
                    $loadingText = $lang === 'am' ? "⏳ ጥያቄው በመመዝገብ ላይ ነው..." : "⏳ Submitting ticket...";
                    $this->editMessageText($chatId, $messageId, $loadingText);
                }
                $this->createTicketFromWizard($chatId, $state, null);
            }
            return;
        }

        if (str_starts_with($data, 't_lang_')) {
            $lang = str_replace('t_lang_', '', $data);
            $chatIdStr = (string) $chatId;

            try {
                // Check if Telegram Chat ID is linked to a Branch or if user's branch has multiple users
                $branch = Branch::where('telegram_chat_id', $chatIdStr)->first();
                if (!$branch) {
                    $u = User::where('telegram_chat_id', $chatIdStr)->first();
                    if ($u && $u->employee?->branch_id) {
                        $branch = Branch::find($u->employee->branch_id);
                    }
                }

                if ($branch) {
                    $branchUsersQuery = User::whereHas('employee', fn($q) => $q->where('branch_id', $branch->id));

                    // Filter users in the branch who hold Branch Manager / Manager / Supervisor role or position
                    $branchManagers = (clone $branchUsersQuery)
                        ->where(function ($bq) {
                            $bq->whereHas('roles', fn($rq) => $rq->where('name', 'like', '%Branch Manager%')
                                                              ->orWhere('name', 'like', '%Manager%')
                                                              ->orWhere('name', 'like', '%Supervisor%'))
                              ->orWhereHas('employee.position', fn($pq) => $pq->where('title', 'like', '%Manager%')
                                                                            ->orWhere('title', 'like', '%Supervisor%'));
                        })
                        ->orderBy('name')
                        ->get();

                    $branchUsers = $branchManagers->isNotEmpty() ? $branchManagers : $branchUsersQuery->orderBy('name')->get();

                    if ($branchUsers->count() >= 1) {
                        $userBtns = [];
                        foreach ($branchUsers as $bu) {
                            $userBtns[] = ['text' => "👤 " . e($bu->name), 'callback_data' => "t_req_{$bu->id}"];
                        }
                        $buttons = array_chunk($userBtns, 2);
                        $cancelBtn = $lang === 'am' ? "❌ ሰርዝ" : "❌ Cancel";
                        $buttons[] = [['text' => $cancelBtn, 'callback_data' => "t_cancel"]];

                        $state = Cache::get("tg_wizard_{$chatId}", []);
                        $state['step'] = 'select_requestor';
                        $state['lang'] = $lang;
                        $state['branch_id'] = $branch->id;
                        Cache::put("tg_wizard_{$chatId}", $state, 600);

                        $prompt = $lang === 'am'
                            ? "👤 <b>የቅርንጫፍ ሥራ አስኪያጅ ይምረጡ (" . e($branch->name) . ")</b>\n\nእባክዎን ስምዎን ይምረጡ:"
                            : "👤 <b>SELECT BRANCH MANAGER (" . e($branch->name) . ")</b>\n\nPlease select your name below:";

                        if ($messageId) {
                            $this->editMessageText($chatId, $messageId, $prompt, ['inline_keyboard' => $buttons]);
                        } else {
                            $this->sendMessage($chatId, $prompt, ['inline_keyboard' => $buttons]);
                        }
                        return;
                    }
                }
            } catch (\Throwable $e) {
                Log::error("t_lang_ branch lookup error: " . $e->getMessage());
            }

            $this->promptDepartmentSelection($chatId, $messageId, $lang);
            return;
        }

        if (str_starts_with($data, 't_req_')) {
            $reqUserId = (int) str_replace('t_req_', '', $data);
            $reqUser = User::find($reqUserId);

            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';

            if ($reqUser) {
                $employee = $reqUser->employee;
                $state['requestor_user_id'] = $reqUser->id;
                $state['requestor_full_name'] = $employee ? ($employee->first_name . ' ' . $employee->last_name) : $reqUser->name;
                Cache::put("tg_wizard_{$chatId}", $state, 600);
            }

            $this->promptDepartmentSelection($chatId, $messageId, $lang);
            return;
        }

        if (str_starts_with($data, 't_dept_')) {
            $deptId = (int) str_replace('t_dept_', '', $data);
            $categories = TicketMainCategory::where('department_id', $deptId)->where('is_active', true)->orderBy('name')->get();
            if ($categories->isEmpty()) {
                $categories = TicketMainCategory::where('department_id', $deptId)->orderBy('name')->take(10)->get();
            }

            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';
            $cancelBtn = $lang === 'am' ? "❌ ሰርዝ" : "❌ Cancel";

            $catBtns = [];
            foreach ($categories as $cat) {
                $catBtns[] = ['text' => "📁 " . e($cat->name), 'callback_data' => "t_mcat_{$cat->id}"];
            }
            // 2-column grid layout for categories
            $buttons = array_chunk($catBtns, 2);
            $buttons[] = [['text' => $cancelBtn, 'callback_data' => "t_cancel"]];

            $state['step'] = 'select_main_category';
            $state['dept_id'] = $deptId;
            Cache::put("tg_wizard_{$chatId}", $state, 600);

            $prompt = $lang === 'am'
                ? "🎫 <b>አዲስ የድጋፍ ጥያቄ መመዝገቢያ</b>\n\nደረጃ 3/6: እባክዎን ዋና <b>ምድብ</b> ይምረጡ:"
                : "🎫 <b>CREATE NEW SUPPORT TICKET</b>\n\nStep 3/6: Please select the <b>Main Category</b>:";

            if ($messageId) {
                $this->editMessageText($chatId, $messageId, $prompt, ['inline_keyboard' => $buttons]);
            }
            return;
        }

        if (str_starts_with($data, 't_mcat_')) {
            $mcatId = (int) str_replace('t_mcat_', '', $data);
            $subCategories = TicketSubCategory::where('ticket_main_category_id', $mcatId)->where('is_active', true)->orderBy('name')->get();
            if ($subCategories->isEmpty()) {
                $subCategories = TicketSubCategory::where('ticket_main_category_id', $mcatId)->orderBy('name')->take(10)->get();
            }

            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';
            $cancelBtn = $lang === 'am' ? "❌ ሰርዝ" : "❌ Cancel";

            $subBtns = [];
            foreach ($subCategories as $sub) {
                $subBtns[] = ['text' => "🏷️ " . e($sub->name), 'callback_data' => "t_scat_{$sub->id}"];
            }
            // 2-column grid layout for sub categories
            $buttons = array_chunk($subBtns, 2);
            $buttons[] = [['text' => $cancelBtn, 'callback_data' => "t_cancel"]];

            $state['step'] = 'select_sub_category';
            $state['mcat_id'] = $mcatId;
            Cache::put("tg_wizard_{$chatId}", $state, 600);

            $prompt = $lang === 'am'
                ? "🎫 <b>አዲስ የድጋፍ ጥያቄ መመዝገቢያ</b>\n\nደረጃ 4/6: እባክዎን ንዑስ <b>ምድብ</b> ይምረጡ:"
                : "🎫 <b>CREATE NEW SUPPORT TICKET</b>\n\nStep 4/6: Please select the <b>Sub Category</b>:";

            if ($messageId) {
                $this->editMessageText($chatId, $messageId, $prompt, ['inline_keyboard' => $buttons]);
            }
            return;
        }

        if (str_starts_with($data, 't_scat_')) {
            $scatId = (int) str_replace('t_scat_', '', $data);
            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';

            $buttons = $lang === 'am' ? [
                [['text' => "🟢 ተጽዕኖ የሌለው", 'callback_data' => "t_sev_no-impact"]],
                [['text' => "🟠 መካከለኛ ተጽዕኖ", 'callback_data' => "t_sev_mid-severe"]],
                [['text' => "🔴 ከፍተኛ ተጽዕኖ", 'callback_data' => "t_sev_severe"]],
                [['text' => "❌ ሰርዝ", 'callback_data' => "t_cancel"]],
            ] : [
                [['text' => "🟢 No Impact", 'callback_data' => "t_sev_no-impact"]],
                [['text' => "🟠 Mid-Severe", 'callback_data' => "t_sev_mid-severe"]],
                [['text' => "🔴 Severe", 'callback_data' => "t_sev_severe"]],
                [['text' => "❌ Cancel", 'callback_data' => "t_cancel"]],
            ];

            // Requesters skip Priority prompt; default priority to 'medium'
            $state['step'] = 'select_severity';
            $state['scat_id'] = $scatId;
            $state['priority'] = 'medium';
            Cache::put("tg_wizard_{$chatId}", $state, 600);

            $prompt = $lang === 'am'
                ? "🎫 <b>አዲስ የድጋፍ ጥያቄ መመዝገቢያ</b>\n\nደረጃ 5/6: እባክዎን የችግሩን <b>ተጽዕኖ ደረጃ</b> ይምረጡ:"
                : "🎫 <b>CREATE NEW SUPPORT TICKET</b>\n\nStep 5/6: Please select the <b>Severity</b> level:";

            if ($messageId) {
                $this->editMessageText($chatId, $messageId, $prompt, ['inline_keyboard' => $buttons]);
            }
            return;
        }

        if (str_starts_with($data, 't_sev_')) {
            $severity = str_replace('t_sev_', '', $data);
            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';

            $state['step'] = 'await_description';
            $state['severity'] = $severity;
            Cache::put("tg_wizard_{$chatId}", $state, 600);

            $prompt = $lang === 'am'
                ? "🎫 <b>አዲስ የድጋፍ ጥያቄ መመዝገቢያ</b>\n\nደረጃ 6/6: እባክዎን የችግሩን <b>ዝርዝር መግለጫ</b> ከታች በጽሁፍ ያስገቡ:"
                : "🎫 <b>CREATE NEW SUPPORT TICKET</b>\n\nStep 6/6: Please type a detailed <b>Description</b> of your issue below:";

            if ($messageId) {
                $this->editMessageText($chatId, $messageId, $prompt);
            }
            return;
        }

        if (str_starts_with($data, 't_sev_')) {
            $severity = str_replace('t_sev_', '', $data);
            $state = Cache::get("tg_wizard_{$chatId}", []);
            $lang = $state['lang'] ?? 'en';

            $state['step'] = 'await_description';
            $state['severity'] = $severity;
            Cache::put("tg_wizard_{$chatId}", $state, 600);

            $prompt = $lang === 'am'
                ? "🎫 <b>አዲስ የድጋፍ ጥያቄ መመዝገቢያ</b>\n\nደረጃ 6/6: እባክዎን የችግሩን <b>ዝርዝር መግለጫ</b> ከታች በጽሁፍ ያስገቡ:"
                : "🎫 <b>CREATE NEW SUPPORT TICKET</b>\n\nStep 6/6: Please type a detailed <b>Description</b> of your issue below:";

            if ($messageId) {
                $this->editMessageText($chatId, $messageId, $prompt);
            }
            return;
        }

        if (str_starts_with($data, 't_asgn_list_')) {
            $ticketId = (int) str_replace('t_asgn_list_', '', $data);
            $ticket = Ticket::find($ticketId);
            $user = $this->resolveUserFromChatId($chatId);
            if (!$ticket || !$user) {
                return;
            }

            if (!$this->canUserAssignTicket($user, $ticket)) {
                $this->sendMessage($chatId, "⚠️ You do not have permission to assign technicians to Ticket #{$ticketId}.");
                return;
            }

            $techs = User::select('users.id', 'users.name', 'users.email')
                ->leftJoin('employees', 'users.employee_id', '=', 'employees.id')
                ->where(function ($q) use ($ticket) {
                    $q->where('employees.department_id', $ticket->department_id)
                        ->orWhereHas('roles', fn($rq) => $rq->whereIn('name', ['Ticket Technician', 'Technician', 'Staff']));
                })
                ->orderBy('users.name')
                ->take(10)
                ->get();

            if ($techs->isEmpty()) {
                $techs = User::orderBy('name')->take(10)->get();
            }

            $techBtns = [];
            foreach ($techs as $tech) {
                $techBtns[] = ['text' => "👤 " . e($tech->name), 'callback_data' => "t_doasgn_{$ticketId}_{$tech->id}"];
            }

            // 2-column grid layout for tech assignment
            $buttons = array_chunk($techBtns, 2);
            $buttons[] = [['text' => "❌ Cancel", 'callback_data' => "t_cancel"]];

            if ($messageId) {
                $this->editMessageText($chatId, $messageId, "👨‍🔧 <b>ASSIGN TECHNICIAN</b>\n\nSelect a technical staff member to assign to Ticket <b>#{$ticketId}</b>:", ['inline_keyboard' => $buttons]);
            } else {
                $this->sendMessage($chatId, "👨‍🔧 <b>ASSIGN TECHNICIAN</b>\n\nSelect a technical staff member to assign to Ticket <b>#{$ticketId}</b>:", ['inline_keyboard' => $buttons]);
            }
            return;
        }

        if (str_starts_with($data, 't_doasgn_')) {
            $parts = explode('_', str_replace('t_doasgn_', '', $data));
            $ticketId = (int) ($parts[0] ?? 0);
            $techId = (int) ($parts[1] ?? 0);

            $user = $this->resolveUserFromChatId($chatId);
            $ticket = Ticket::find($ticketId);
            $techUser = User::find($techId);

            if (!$user || !$ticket || !$techUser) {
                return;
            }

            if (!$this->canUserAssignTicket($user, $ticket)) {
                $this->sendMessage($chatId, "⚠️ You do not have permission to assign technicians to Ticket #{$ticketId}.");
                return;
            }

            try {
                $actionService = app(TicketActionService::class);
                $actionService->assign($ticket, $techUser, $user);

                $msgText = "✅ Technician <b>" . e($techUser->name) . "</b> has been successfully assigned to Ticket <b>#{$ticketId}</b>!";
                if ($messageId) {
                    $this->editMessageText($chatId, $messageId, $msgText);
                } else {
                    $this->sendMessage($chatId, $msgText);
                }
            } catch (\Exception $e) {
                Log::error("Telegram t_doasgn error: {$e->getMessage()}");
                $this->sendMessage($chatId, "⚠️ Failed to assign technician: " . e($e->getMessage()));
            }
            return;
        }

        if (str_starts_with($data, 't_st_menu_')) {
            $ticketId = (int) str_replace('t_st_menu_', '', $data);
            $ticket = Ticket::find($ticketId);
            $user = $this->resolveUserFromChatId($chatId);
            if (!$ticket || !$user) {
                return;
            }

            $statusVal = is_object($ticket->status) ? $ticket->status->value : $ticket->status;
            $statusLabel = ucwords(str_replace('_', ' ', $statusVal));
            $buttons = $this->getNextStatusButtons($ticket, $user);

            $prompt = "🔄 <b>CHANGE TICKET STATUS</b>\n\n" .
                "Ticket: <b>#{$ticket->id}</b> - " . e($ticket->title) . "\n" .
                "Current Status: <b>{$statusLabel}</b>\n\n" .
                "Select the next status in the workflow sequence below:";

            if ($messageId) {
                $this->editMessageText($chatId, $messageId, $prompt, ['inline_keyboard' => $buttons]);
            } else {
                $this->sendMessage($chatId, $prompt, ['inline_keyboard' => $buttons]);
            }
            return;
        }

        if (str_starts_with($data, 't_view_')) {
            $ticketId = (int) str_replace('t_view_', '', $data);
            $this->showTicketDetail($chatId, $ticketId);
            return;
        }

        if (str_starts_with($data, 't_st_')) {
            $parts = explode('_', str_replace('t_st_', '', $data));
            $ticketId = (int) ($parts[0] ?? 0);
            unset($parts[0]);
            $newStatusStr = implode('_', $parts);

            $this->handleStatusChange($chatId, $ticketId, $newStatusStr);
            return;
        }

        if (str_starts_with($data, 't_rate_')) {
            $parts = explode('_', str_replace('t_rate_', '', $data));
            $ticketId = (int) ($parts[0] ?? 0);
            $stars = (int) ($parts[1] ?? 5);

            $user = $this->resolveUserFromChatId($chatId);
            $ticket = Ticket::find($ticketId);

            if (!$user || !$ticket) {
                return;
            }

            try {
                // Save rating in database
                $ticket->ratings()->create([
                    'user_id' => $user->id,
                    'stars' => $stars,
                    'comment' => 'Approved & rated via Telegram Bot',
                ]);

                // Set status to TicketApproved
                $actionService = app(TicketActionService::class);
                $actionService->setStatus($ticket, TicketStatus::TicketApproved, $user, 'Approved & Rated via Telegram Bot');

                // Notify department managers
                try {
                    app(TelegramTicketNotificationService::class)->notifyApprovedAndRated(
                        $ticket,
                        $user,
                        $stars,
                        'Approved & rated via Telegram Bot'
                    );
                } catch (\Throwable $ne) {
                    Log::error("Telegram notifyApprovedAndRated error: " . $ne->getMessage());
                }

                $starsDisplay = str_repeat('⭐', max(1, min(5, $stars)));
                $confirmText = "✅ <b>TICKET COMPLETED & APPROVED!</b>\n\n" .
                    "🎫 Ticket <b>#{$ticket->id}</b>: " . e($ticket->title) . "\n" .
                    "🌟 <b>Your Rating:</b> {$starsDisplay} ({$stars}/5 Stars)\n\n" .
                    "Thank you for your rating! The department manager has been notified to officially close the ticket.";

                if ($messageId) {
                    $this->editMessageText($chatId, $messageId, $confirmText);
                } else {
                    $this->sendMessage($chatId, $confirmText);
                }
            } catch (\Exception $e) {
                Log::error("Telegram t_rate error: {$e->getMessage()}");
                $this->sendMessage($chatId, "⚠️ Failed to submit rating: " . e($e->getMessage()));
            }
            return;
        }

        if ($data === 't_cmd_ticket') {
            $this->startTicketWizard($chatId);
            return;
        }

        if ($data === 't_cmd_mytickets') {
            $this->showMyTickets($chatId, 'all');
            return;
        }

        if (str_starts_with($data, 't_flt_')) {
            $filterStatus = str_replace('t_flt_', '', $data);
            $this->showMyTickets($chatId, $filterStatus);
            return;
        }

        if (str_starts_with($data, 't_cmt_prompt_')) {
            $ticketId = (int) str_replace('t_cmt_prompt_', '', $data);
            Cache::put("tg_comment_{$chatId}", $ticketId, 300);
            $this->sendMessage($chatId, "💬 Please reply with your <b>comment or progress update</b> for Ticket #{$ticketId}:");
            return;
        }
    }

    private function handleWizardStep(string|int $chatId, array $state, string $text, ?array $photo, array $message): void
    {
        $step = $state['step'] ?? '';
        $lang = $state['lang'] ?? 'en';

        if ($step === 'await_description') {
            if (empty($text)) {
                $msg = $lang === 'am' ? "⚠️ እባክዎን የችግሩን መግለጫ በጽሁፍ ያስገቡ:" : "⚠️ Please type a text description of your issue below:";
                $this->sendMessage($chatId, $msg);
                return;
            }

            $state['description'] = $text;
            $state['step'] = 'await_photo';
            Cache::put("tg_wizard_{$chatId}", $state, 600);

            $buttons = $lang === 'am' ? [
                [['text' => "⏩ ፎቶ እለፍ", 'callback_data' => "t_skip_photo"]],
                [['text' => "❌ ሰርዝ", 'callback_data' => "t_cancel"]],
            ] : [
                [['text' => "⏩ Skip Photo Attachment", 'callback_data' => "t_skip_photo"]],
                [['text' => "❌ Cancel", 'callback_data' => "t_cancel"]],
            ];

            $prompt = $lang === 'am'
                ? "📷 <b>ፎቶ ማያያዝ (አማራጭ)</b>\n\nደረጃ 8/8: የችግሩን <b>ፎቶ/ምስል</b> መላክ ይችላሉ፣ ወይም ያለ ፎቶ ለመጨረስ <b>ፎቶ እለፍ</b> የሚለውን ይጫኑ:"
                : "📷 <b>ATTACH PHOTO (OPTIONAL)</b>\n\nStep 8/8: You can upload a <b>photo/image</b> of the issue, or click <b>Skip Photo Attachment</b> below to submit without a photo:";

            $this->sendMessage($chatId, $prompt, ['inline_keyboard' => $buttons]);
            return;
        }

        if ($step === 'await_photo') {
            if (!empty($photo) && is_array($photo)) {
                $largestPhoto = end($photo);
                $imagePath = null;
                if (!empty($largestPhoto['file_id'])) {
                    $imagePath = $this->downloadTelegramFile($largestPhoto['file_id']);
                }
                $this->createTicketFromWizard($chatId, $state, $imagePath);
                return;
            }

            // Reject text inputs during photo step and prompt user to send a photo or click Skip button
            $buttons = $lang === 'am' ? [
                [['text' => "⏩ ፎቶ እለፍ", 'callback_data' => "t_skip_photo"]],
                [['text' => "❌ ሰርዝ", 'callback_data' => "t_cancel"]],
            ] : [
                [['text' => "⏩ Skip Photo Attachment", 'callback_data' => "t_skip_photo"]],
                [['text' => "❌ Cancel", 'callback_data' => "t_cancel"]],
            ];

            $msg = $lang === 'am'
                ? "📷 <b>እባክዎን የችግሩን ፎቶ/ምስል ያያይዙ!</b>\n\nምስል መላክ ካልፈለጉ <b>ፎቶ እለፍ</b> የሚለውን ቁልፍ ይጫኑ:"
                : "📷 <b>PLEASE UPLOAD A PHOTO/IMAGE OF THE ISSUE!</b>\n\nIf you do not want to attach a photo, please click the <b>Skip Photo Attachment</b> button below:";

            $this->sendMessage($chatId, $msg, ['inline_keyboard' => $buttons]);
            return;
        }

        $msg = $lang === 'am' ? "እባክዎን ከላይ ያሉትን ቁልፎች ተጠቅመው ይምረጡ።" : "Please use the inline buttons above to select your options.";
        $this->sendMessage($chatId, $msg);
    }

    private function promptDepartmentSelection(string|int $chatId, ?int $messageId, string $lang): void
    {
        $user = $this->resolveUserFromChatId($chatId);

        $userDeptIds = array_filter([
            $user?->department_id,
            $user?->employee?->department_id,
        ]);
        $managedDeptIds = $user ? ($user->managedDepartmentIds() ?? []) : [];
        $excludedDeptIds = array_unique(array_merge($userDeptIds, $managedDeptIds));

        $deptQuery = Department::query();
        if (Department::where('is_active_on_ticketing', true)->exists()) {
            $deptQuery->where('is_active_on_ticketing', true);
        } else {
            $deptQuery->where('is_active', true);
        }

        $isTechOrManager = $user && (
            $user->hasAnyRole(['Ticket Technician', 'Technician', 'Ticket Manager', 'Department Manager', 'IT Technician', 'Support Technician'])
            || !empty($managedDeptIds)
            || $user->can('ticket.assign')
            || $user->can('ticket.status.update')
            || $user->can('ticket.view.department')
        );

        if ($isTechOrManager && !empty($excludedDeptIds)) {
            $deptQuery->whereNotIn('id', $excludedDeptIds);
        }

        $departments = $deptQuery->orderBy('name')->get();
        $deptBtns = [];
        foreach ($departments as $dept) {
            $deptBtns[] = ['text' => "🏢 " . e($dept->name), 'callback_data' => "t_dept_{$dept->id}"];
        }

        $buttons = array_chunk($deptBtns, 2);
        $cancelBtn = $lang === 'am' ? "❌ ሰርዝ" : "❌ Cancel";
        $buttons[] = [['text' => $cancelBtn, 'callback_data' => "t_cancel"]];

        $state = Cache::get("tg_wizard_{$chatId}", []);
        $state['step'] = 'select_department';
        $state['lang'] = $lang;
        $state['user_id'] = $user?->id;
        Cache::put("tg_wizard_{$chatId}", $state, 600);

        $prompt = $lang === 'am'
            ? "🎫 <b>አዲስ የድጋፍ ጥያቄ መመዝገቢያ</b>\n\nእባክዎን የሚመለከተውን <b>ክፍል</b> ይምረጡ:"
            : "🎫 <b>CREATE NEW SUPPORT TICKET</b>\n\nPlease select the target <b>Department</b>:";

        if ($messageId) {
            $this->editMessageText($chatId, $messageId, $prompt, ['inline_keyboard' => $buttons]);
        } else {
            $this->sendMessage($chatId, $prompt, ['inline_keyboard' => $buttons]);
        }
    }

    private function createTicketFromWizard(string|int $chatId, array $state, ?string $imagePath): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        $lang = $state['lang'] ?? 'en';

        if (!$user) {
            $msg = $lang === 'am' ? "⚠️ መለያዎ አልተገናኘም።" : "⚠️ Account not linked.";
            $this->sendMessage($chatId, $msg);
            Cache::forget("tg_wizard_{$chatId}");
            return;
        }

        $deptId = $state['dept_id'] ?? null;

        $userDeptIds = array_filter([
            $user->department_id,
            $user->employee?->department_id,
        ]);
        $managedDeptIds = $user->managedDepartmentIds() ?? [];
        $excludedDeptIds = array_unique(array_merge($userDeptIds, $managedDeptIds));

        $isTechOrManager = $user->hasAnyRole(['Ticket Technician', 'Technician', 'Ticket Manager', 'Department Manager', 'IT Technician', 'Support Technician'])
            || !empty($managedDeptIds)
            || $user->can('ticket.assign')
            || $user->can('ticket.status.update')
            || $user->can('ticket.view.department');

        if ($isTechOrManager && in_array((int) $deptId, array_map('intval', $excludedDeptIds), true)) {
            $msg = $lang === 'am'
                ? "⚠️ ቴክኒሺያኖች እና የስራ ክፍል ኃላፊዎች ለራሳቸው ክፍል የድጋፍ ጥያቄ መመዝገብ አይችሉም።"
                : "⚠️ Technicians and Department Managers cannot submit support tickets to their own department.";
            $this->sendMessage($chatId, $msg);
            Cache::forget("tg_wizard_{$chatId}");
            return;
        }

        $mcatId = $state['mcat_id'] ?? null;
        $scatId = $state['scat_id'] ?? null;
        $priorityStr = $state['priority'] ?? 'medium';
        $severityStr = $state['severity'] ?? TicketSeverity::NoImpact->value;
        $description = $state['description'] ?? 'No description provided';

        $sub = TicketSubCategory::find($scatId);
        $title = $sub?->name ?? 'Support Ticket';

        // Resolve requestor user & employee
        $reqUserId = $state['requestor_user_id'] ?? $user->id;
        $reqUser = User::find($reqUserId) ?? $user;
        $reqEmployee = $reqUser->employee ?? $user->employee;
        $reqFullName = $state['requestor_full_name'] ?? ($reqEmployee ? ($reqEmployee->first_name . ' ' . $reqEmployee->last_name) : $reqUser->name);

        try {
            $ticket = Ticket::create([
                'user_id' => $reqUser->id,
                'department_id' => $deptId,
                'ticket_main_category_id' => $mcatId,
                'ticket_sub_category_id' => $scatId,
                'title' => $title,
                'description' => $description,
                'priority' => $priorityStr,
                'severity' => $severityStr,
                'status' => TicketStatus::PendingApproval,
                'image_path' => $imagePath,
                'requestor_full_name' => $reqFullName,
                'requestor_branch_id' => $reqEmployee?->branch_id ?? $user->employee?->branch_id,
                'requestor_department_id' => $reqEmployee?->department_id ?? $user->employee?->department_id,
                'requestor_phone' => $reqEmployee?->phone ?? $user->employee?->phone,
            ]);

            $actionService = app(TicketActionService::class);
            $actionService->logStatusHistory($ticket, $user, null, TicketStatus::PendingApproval->value, 'Submitted via Telegram Bot');
            $actionService->logActivity($ticket, $user, 'created', null, TicketStatus::PendingApproval->value, 'Submitted via Telegram Bot');
            $actionService->notifyCreated($ticket);

            Cache::forget("tg_wizard_{$chatId}");

            $appUrl = config('app.url', 'http://localhost:8000');
            if ($lang === 'am') {
                $reply = "✅ <b>የድጋፍ ጥያቄዎ በተሳካ ሁኔታ ተመዝግቧል!</b>\n\n" .
                    "🎫 <b>ጥያቄ #{$ticket->id}</b>: " . e($ticket->title) . "\n" .
                    "📌 <b>ሁኔታ:</b> ማረጋገጫ የሚጠብቅ (Pending Approval)\n" .
                    "⚠️ <b>አጣዳፊነት:</b> " . e(ucfirst($priorityStr)) . "\n" .
                    "⚡ <b>ተጽዕኖ:</b> " . e(ucfirst($severityStr)) . "\n" .
                    ($imagePath ? "📷 <b>ፎቶ ተያይዟል</b>\n" : "") . "\n" .
                    "<i>ጥያቄዎ ተመዝግቧል፤ የሚመለከታቸው የክፍሉ ኃላፊዎች ተሳውቀዋል።</i>";
            } else {
                $reply = "✅ <b>TICKET SUBMITTED SUCCESSFULLY!</b>\n\n" .
                    "🎫 <b>Ticket #{$ticket->id}</b>: " . e($ticket->title) . "\n" .
                    "📌 <b>Status:</b> Pending Approval\n" .
                    "⚠️ <b>Priority:</b> " . ucfirst($priorityStr) . "\n" .
                    "⚡ <b>Severity:</b> " . ucfirst($severityStr) . "\n" .
                    ($imagePath ? "📷 <b>Photo Attached</b>\n" : "") . "\n" .
                    "<i>Your request has been submitted and department managers have been notified.</i>";
            }

            $buttons = [];
            if (str_starts_with($appUrl, 'https://')) {
                $btnText = $lang === 'am' ? "👁️ ጥያቄ #{$ticket->id} ይመልከቱ" : "👁️ View Ticket #{$ticket->id}";
                $buttons = [
                    'inline_keyboard' => [
                        [
                            ['text' => $btnText, 'url' => "{$appUrl}/tickets/{$ticket->id}"],
                        ]
                    ]
                ];
            }

            $this->sendMessage($chatId, $reply, $buttons);
        } catch (\Exception $e) {
            Log::error("Telegram createTicketFromWizard error: {$e->getMessage()}");
            $errMsg = $lang === 'am' ? "⚠️ ጥያቄውን መመዝገብ አልተቻለም: " : "⚠️ Failed to create ticket: ";
            $this->sendMessage($chatId, $errMsg . e($e->getMessage()));
            Cache::forget("tg_wizard_{$chatId}");
        }
    }

    public function showMyTickets(string|int $chatId, string $filterStatus = 'all'): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        if (!$user) {
            $this->sendMessage($chatId, "⚠️ Your Telegram account or Branch is not linked yet.");
            return;
        }

        $userBranchId = $user->employee?->branch_id ?? $user->branch_id;
        $userDeptId = $user->employee?->department_id ?? $user->department_id;
        $managedIds = $user->managedDepartmentIds() ?? [];

        $q = Ticket::whereNotIn('status', [TicketStatus::Closed, TicketStatus::Rejected]);

        if ($user->can('ticket.view.all') || $user->hasRole('Super Admin') || $user->hasRole('Ticket Super Admin')) {
            // Full access to all active tickets system-wide
        } else {
            $q->where(function ($sq) use ($user, $userBranchId, $userDeptId, $managedIds) {
                $sq->where('user_id', $user->id)
                    ->orWhereHas('assignments', fn($asq) => $asq->where('assigned_to', $user->id)->where('is_current', true));

                if ($user->can('ticket.view.department') && $userDeptId) {
                    $sq->orWhere('department_id', $userDeptId);
                }
                if ($userBranchId) {
                    $sq->orWhere('requestor_branch_id', $userBranchId);
                }
                if (!empty($managedIds)) {
                    $sq->orWhereIn('department_id', $managedIds);
                }
            });
        }

        if ($filterStatus === 'pending') {
            $q->where('status', TicketStatus::PendingApproval);
        } elseif ($filterStatus === 'in_progress') {
            $q->whereIn('status', [TicketStatus::InProgress, TicketStatus::Hold, TicketStatus::Escalated]);
        } elseif ($filterStatus === 'done') {
            $q->whereIn('status', [TicketStatus::Done, TicketStatus::TicketApproved]);
        }

        $tickets = $q->latest()->take(10)->get();

        $filterButtons = [
            [
                ['text' => ($filterStatus === 'all' ? '🔘 All' : 'All'), 'callback_data' => "t_flt_all"],
                ['text' => ($filterStatus === 'pending' ? '🔘 Pending' : '🟡 Pending'), 'callback_data' => "t_flt_pending"],
                ['text' => ($filterStatus === 'in_progress' ? '🔘 In Progress' : '▶️ In Progress'), 'callback_data' => "t_flt_in_progress"],
                ['text' => ($filterStatus === 'done' ? '🔘 Resolved' : '🟢 Resolved'), 'callback_data' => "t_flt_done"],
            ]
        ];

        if ($tickets->isEmpty()) {
            $filterLabel = ucwords(str_replace('_', ' ', $filterStatus));
            $this->sendMessage($chatId, "ℹ️ No active tickets found matching filter: <b>{$filterLabel}</b>.", ['inline_keyboard' => $filterButtons]);
            return;
        }

        $buttons = $filterButtons;
        foreach ($tickets as $t) {
            $statusVal = is_object($t->status) ? $t->status->value : $t->status;
            $buttons[] = [[
                'text' => "#{$t->id} - " . e(mb_strimwidth($t->title, 0, 25, '...')) . " (" . str_replace('_', ' ', $statusVal) . ")",
                'callback_data' => "t_view_{$t->id}",
            ]];
        }

        $this->sendMessage($chatId, "📋 <b>ACTIVE TICKETS (" . strtoupper($filterStatus) . "):</b>\nSelect a ticket below to view details or change status:", ['inline_keyboard' => $buttons]);
    }

    public function showHelpGuide(string|int $chatId): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        $userBranchId = $user?->employee?->branch_id ?? $user?->branch_id;
        $managedIds = $user?->managedDepartmentIds() ?? [];

        $isManager = !empty($managedIds) || $user?->hasRole('Super Admin') || $user?->hasRole('Ticket Super Admin');

        $text = "📖 <b>HELPDESK BOT COMMAND GUIDE</b>\n\n" .
            "<b>Available Commands:</b>\n" .
            "• 🎫 <code>/ticket</code> - Create a new support ticket with photo attachments\n" .
            "• 📋 <code>/mytickets</code> - View active tickets, filter status, and rate service\n" .
            "• 🔍 <code>/search &lt;query&gt;</code> - Search tickets by ID or title (e.g. <code>/search 102</code>)\n" .
            "• ❓ <code>/help</code> - View command guide and workflow badges\n" .
            "• ❌ <code>/cancel</code> - Cancel active input or wizard step\n\n";

        if ($isManager) {
            $text .= "👔 <b>Manager Commands:</b>\n" .
                "• 📣 <code>/broadcast &lt;message&gt;</code> - Send announcement to branches\n" .
                "• 📊 <code>/report</code> - Generate department performance summary\n\n";
        }

        $text .= "📌 <b>Workflow Status Badges:</b>\n" .
            "🟡 Pending Manager Approval\n" .
            "🔵 Assigned / Approved\n" .
            "▶️ In Progress\n" .
            "⏸️ On Hold\n" .
            "🚨 Escalated to Manager\n" .
            "🟢 Resolved (Waiting Branch Rating)\n" .
            "✅ Approved & Rated\n" .
            "⚪ Officially Closed";

        $buttons = [
            [
                ['text' => "🎫 Create Ticket", 'callback_data' => "t_cmd_ticket"],
                ['text' => "📋 My Tickets", 'callback_data' => "t_cmd_mytickets"],
            ]
        ];

        $this->sendMessage($chatId, $text, ['inline_keyboard' => $buttons]);
    }

    public function handleSearchCommand(string|int $chatId, string $queryStr): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        if (!$user) {
            $this->sendMessage($chatId, "⚠️ Account not linked.");
            return;
        }

        if (empty($queryStr)) {
            $this->sendMessage($chatId, "🔍 <b>SEARCH TICKETS</b>\n\nPlease type your search query after `/search`, e.g.:\n• <code>/search 105</code> (Search by ID)\n• <code>/search printer</code> (Search by Keyword)");
            return;
        }

        $userBranchId = $user->employee?->branch_id ?? $user->branch_id;
        $managedIds = $user->managedDepartmentIds() ?? [];

        $q = Ticket::where(function ($sq) use ($user, $userBranchId, $managedIds) {
            $sq->where('user_id', $user->id)
                ->orWhereHas('assignments', fn($asq) => $asq->where('assigned_to', $user->id)->where('is_current', true));
            if ($userBranchId) {
                $sq->orWhere('requestor_branch_id', $userBranchId);
            }
            if (!empty($managedIds)) {
                $sq->orWhereIn('department_id', $managedIds);
            }
        });

        if (is_numeric($queryStr)) {
            $q->where(function($sq) use ($queryStr) {
                $sq->where('id', (int) $queryStr)
                   ->orWhere('title', 'like', "%{$queryStr}%");
            });
        } else {
            $q->where(function($sq) use ($queryStr) {
                $sq->where('title', 'like', "%{$queryStr}%")
                   ->orWhere('description', 'like', "%{$queryStr}%");
            });
        }

        $results = $q->latest()->take(8)->get();

        if ($results->isEmpty()) {
            $this->sendMessage($chatId, "🔍 No tickets found matching: <b>" . e($queryStr) . "</b>");
            return;
        }

        $buttons = [];
        foreach ($results as $t) {
            $statusVal = is_object($t->status) ? $t->status->value : $t->status;
            $buttons[] = [[
                'text' => "#{$t->id} - " . e(mb_strimwidth($t->title, 0, 25, '...')) . " (" . str_replace('_', ' ', $statusVal) . ")",
                'callback_data' => "t_view_{$t->id}",
            ]];
        }

        $this->sendMessage($chatId, "🔍 <b>SEARCH RESULTS FOR \"{$queryStr}\":</b>", ['inline_keyboard' => $buttons]);
    }

    private function processCommentInput(string|int $chatId, int $ticketId, string $commentText): void
    {
        Cache::forget("tg_comment_{$chatId}");

        $user = $this->resolveUserFromChatId($chatId);
        $ticket = Ticket::find($ticketId);

        if (!$user || !$ticket) {
            $this->sendMessage($chatId, "⚠️ Ticket not found.");
            return;
        }

        $actionService = app(TicketActionService::class);
        $actionService->logActivity($ticket, $user, 'chat_comment', $ticket->status->value, $ticket->status->value, $commentText);

        // Send Web In-App Notifications
        $recipients = array_unique(array_merge(
            [$ticket->user_id],
            $ticket->assignments()->where('is_current', true)->pluck('assigned_to')->all(),
            $actionService->departmentManagerUserIds($ticket->department_id)
        ));
        $recipients = array_values(array_filter($recipients, fn($id) => (int) $id !== (int) $user->id));

        if (!empty($recipients)) {
            $actionService->notifyUsers(
                $ticket,
                $recipients,
                'ticket.chat',
                "New Discussion Message on Ticket #{$ticket->id}",
                "{$user->name}: " . mb_strimwidth($commentText, 0, 150, '...')
            );
        }

        // Send Telegram Bot Notifications
        try {
            app(TelegramTicketNotificationService::class)->notifyTicketChatMessage($ticket, $user, $commentText);
        } catch (\Throwable $e) {
            Log::error("Telegram processCommentInput notify error: " . $e->getMessage());
        }

        $confirmMsg = "✅ <b>Discussion Message Sent to Ticket #{$ticket->id}:</b>\n<i>" . e($commentText) . "</i>";
        $this->sendMessage($chatId, $confirmMsg);
    }

    public function registerBotCommands(): void
    {
        $commands = [
            ['command' => 'ticket', 'description' => 'Create a new support ticket'],
            ['command' => 'mytickets', 'description' => 'View active tickets & update status'],
            ['command' => 'search', 'description' => 'Search tickets by ID or title'],
            ['command' => 'help', 'description' => 'Command manual & status badges'],
            ['command' => 'cancel', 'description' => 'Cancel current operation'],
        ];

        try {
            $token = $this->getBotToken();
            if ($token) {
                Http::post("https://api.telegram.org/bot{$token}/setMyCommands", [
                    'commands' => $commands
                ]);
            }
        } catch (\Throwable $e) {
            Log::error("Telegram setMyCommands error: " . $e->getMessage());
        }
    }

    public function showTicketDetail(string|int $chatId, int $ticketId): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        if (!$user) {
            $this->sendMessage($chatId, "⚠️ Account not linked.");
            return;
        }

        $ticket = Ticket::with(['mainCategory', 'subCategory', 'requestorBranch', 'assignments.assignee'])->find($ticketId);
        if (!$ticket) {
            $this->sendMessage($chatId, "⚠️ Ticket #{$ticketId} not found.");
            return;
        }

        $statusVal = is_object($ticket->status) ? $ticket->status->value : $ticket->status;
        $priorityVal = is_object($ticket->priority) ? $ticket->priority->value : $ticket->priority;
        $branchName = $ticket->requestorBranch?->name ?? 'N/A';
        $phone = $ticket->requestor_phone ?? $ticket->requestorBranch?->phone ?? 'N/A';
        $assigneeName = $ticket->assignments->firstWhere('is_current', true)?->assignee?->name ?? 'Unassigned';

        $text = "🎫 <b>Ticket #{$ticket->id}</b>: " . e($ticket->title) . "\n\n" .
            "🏢 <b>Requestor Branch:</b> " . e($branchName) . "\n" .
            "📞 <b>Phone:</b> " . e($phone) . "\n" .
            "📌 <b>Status:</b> " . e(ucwords(str_replace('_', ' ', $statusVal))) . "\n" .
            "⚠️ <b>Priority:</b> " . e(ucfirst($priorityVal)) . "\n" .
            "👨‍💻 <b>Assigned Tech:</b> " . e($assigneeName) . "\n" .
            "📝 <b>Description:</b> " . e(mb_strimwidth($ticket->description ?? '', 0, 200, '...')) . "\n" .
            ($ticket->image_path ? "📷 <b>Photo Attached:</b> Included\n" : "");

        $abilities = $ticket->getAbilities($user);
        $isRequestorBranch = ($ticket->requestor_branch_id && $user->employee?->branch_id == $ticket->requestor_branch_id)
            || ($ticket->user_id && (int) $ticket->user_id === (int) $user->id);

        $availableStatuses = $this->getAvailableStatusesForUser($user, $ticket);

        $actionRow = [];
        if (!in_array($statusVal, ['closed', 'rejected'])) {
            if ($isRequestorBranch && !$abilities['hasManagerPower']) {
                if ($statusVal === 'done') {
                    $actionRow[] = ['text' => "✅ Approve Completion", 'callback_data' => "t_st_{$ticket->id}_ticket_approved"];
                    $actionRow[] = ['text' => "❌ Reject Completion", 'callback_data' => "t_st_{$ticket->id}_rejected"];
                }
            } elseif ($abilities['hasManagerPower']) {
                if ($statusVal === 'pending_approval') {
                    $actionRow[] = ['text' => "👍 Approve & Assign Tech", 'callback_data' => "t_asgn_list_{$ticket->id}"];
                    $actionRow[] = ['text' => "❌ Reject", 'callback_data' => "t_st_{$ticket->id}_rejected"];
                } elseif ($statusVal === 'ticket_approved') {
                    $actionRow[] = ['text' => "🔒 Close Ticket", 'callback_data' => "t_st_{$ticket->id}_closed"];
                } else {
                    if (!empty($availableStatuses)) {
                        $actionRow[] = ['text' => "🔄 Change Status", 'callback_data' => "t_st_menu_{$ticket->id}"];
                    }
                    $actionRow[] = ['text' => "👨‍🔧 Reassign Tech", 'callback_data' => "t_asgn_list_{$ticket->id}"];
                }
            } else {
                if (!empty($availableStatuses)) {
                    $actionRow[] = ['text' => "🔄 Change Status", 'callback_data' => "t_st_menu_{$ticket->id}"];
                }
            }
        }

        $buttons = [];
        if (!empty($actionRow)) {
            $buttons[] = $actionRow;
        }

        $appUrl = config('app.url', 'http://localhost:8000');
        if (str_starts_with($appUrl, 'https://')) {
            $buttons[] = [
                ['text' => "🌐 Open in Web App", 'url' => "{$appUrl}/tickets/{$ticket->id}"],
            ];
        }

        $this->sendMessage($chatId, $text, ['inline_keyboard' => $buttons]);
    }

    public function canUserAssignTicket(User $user, Ticket $ticket): bool
    {
        $actionService = app(TicketActionService::class);
        $managerUserIds = $actionService->departmentManagerUserIds($ticket->department_id);
        $isManager = in_array((int) $user->id, $managerUserIds)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
            || $user->can('ticket.assign');

        $statusVal = is_object($ticket->status) ? $ticket->status->value : (string) $ticket->status;
        $isClosedOrRejected = in_array($statusVal, ['closed', 'rejected'], true);

        return $isManager && !$isClosedOrRejected;
    }

    public function getAvailableStatusesForUser(User $user, Ticket $ticket): array
    {
        $actionService = app(TicketActionService::class);
        $managerUserIds = $actionService->departmentManagerUserIds($ticket->department_id);

        $isManager = in_array((int) $user->id, $managerUserIds)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
            || $user->can('ticket.view.all');

        $statusVal = is_object($ticket->status) ? $ticket->status->value : (string) $ticket->status;

        if (in_array($statusVal, ['closed', 'rejected'], true)) {
            return [];
        }

        $isRequestor = (int) $ticket->user_id === (int) $user->id
            || ($ticket->requestor_branch_id && $user->employee?->branch_id && (int) $ticket->requestor_branch_id === (int) $user->employee->branch_id);

        if ($isRequestor && !$isManager) {
            if ($statusVal === 'done') {
                return ['ticket_approved', 'in_progress'];
            }
            return [];
        }

        $isAssignee = $ticket->assignments()->where('is_current', true)->where('assigned_to', $user->id)->exists();
        $isStaff = $isAssignee || $user->can('ticket.status.update') || $user->can('ticket.view.department');

        if ($isStaff && !$isManager) {
            switch ($statusVal) {
                case 'approved':
                case 'not_started':
                    return ['in_progress', 'hold'];

                case 'in_progress':
                    return ['hold', 'escalated', 'done'];

                case 'hold':
                    return ['in_progress', 'escalated', 'done'];

                case 'escalated':
                    return ['in_progress', 'done'];

                case 'done':
                    return [];

                default:
                    return [];
            }
        }

        if ($isManager) {
            switch ($statusVal) {
                case 'pending_approval':
                    return ['approved', 'rejected'];

                case 'approved':
                case 'not_started':
                    return ['in_progress', 'hold'];

                case 'in_progress':
                    return ['hold', 'escalated', 'done'];

                case 'hold':
                    return ['in_progress', 'escalated', 'done'];

                case 'escalated':
                    return ['in_progress', 'done'];

                case 'done':
                    return [];

                case 'ticket_approved':
                    return ['closed'];

                default:
                    return [];
            }
        }

        return [];
    }

    public function getNextStatusButtons(Ticket $ticket, User $user): array
    {
        $allowed = $this->getAvailableStatusesForUser($user, $ticket);
        $currentStatus = is_object($ticket->status) ? $ticket->status->value : (string) $ticket->status;

        $labelMap = [
            'approved' => '👍 Approve Ticket',
            'rejected' => '❌ Reject Ticket',
            'in_progress' => '▶️ In Progress',
            'hold' => '⏸️ Hold',
            'done' => '✅ Mark Done',
            'escalated' => '🚨 Escalate',
            'ticket_approved' => '✅ Approve Completion',
            'closed' => '🔒 Close Ticket',
        ];

        $rawBtns = [];
        foreach ($allowed as $st) {
            if ($st === $currentStatus) {
                continue;
            }
            $label = $labelMap[$st] ?? ucwords(str_replace('_', ' ', $st));
            $rawBtns[] = ['text' => $label, 'callback_data' => "t_st_{$ticket->id}_{$st}"];
        }

        $buttons = array_chunk($rawBtns, 2);
        $buttons[] = [['text' => "🔙 Back to Ticket", 'callback_data' => "t_view_{$ticket->id}"]];

        return $buttons;
    }

    public function handleStatusChange(string|int $chatId, int $ticketId, string $newStatusStr): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        if (!$user) {
            $this->sendMessage($chatId, "⚠️ Account not linked.");
            return;
        }

        $ticket = Ticket::find($ticketId);
        if (!$ticket) {
            $this->sendMessage($chatId, "⚠️ Ticket #{$ticketId} not found.");
            return;
        }

        $abilities = $ticket->getAbilities($user);
        $isRequestorBranch = $ticket->requestor_branch_id && $user->employee?->branch_id == $ticket->requestor_branch_id;
        $canChangeStatus = $abilities['canUpdateStatus'] || $abilities['canApproveReject'] || $isRequestorBranch;

        if (!$canChangeStatus) {
            $this->sendMessage($chatId, "⚠️ You do not have permission to change status for Ticket #{$ticketId}.");
            return;
        }

        if ($newStatusStr === 'ticket_approved') {
            $ratingBtns = [
                [
                    ['text' => "⭐ 1 Star", 'callback_data' => "t_rate_{$ticketId}_1"],
                    ['text' => "⭐⭐ 2 Stars", 'callback_data' => "t_rate_{$ticketId}_2"],
                ],
                [
                    ['text' => "⭐⭐⭐ 3 Stars", 'callback_data' => "t_rate_{$ticketId}_3"],
                    ['text' => "⭐⭐⭐⭐ 4 Stars", 'callback_data' => "t_rate_{$ticketId}_4"],
                ],
                [
                    ['text' => "⭐⭐⭐⭐⭐ 5 Stars (Excellent)", 'callback_data' => "t_rate_{$ticketId}_5"],
                ],
                [
                    ['text' => "❌ Cancel", 'callback_data' => "t_cancel"],
                ]
            ];

            $ratingPrompt = "⭐ <b>RATE & APPROVE SERVICE COMPLETION</b>\n\n" .
                "Ticket <b>#{$ticket->id}</b>: " . e($ticket->title) . "\n\n" .
                "Please rate your overall satisfaction with the resolved technical support service:";

            $this->sendMessage($chatId, $ratingPrompt, ['inline_keyboard' => $ratingBtns]);
            return;
        }

        if (in_array($newStatusStr, ['hold', 'rejected', 'escalated'], true)) {
            Cache::put("tg_status_reason_{$chatId}", [
                'ticket_id' => $ticketId,
                'new_status' => $newStatusStr,
            ], 300);

            $this->sendMessage($chatId, "💬 Please reply with the <b>reason/comment</b> for setting Ticket #{$ticketId} status to <b>" . str_replace('_', ' ', $newStatusStr) . "</b>:");
            return;
        }

        $this->executeStatusChange($chatId, $ticket, $newStatusStr, $user, null);
    }

    private function processStatusReasonInput(string|int $chatId, array $state, string $reason): void
    {
        Cache::forget("tg_status_reason_{$chatId}");

        $user = $this->resolveUserFromChatId($chatId);
        if (!$user) {
            $this->sendMessage($chatId, "⚠️ Account not linked.");
            return;
        }

        $ticket = Ticket::find($state['ticket_id'] ?? 0);
        if (!$ticket) {
            $this->sendMessage($chatId, "⚠️ Ticket not found.");
            return;
        }

        $this->executeStatusChange($chatId, $ticket, $state['new_status'], $user, $reason);
    }

    private function executeStatusChange(string|int $chatId, Ticket $ticket, string $newStatusStr, User $user, ?string $reason): void
    {
        try {
            $allowed = $this->getAvailableStatusesForUser($user, $ticket);
            if (!in_array($newStatusStr, $allowed, true)) {
                $this->sendMessage($chatId, "⚠️ Status transition to <b>" . ucwords(str_replace('_', ' ', $newStatusStr)) . "</b> is not allowed for your role or current ticket status.");
                return;
            }

            $targetEnum = TicketStatus::from($newStatusStr);
            $actionService = app(TicketActionService::class);
            $actionService->setStatus($ticket, $targetEnum, $user, $reason, [], 'status_changed');

            $statusLabel = str_replace('_', ' ', $newStatusStr);
            $this->sendMessage($chatId, "✅ <b>Status Updated!</b>\n\nTicket <b>#{$ticket->id}</b> status is now <b>" . ucwords($statusLabel) . "</b>." . ($reason ? "\nReason: " . e($reason) : ""));
        } catch (\Exception $e) {
            Log::error("Telegram executeStatusChange error: {$e->getMessage()}");
            $this->sendMessage($chatId, "⚠️ Failed to update status: " . e($e->getMessage()));
        }
    }

    private function handleStartCommand(string|int $chatId, string $text, ?string $username): void
    {
        $parts = explode(' ', $text);
        $userIdToken = isset($parts[1]) ? trim($parts[1]) : null;

        if ($userIdToken && is_numeric($userIdToken)) {
            $user = User::find((int) $userIdToken);
            if ($user) {
                $user->update([
                    'telegram_chat_id' => (string) $chatId,
                    'telegram_username' => $username,
                ]);

                $userBranch = e($user->employee?->branch?->name ?? 'Head Office');
                $reply = "✅ <b>ACCOUNT LINKED SUCCESSFULLY!</b>\n\nHello <b>" . e($user->name) . "</b> ({$userBranch}), your Telegram account is active.\n\n" .
                    "<b>Available Commands:</b>\n" .
                    "• 🎫 <code>/ticket</code> — Create a new support ticket\n" .
                    "• 📋 <code>/mytickets</code> — View & update status of active cases\n" .
                    "• 🔍 <code>/search &lt;query&gt;</code> — Search tickets by ID or title\n" .
                    "• ❓ <code>/help</code> — View command manual & guide";

                $buttons = [
                    'inline_keyboard' => [
                        [
                            ['text' => "🎫 Create Ticket", 'callback_data' => "t_cmd_ticket"],
                            ['text' => "📋 My Tickets", 'callback_data' => "t_cmd_mytickets"],
                        ],
                        [
                            ['text' => "❓ Help Guide", 'callback_data' => "t_cmd_help"],
                        ]
                    ]
                ];

                $this->sendMessage($chatId, $reply, $buttons);
                return;
            }
        }

        $user = $this->resolveUserFromChatId($chatId);
        if ($user) {
            if ($username && $user->telegram_username !== $username) {
                $user->update(['telegram_username' => $username]);
            }

            $userLocation = e($user->employee?->branch?->name ?? $user->employee?->department?->name ?? 'Head Office');
            $welcome = "🎧 <b>COMPANY HELPDESK SUPPORT BOT</b>\n\n" .
                "Welcome back, <b>" . e($user->name) . "</b> ({$userLocation})!\n\n" .
                "Your Telegram Chat ID: <code>{$chatId}</code>\n\n" .
                "You are connected to the IT & Operations Helpdesk. Submit new issues, track ticket progress, and receive instant status alerts.";

            $buttons = [
                'inline_keyboard' => [
                    [
                        ['text' => "🎫 Create Ticket", 'callback_data' => "t_cmd_ticket"],
                        ['text' => "📋 My Tickets", 'callback_data' => "t_cmd_mytickets"],
                    ],
                    [
                        ['text' => "❓ Help Manual", 'callback_data' => "t_cmd_help"],
                    ]
                ]
            ];

            $this->sendMessage($chatId, $welcome, $buttons);
        } else {
            $unlinkedText = "🎧 <b>COMPANY HELPDESK SUPPORT BOT</b>\n\n" .
                "Hello! Your Telegram Chat ID is: <code>{$chatId}</code>\n\n" .
                "⚠️ Your Telegram account is not linked to any user or branch in the system yet.";

            $buttons = [
                'inline_keyboard' => [
                    [
                        ['text' => "❓ Help Guide", 'callback_data' => "t_cmd_help"],
                    ]
                ]
            ];

            $this->sendMessage($chatId, $unlinkedText, $buttons);
        }
    }

    private function handleBroadcastCommand(string|int $chatId, string $text): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        if (!$user || (!$user->hasRole('Ticket Super Admin') && empty($user->managedDepartmentIds()))) {
            $this->sendMessage($chatId, "⚠️ Only department managers and administrators can broadcast announcements.");
            return;
        }

        $messageText = trim(substr($text, strlen('/broadcast')));
        if (empty($messageText)) {
            $this->sendMessage($chatId, "⚠️ Please include the announcement text after the command.\n\nExample:\n<code>/broadcast System maintenance scheduled at 10 PM.</code>");
            return;
        }

        $user->loadMissing(['employee.department']);
        $deptName = $user->employee?->department?->name ?? 'Company Management';

        $sender = e($user->name);
        $announcement = "📢 <b>ANNOUNCEMENT from " . e($deptName) . "</b>\n\n" .
            e($messageText) . "\n\n" .
            "✍️ <i>Sent by: {$sender} (" . e($deptName) . ")</i>";

        $count = 0;
        $sentChatIds = [];
        $branches = Branch::whereNotNull('telegram_chat_id')->where('telegram_chat_id', '!=', '')->get();
        foreach ($branches as $b) {
            $cid = (string) $b->telegram_chat_id;
            if (!in_array($cid, $sentChatIds, true)) {
                if ($this->sendMessage($cid, $announcement)) {
                    $count++;
                    $sentChatIds[] = $cid;
                }
            }
        }

        $users = User::whereNotNull('telegram_chat_id')->where('telegram_chat_id', '!=', '')->get();
        foreach ($users as $u) {
            $cid = (string) $u->telegram_chat_id;
            if (!in_array($cid, $sentChatIds, true)) {
                if ($this->sendMessage($cid, $announcement)) {
                    $count++;
                    $sentChatIds[] = $cid;
                }
            }
        }

        $this->sendMessage($chatId, "✅ Broadcast announcement sent successfully to {$count} recipient(s)!");
    }

    /**
     * Process incoming Telegram webhook updates for the Budget System Bot.
     */
    public function handleBudgetWebhookUpdate(array $update): void
    {
        if (isset($update['callback_query'])) {
            $callbackQuery = $update['callback_query'];
            $data = $callbackQuery['data'] ?? '';
            $chatId = $callbackQuery['message']['chat']['id'] ?? null;
            if ($chatId && str_starts_with($data, 'b_cmd_')) {
                $cmd = str_replace('b_cmd_', '', $data);
                if ($cmd === 'budget') {
                    $this->showMyBudgetRequests($chatId);
                } elseif ($cmd === 'help') {
                    $this->showBudgetHelpGuide($chatId);
                }
            }
            return;
        }

        if (!isset($update['message'])) {
            return;
        }

        $message = $update['message'];
        $chatId = $message['chat']['id'] ?? null;
        $text = trim($message['text'] ?? '');
        $username = $message['from']['username'] ?? null;

        if (!$chatId) {
            return;
        }

        if (str_starts_with($text, '/start')) {
            $this->handleBudgetStartCommand($chatId, $text, $username);
            return;
        }

        if (str_starts_with($text, '/help')) {
            $this->showBudgetHelpGuide($chatId);
            return;
        }

        if (str_starts_with($text, '/budget') || str_starts_with($text, '/mybudgets')) {
            $this->showMyBudgetRequests($chatId);
            return;
        }

        // Default response for Budget Bot
        $this->sendBudgetBotMessage($chatId, "💰 <b>Company Budget System Bot</b>\n\nAvailable commands:\n• <b>/budget</b> — View active weekly budget requests\n• <b>/help</b> — View budget bot guide");
    }

    private function handleBudgetStartCommand(string|int $chatId, string $text, ?string $username = null): void
    {
        $parts = explode(' ', $text);
        $payload = $parts[1] ?? null;

        if ($payload) {
            $userId = (int) str_replace('link_', '', $payload);
            $userToLink = User::find($userId);
            if ($userToLink) {
                $userToLink->update([
                    'telegram_chat_id' => (string) $chatId,
                    'telegram_username' => $username,
                ]);
                $this->sendBudgetBotMessage($chatId, "✅ <b>ACCOUNT LINKED SUCCESSFULLY!</b>\n\nYour Telegram account has been linked to <b>" . e($userToLink->name) . "</b>. You will now receive weekly budget notifications here.");
                return;
            }
        }

        $user = $this->resolveUserFromChatId($chatId);
        if ($user) {
            if ($username && $user->telegram_username !== $username) {
                $user->update(['telegram_username' => $username]);
            }

            $userDept = e($user->employee?->department?->name ?? 'Head Office');
            $welcome = "💰 <b>COMPANY BUDGET SYSTEM BOT</b>\n\n" .
                "Welcome back, <b>" . e($user->name) . "</b> ({$userDept})!\n\n" .
                "Your Telegram Chat ID: <code>{$chatId}</code>\n\n" .
                "You are set up to receive weekly budget notifications for your department and approval workflows.";

            $buttons = [
                'inline_keyboard' => [
                    [
                        ['text' => "💰 My Budgets", 'callback_data' => "b_cmd_budget"],
                        ['text' => "❓ Help Guide", 'callback_data' => "b_cmd_help"],
                    ]
                ]
            ];

            $this->sendBudgetBotMessage($chatId, $welcome, $buttons);
        } else {
            $unlinkedText = "💰 <b>COMPANY BUDGET SYSTEM BOT</b>\n\n" .
                "Your Telegram Chat ID is: <code>{$chatId}</code>\n\n" .
                "⚠️ <b>Telegram Account Not Linked</b>\n\n" .
                "Please contact your <b>IT Administrator</b> with your Chat ID (<code>{$chatId}</code>) to link your account and receive budget notifications.";

            $this->sendBudgetBotMessage($chatId, $unlinkedText);
        }
    }

    public function showMyBudgetRequests(string|int $chatId): void
    {
        $user = $this->resolveUserFromChatId($chatId);
        if (!$user) {
            $this->sendBudgetBotMessage($chatId, "⚠️ Account not linked yet. Chat ID: <code>{$chatId}</code>");
            return;
        }

        $userDeptId = $user->employee?->department_id;

        $budgets = \App\Models\WeeklyBudget::with(['department', 'branch'])
            ->where(function($q) use ($user, $userDeptId) {
                $q->where('created_by', $user->id);
                if ($userDeptId) {
                    $q->orWhere('department_id', $userDeptId);
                }
            })
            ->latest()
            ->take(8)
            ->get();

        if ($budgets->isEmpty()) {
            $this->sendBudgetBotMessage($chatId, "ℹ️ No recent weekly budget requests found for your account/department.");
            return;
        }

        $msg = "💰 <b>YOUR RECENT WEEKLY BUDGET REQUESTS:</b>\n\n";
        $buttons = [];
        foreach ($budgets as $b) {
            $amount = number_format((float) $b->amount, 2);
            $dept = e($b->department?->name ?? 'N/A');
            $msg .= "• <b>Weekly Budget #{$b->id}</b> ({$dept}): ETB {$amount}\n";

            $path = "/budget/weekly-budget?budget_id={$b->id}";
            $appUrl = app(TelegramWeeklyBudgetNotificationService::class)->getAppUrl() ?? config('app.url');
            $buttons[] = [[
                'text' => "👁️ View Budget #{$b->id}",
                'url' => "{$appUrl}{$path}",
            ]];
        }

        $this->sendBudgetBotMessage($chatId, $msg, ['inline_keyboard' => $buttons]);
    }

    public function showBudgetHelpGuide(string|int $chatId): void
    {
        $text = "📖 <b>BUDGET SYSTEM BOT COMMAND MANUAL</b>\n\n" .
            "<b>Available Commands:</b>\n" .
            "• 💰 <code>/budget</code> - View active weekly budget requests & status\n" .
            "• ❓ <code>/help</code> - Display this help guide\n\n" .
            "📌 <b>Approval Stages:</b>\n" .
            "1️⃣ <b>Department Manager Approval</b>\n" .
            "2️⃣ <b>Finance Review & Approval</b>\n" .
            "3️⃣ <b>CEO Approval & Disbursement</b>";

        $this->sendBudgetBotMessage($chatId, $text);
    }

    public function sendBudgetBotMessage(string|int $chatId, string $text, ?array $replyMarkup = null): bool
    {
        return $this->sendBotMessage('budget', $chatId, $text, $replyMarkup);
    }

    public function sendMemoBotMessage(string|int $chatId, string $text, ?array $replyMarkup = null): bool
    {
        return $this->sendBotMessage('memo', $chatId, $text, $replyMarkup);
    }

    public function handleMemoWebhookUpdate(array $update): void
    {
        if (!isset($update['message'])) {
            return;
        }

        $message = $update['message'];
        $chatId = $message['chat']['id'] ?? null;
        $text = trim($message['text'] ?? '');
        $username = $message['from']['username'] ?? null;

        if (!$chatId) {
            return;
        }

        if (str_starts_with($text, '/start')) {
            $parts = explode(' ', $text);
            $payload = $parts[1] ?? null;

            if ($payload && str_starts_with($payload, 'link_')) {
                $userId = (int) str_replace('link_', '', $payload);
                $userToLink = User::find($userId);
                if ($userToLink) {
                    $userToLink->update([
                        'telegram_chat_id' => (string) $chatId,
                        'telegram_username' => $username ? ltrim($username, '@') : $userToLink->telegram_username,
                    ]);
                    $this->sendMemoBotMessage($chatId, "✅ <b>Account Linked Successfully!</b>\n\nHello <b>" . e($userToLink->name) . "</b>, your Telegram account is now connected to receive Internal Memorandum notifications.");
                    return;
                }
            }

            // Check if user is linked by Chat ID or Username
            $linkedUser = User::where('telegram_chat_id', (string) $chatId)->first();
            if (!$linkedUser && !empty($username)) {
                $cleanUser = ltrim($username, '@');
                $linkedUser = User::where('telegram_username', $cleanUser)->first();
                if ($linkedUser) {
                    $linkedUser->update(['telegram_chat_id' => (string) $chatId]);
                }
            }

            // If user is NOT linked:
            if (!$linkedUser) {
                $unlinkedMsg = "⚠️ <b>Telegram Account Not Linked</b>\n\n" .
                    "Your Telegram Chat ID is: <code>{$chatId}</code>\n\n" .
                    "Please contact your <b>IT Administrator</b> with your Chat ID (<code>{$chatId}</code>) to link your account in the system and receive Internal Memorandum dispatches.";
                $this->sendMemoBotMessage($chatId, $unlinkedMsg);
                return;
            }

            // If user IS linked:
            $welcomeMsg = "📄 <b>Internal Memorandum Bot</b>\n\n" .
                "Welcome <b>" . e($linkedUser->name) . "</b>!\n" .
                "Your Chat ID (<code>{$chatId}</code>) is connected.\n\n" .
                "You will receive official dispatches addressed to your Department, Branch, or User profile.\n\n" .
                "Commands:\n• <b>/memos</b> — View latest memorandums";
            $this->sendMemoBotMessage($chatId, $welcomeMsg);
            return;
        }

        if (str_starts_with($text, '/memos')) {
            $this->sendMemoBotMessage($chatId, "📋 <b>Latest Internal Memorandums</b>\n\nPlease log into the company portal to view your signed memorandums: " . config('app.url'));
            return;
        }

        $this->sendMemoBotMessage($chatId, "📄 <b>Internal Memorandum Bot</b>\n\nCommands:\n• <b>/memos</b> — View latest memorandums");
    }

    public function getPreOrderBaseUrl(): ?string
    {
        $token = $this->getPreOrderBotToken();
        if (!empty($token)) {
            return "https://api.telegram.org/bot{$token}";
        }

        return null;
    }

    public function sendPreOrderMessage($chatId, string $text, ?array $keyboard = null): void
    {
        $baseUrl = $this->getPreOrderBaseUrl();
        if (!$baseUrl) {
            Log::warning("sendPreOrderMessage skipped: Pre-Order Bot token not configured.");
            return;
        }

        $params = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ];
        if ($keyboard) {
            $params['reply_markup'] = json_encode($keyboard);
        }

        try {
            $this->http()->post("{$baseUrl}/sendMessage", $params);
        } catch (\Throwable $e) {
            Log::error("sendPreOrderMessage error: " . $e->getMessage());
        }
    }

    public function sendPhotoMessage($chatId, string $photoPath, string $caption = ''): void
    {
        $baseUrl = $this->getPreOrderBaseUrl();
        if (!$baseUrl || !file_exists($photoPath)) return;

        try {
            $this->http()->attach('photo', file_get_contents($photoPath), basename($photoPath))
                ->post("{$baseUrl}/sendPhoto", [
                    'chat_id' => $chatId,
                    'caption' => $caption,
                    'parse_mode' => 'HTML',
                ]);
        } catch (\Throwable $e) {
            Log::error("sendPhotoMessage error: " . $e->getMessage());
        }
    }

    public function sendRawMessage($chatId, string $text): void
    {
        $this->sendPreOrderMessage($chatId, $text);
    }

    public function handlePreOrderWebhookUpdate(array $update): void
    {
        $message = $update['message'] ?? $update['callback_query']['message'] ?? null;
        if (!$message) return;

        $chatId = (string)($message['chat']['id'] ?? '');
        $text = trim($update['message']['text'] ?? ($update['message']['caption'] ?? ''));
        $from = $update['message']['from'] ?? ($update['callback_query']['from'] ?? []);

        if (!$chatId) return;

        // Track Telegram Customer
        \App\Models\TelegramCustomer::updateOrCreate(
            ['chat_id' => $chatId],
            [
                'username' => $from['username'] ?? null,
                'first_name' => $from['first_name'] ?? null,
                'last_name' => $from['last_name'] ?? null,
            ]
        );

        $customerState = \App\Models\TelegramCustomerState::find($chatId);
        $state = $customerState->state ?? 'idle';
        $tempData = $customerState->temp_data ?? [];

        if (str_starts_with($text, '/start')) {
            \App\Models\TelegramCustomerState::updateOrCreate(['chat_id' => $chatId], ['state' => 'idle', 'temp_data' => []]);

            // Determine HTTPS MiniApp URL
            $pBot = TelegramBot::whereIn('slug', ['pre_order', 'pre-order', 'pre-order-bot'])->whereNotNull('webhook_url')->where('webhook_url', '!=', '')->first();
            $registeredWebhook = $pBot?->webhook_url ?? TelegramSettings::getInstance()->webhook_url;

            if (!empty($registeredWebhook) && str_starts_with($registeredWebhook, 'https://')) {
                $cleanDomain = preg_replace('#/api/telegram(/.*)?$#i', '', $registeredWebhook);
                $webAppUrl = "{$cleanDomain}/pre-orders/miniapp";
            } elseif (str_starts_with(config('app.url'), 'https://')) {
                $webAppUrl = config('app.url') . '/pre-orders/miniapp';
            } else {
                $webAppUrl = 'https://preorder.kaldisbunnaet.com/pre-orders/miniapp';
            }

            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '🍰 Order Tortas & Pastries', 'web_app' => ['url' => $webAppUrl]]
                    ],
                    [
                        ['text' => '⭐ Feedback', 'callback_data' => 'start_feedback'],
                        ['text' => '📦 My Orders', 'callback_data' => 'my_orders']
                    ],
                    [
                        ['text' => 'ℹ️ About Us', 'callback_data' => 'about_us']
                    ]
                ]
            ];

            $firstName = !empty($from['first_name']) ? trim($from['first_name']) : 'there';

            $welcomeMsg = "Welcome to Kaldi's Coffee, {$firstName}!\n\n" .
                           "Pre-order your holiday tortas now and skip the queue!\n\n" .
                           "How can we help you today?";
            $this->sendPreOrderMessage($chatId, $welcomeMsg, $keyboard);
            return;
        }

        if ($text === '/feedback' || (isset($update['callback_query']['data']) && $update['callback_query']['data'] === 'start_feedback')) {
            $userOrders = \App\Models\PreOrder::where('chat_id', $chatId)->with('collectionBranch')->get();
            if ($userOrders->isEmpty()) {
                $custPhone = \App\Models\TelegramCustomer::where('chat_id', (string)$chatId)->value('phone_number');
                if ($custPhone) {
                    $userOrders = \App\Models\PreOrder::where('phone_number', $custPhone)->with('collectionBranch')->get();
                }
            }

            $branches = $userOrders->pluck('collectionBranch')->filter()->unique('id');
            if ($branches->isEmpty()) {
                $branches = \App\Models\Branch::where('is_pre_order_branch', true)->orderBy('name')->get(['id', 'name']);
            }
            if ($branches->isEmpty()) {
                $branches = \App\Models\Branch::orderBy('name')->get(['id', 'name']);
            }

            $flatButtons = [];
            foreach ($branches as $b) {
                $flatButtons[] = ['text' => $b->name, 'callback_data' => 'fb_branch_' . $b->id];
            }
            $keyboard = ['inline_keyboard' => array_chunk($flatButtons, 2)];
            \App\Models\TelegramCustomerState::updateOrCreate(['chat_id' => $chatId], ['state' => 'fb_select_branch', 'temp_data' => []]);
            $this->sendPreOrderMessage($chatId, "<b>⭐ Customer Feedback</b>\n\nPlease select your collection branch:", $keyboard);
            return;
        }

        if (isset($update['callback_query'])) {
            $data = $update['callback_query']['data'] ?? '';

            if (str_starts_with($data, 'fb_branch_')) {
                $branchId = (int)str_replace('fb_branch_', '', $data);
                $tempData['branch_id'] = $branchId;
                \App\Models\TelegramCustomerState::updateOrCreate(['chat_id' => $chatId], ['state' => 'fb_rate_delivery', 'temp_data' => $tempData]);

                $keyboard = ['inline_keyboard' => [
                    [['text' => '⭐ 1', 'callback_data' => 'fb_del_1'], ['text' => '⭐ 2', 'callback_data' => 'fb_del_2'], ['text' => '⭐ 3', 'callback_data' => 'fb_del_3'], ['text' => '⭐ 4', 'callback_data' => 'fb_del_4'], ['text' => '⭐ 5', 'callback_data' => 'fb_del_5']]
                ]];
                $this->sendPreOrderMessage($chatId, "Rate <b>Order Delivery & Pickup Speed</b> (1-5 Stars):", $keyboard);
                return;
            }

            if (str_starts_with($data, 'fb_del_')) {
                $tempData['delivery_rating'] = (int)str_replace('fb_del_', '', $data);
                \App\Models\TelegramCustomerState::updateOrCreate(['chat_id' => $chatId], ['state' => 'fb_rate_torta', 'temp_data' => $tempData]);

                $keyboard = ['inline_keyboard' => [
                    [['text' => '⭐ 1', 'callback_data' => 'fb_torta_1'], ['text' => '⭐ 2', 'callback_data' => 'fb_torta_2'], ['text' => '⭐ 3', 'callback_data' => 'fb_torta_3'], ['text' => '⭐ 4', 'callback_data' => 'fb_torta_4'], ['text' => '⭐ 5', 'callback_data' => 'fb_torta_5']]
                ]];
                $this->sendPreOrderMessage($chatId, "Rate <b>Torta & Product Quality</b> (1-5 Stars):", $keyboard);
                return;
            }

            if (str_starts_with($data, 'fb_torta_')) {
                $tempData['torta_rating'] = (int)str_replace('fb_torta_', '', $data);
                \App\Models\TelegramCustomerState::updateOrCreate(['chat_id' => $chatId], ['state' => 'fb_rate_service', 'temp_data' => $tempData]);

                $keyboard = ['inline_keyboard' => [
                    [['text' => '⭐ 1', 'callback_data' => 'fb_svc_1'], ['text' => '⭐ 2', 'callback_data' => 'fb_svc_2'], ['text' => '⭐ 3', 'callback_data' => 'fb_svc_3'], ['text' => '⭐ 4', 'callback_data' => 'fb_svc_4'], ['text' => '⭐ 5', 'callback_data' => 'fb_svc_5']]
                ]];
                $this->sendPreOrderMessage($chatId, "Rate <b>Staff Customer Service</b> (1-5 Stars):", $keyboard);
                return;
            }

            if (str_starts_with($data, 'fb_svc_')) {
                $tempData['service_rating'] = (int)str_replace('fb_svc_', '', $data);
                \App\Models\TelegramCustomerState::updateOrCreate(['chat_id' => $chatId], ['state' => 'fb_written', 'temp_data' => $tempData]);

                $this->sendPreOrderMessage($chatId, "Please type any additional comments or written feedback (or type 'skip'):");
                return;
            }

            if ($data === 'my_orders') {
                $orders = \App\Models\PreOrder::where('chat_id', $chatId)->orderByDesc('created_at')->limit(5)->get();
                if ($orders->isEmpty()) {
                    $custPhone = \App\Models\TelegramCustomer::where('chat_id', (string) $chatId)->value('phone_number');
                    if ($custPhone) {
                        $orders = \App\Models\PreOrder::where('phone_number', $custPhone)->orderByDesc('created_at')->limit(5)->get();
                    }
                }
                if ($orders->isEmpty()) {
                    $this->sendPreOrderMessage($chatId, "You have no previous pre-orders recorded.");
                    return;
                }
                $txt = "<b>📦 Your Recent Pre-Orders:</b>\n\n";
                foreach ($orders as $o) {
                    $dateStr = $o->created_at ? $o->created_at->format('M d, Y') : '';
                    $txt .= "• <b>#{$o->order_number}</b> — ETB " . number_format($o->total_amount, 2) . "\n" .
                            "  Status: <b>{$o->status}</b>" . (!empty($dateStr) ? " | Date: {$dateStr}" : "") . "\n\n";
                }
                $this->sendPreOrderMessage($chatId, $txt);
                return;
            }

            if ($data === 'about_us') {
                $aboutMsg = "☕ <b>Kaldi's Coffee Ethiopia</b>\n\n" .
                            "Bringing you premium freshly brewed coffee, delicious tortas, and pastries across Addis Ababa!\n\n" .
                            "Website: kaldisbunna.com";
                $this->sendPreOrderMessage($chatId, $aboutMsg);
                return;
            }
        }

        if ($state === 'fb_written') {
            $written = strtolower($text) === 'skip' ? null : $text;
            \App\Models\PreOrderFeedback::create([
                'chat_id' => $chatId,
                'branch_id' => $tempData['branch_id'] ?? null,
                'delivery_rating' => $tempData['delivery_rating'] ?? 5,
                'torta_rating' => $tempData['torta_rating'] ?? 5,
                'service_rating' => $tempData['service_rating'] ?? 5,
                'written_feedback' => $written,
            ]);

            \App\Models\TelegramCustomerState::updateOrCreate(['chat_id' => $chatId], ['state' => 'idle', 'temp_data' => []]);
            $this->sendPreOrderMessage($chatId, "✅ <b>Thank you!</b> Your feedback has been received and helps us serve you better.");
            return;
        }

        // Fallback for any unhandled message/greeting: display Pre-Order MiniApp main menu
        $pBot = TelegramBot::whereIn('slug', ['pre_order', 'pre-order', 'pre-order-bot'])->whereNotNull('webhook_url')->where('webhook_url', '!=', '')->first();
        $registeredWebhook = $pBot?->webhook_url ?? TelegramSettings::getInstance()->webhook_url;

        if (!empty($registeredWebhook) && str_starts_with($registeredWebhook, 'https://')) {
            $cleanDomain = preg_replace('#/api/telegram(/.*)?$#i', '', $registeredWebhook);
            $webAppUrl = "{$cleanDomain}/pre-orders/miniapp";
        } elseif (str_starts_with(config('app.url'), 'https://')) {
            $webAppUrl = config('app.url') . '/pre-orders/miniapp';
        } else {
            $webAppUrl = 'https://preorder.kaldisbunnaet.com/pre-orders/miniapp';
        }

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🍰 Order Tortas & Pastries', 'web_app' => ['url' => $webAppUrl]]
                ],
                [
                    ['text' => '⭐ Feedback', 'callback_data' => 'start_feedback'],
                    ['text' => '📦 My Orders', 'callback_data' => 'my_orders']
                ],
                [
                    ['text' => 'ℹ️ About Us', 'callback_data' => 'about_us']
                ]
            ]
        ];

        $firstName = !empty($from['first_name']) ? trim($from['first_name']) : 'there';
        $menuMsg = "🍰 <b>Kaldi's Coffee Pre-Order Bot</b>\n\nHello {$firstName}! Tap below to open our menu and place your pre-order:";
        $this->sendPreOrderMessage($chatId, $menuMsg, $keyboard);
    }
}
