<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\TelegramSettings;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBotService
{
    private function baseUrl(): ?string
    {
        $settings = TelegramSettings::getInstance();
        if (empty($settings->bot_token)) {
            return null;
        }

        return "https://api.telegram.org/bot{$settings->bot_token}";
    }

    /**
     * Create an HTTP client pending request with disabled SSL verification for local dev / self-signed certificate handling.
     */
    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withoutVerifying()->timeout(10);
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
     * Process incoming Telegram webhook updates.
     */
    public function handleWebhookUpdate(array $update): void
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

        if (str_starts_with($text, '/start') || str_starts_with($text, '/chatid') || str_starts_with($text, '/link')) {
            $parts = explode(' ', $text);
            $userIdToken = isset($parts[1]) ? trim($parts[1]) : null;

            if ($userIdToken && is_numeric($userIdToken)) {
                $user = User::find((int) $userIdToken);
                if ($user) {
                    $user->update([
                        'telegram_chat_id' => (string) $chatId,
                        'telegram_username' => $username,
                    ]);

                    $reply = "✅ <b>Account Linked Successfully!</b>\n\nHello <b>" . e($user->name) . "</b>, your Telegram account is now linked to receive real-time ticketing system notifications.";
                    $this->sendMessage($chatId, $reply);
                    return;
                }
            }

            // Check if chat_id already linked to any user
            $user = User::where('telegram_chat_id', (string) $chatId)->first();
            if ($user) {
                $reply = "👋 <b>Welcome back, " . e($user->name) . "!</b>\n\nYour Telegram account is active and receiving ticket notifications.\n\n<b>Your Chat ID:</b> <code>{$chatId}</code>";
            } else {
                $reply = "🤖 <b>Company System Bot</b>\n\nYour Telegram Chat ID is: <code>{$chatId}</code>\n\nTo link your account, please enter this Chat ID on your user profile or ask your Administrator to set it in System Administration > Telegram Config.";
            }

            $this->sendMessage($chatId, $reply);
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
    }
}
