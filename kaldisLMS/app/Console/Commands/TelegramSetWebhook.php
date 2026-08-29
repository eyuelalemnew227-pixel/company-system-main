<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;

class TelegramSetWebhook extends Command
{
    protected $signature = 'telegram:set-webhook';

    protected $description = 'Register this app\'s webhook URL with Telegram (requires a public HTTPS URL — will not work against localhost).';

    public function handle(TelegramService $telegram): int
    {
        $secret = config('services.telegram.webhook_secret');
        if (! $secret) {
            $this->error('Set TELEGRAM_WEBHOOK_SECRET in .env first.');

            return self::FAILURE;
        }

        if (! $telegram->isConfigured()) {
            $this->error('Set the Telegram bot token in Settings (Telegram tab) first.');

            return self::FAILURE;
        }

        $url = rtrim(config('app.url'), '/')."/telegram/webhook/{$secret}";
        $result = $telegram->setWebhook($url, $secret);

        if ($result['ok'] ?? false) {
            $this->info("Webhook registered: {$url}");

            return self::SUCCESS;
        }

        $this->error('Failed to register webhook: '.($result['description'] ?? 'unknown error'));

        return self::FAILURE;
    }
}
