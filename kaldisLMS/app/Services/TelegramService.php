<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    private function token(): ?string
    {
        $token = Setting::where('key', 'bot_token')->value('value');

        return $token !== '' ? $token : null;
    }

    public function isConfigured(): bool
    {
        return (bool) $this->token();
    }

    /**
     * @param  array<int, array<int, array{text: string, callback_data?: string}>>|null  $keyboard
     */
    public function sendMessage(string $chatId, string $text, ?array $keyboard = null): bool
    {
        $token = $this->token();
        if (! $token) {
            Log::warning('Telegram sendMessage skipped: bot_token not configured.');

            return false;
        }

        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ];

        if ($keyboard) {
            $payload['reply_markup'] = json_encode(['keyboard' => $keyboard, 'resize_keyboard' => true]);
        }

        $response = Http::timeout(15)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);

        if ($response->failed()) {
            Log::warning('Telegram sendMessage failed', ['response' => $response->json()]);
        }

        return $response->successful();
    }

    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null): void
    {
        $token = $this->token();
        if (! $token) {
            return;
        }

        Http::timeout(15)->post("https://api.telegram.org/bot{$token}/answerCallbackQuery", array_filter([
            'callback_query_id' => $callbackQueryId,
            'text' => $text,
        ]));
    }

    public function setWebhook(string $url, ?string $secretToken = null): array
    {
        $token = $this->token();
        if (! $token) {
            return ['ok' => false, 'description' => 'bot_token not configured'];
        }

        $response = Http::timeout(15)->post("https://api.telegram.org/bot{$token}/setWebhook", array_filter([
            'url' => $url,
            'secret_token' => $secretToken,
        ]));

        return $response->json() ?? ['ok' => false];
    }
}
