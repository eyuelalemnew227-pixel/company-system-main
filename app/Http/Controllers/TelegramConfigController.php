<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\TelegramSettings;
use App\Models\User;
use App\Services\TelegramBotService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TelegramConfigController extends Controller
{
    public function index(TelegramBotService $botService): Response
    {
        if (!auth()->user()->can('view telegram config')) {
            abort(403, 'You do not have permission to view Telegram configuration.');
        }

        $settings = TelegramSettings::getInstance();
        $settings->load('updater');

        $botInfo = $botService->getMe();
        $webhookInfo = $botService->getWebhookInfo();

        $users = User::with(['employee.department', 'roles'])
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

        return Inertia::render('telegram-config/index', [
            'settings' => $settings,
            'botInfo' => $botInfo,
            'webhookInfo' => $webhookInfo,
            'users' => $users,
            'branches' => $branches,
            'defaultWebhookUrl' => $defaultWebhookUrl,
            'userPermissions' => auth()->user()->getAllPermissions()->pluck('name')->toArray(),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        if (!auth()->user()->can('manage telegram config')) {
            abort(403, 'You do not have permission to manage Telegram configuration.');
        }

        $validated = $request->validate([
            'bot_token' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
            'parse_mode' => ['required', 'string', 'in:HTML,Markdown,MarkdownV2'],
            'deactivation_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $settings = TelegramSettings::getInstance();
        $settings->update([
            'bot_token' => $validated['bot_token'],
            'is_active' => $validated['is_active'],
            'parse_mode' => $validated['parse_mode'],
            'deactivation_reason' => $validated['is_active'] ? null : ($validated['deactivation_reason'] ?? 'Disabled by administrator'),
            'updated_by' => auth()->id(),
        ]);

        return redirect()->back()->with('success', 'Telegram settings updated successfully.');
    }

    public function setWebhook(Request $request, TelegramBotService $botService): RedirectResponse
    {
        if (!auth()->user()->can('manage telegram config')) {
            abort(403, 'You do not have permission to manage Telegram webhook.');
        }

        $validated = $request->validate([
            'webhook_url' => ['required', 'url', 'max:500'],
        ]);

        $result = $botService->setWebhook($validated['webhook_url']);

        if ($result['ok'] ?? false) {
            return redirect()->back()->with('success', 'Webhook registered with Telegram successfully!');
        }

        $error = $result['description'] ?? $result['error'] ?? 'Failed to set webhook.';
        if (str_contains(strtolower($error), 'https')) {
            $error = 'Telegram requires a secure HTTPS URL. Local HTTP URLs (e.g., http://localhost) cannot be registered with Telegram. Please use an HTTPS domain or ngrok tunnel for webhook updates.';
        }

        return redirect()->back()->withErrors(['webhook_url' => $error]);
    }

    public function removeWebhook(TelegramBotService $botService): RedirectResponse
    {
        if (!auth()->user()->can('manage telegram config')) {
            abort(403, 'You do not have permission to manage Telegram webhook.');
        }

        $result = $botService->deleteWebhook();

        if ($result['ok'] ?? false) {
            return redirect()->back()->with('success', 'Webhook removed successfully.');
        }

        $error = $result['description'] ?? $result['error'] ?? 'Failed to remove webhook.';
        return redirect()->back()->withErrors(['webhook_url' => $error]);
    }

    public function sendTestMessage(Request $request, TelegramBotService $botService): RedirectResponse
    {
        if (!auth()->user()->can('manage telegram config')) {
            abort(403, 'You do not have permission to send test messages.');
        }

        $validated = $request->validate([
            'chat_id' => ['required', 'string'],
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $success = $botService->sendMessage($validated['chat_id'], "🧪 <b>TEST MESSAGE</b>\n\n" . e($validated['message']));

        if ($success) {
            return redirect()->back()->with('success', 'Test message sent successfully via Telegram!');
        }

        return redirect()->back()->withErrors(['chat_id' => 'Failed to send test message. Check Chat ID or Bot Token.']);
    }

    public function updateUserChatId(Request $request, User $user): RedirectResponse
    {
        if (!auth()->user()->can('manage telegram config')) {
            abort(403, 'You do not have permission to edit user Telegram details.');
        }

        $validated = $request->validate([
            'telegram_chat_id' => ['nullable', 'string', 'max:100'],
            'telegram_username' => ['nullable', 'string', 'max:100'],
        ]);

        $user->update([
            'telegram_chat_id' => $validated['telegram_chat_id'],
            'telegram_username' => $validated['telegram_username'],
        ]);

        return redirect()->back()->with('success', "Telegram details updated for user {$user->name}.");
    }

    public function updateBranchChatId(Request $request, Branch $branch): RedirectResponse
    {
        if (!auth()->user()->can('manage telegram config')) {
            abort(403, 'You do not have permission to edit branch Telegram details.');
        }

        $validated = $request->validate([
            'telegram_chat_id' => ['nullable', 'string', 'max:100'],
        ]);

        $branch->update([
            'telegram_chat_id' => $validated['telegram_chat_id'],
        ]);

        return redirect()->back()->with('success', "Telegram details updated for branch {$branch->name}.");
    }
}
