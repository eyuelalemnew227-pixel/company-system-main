<?php

use App\Models\TelegramBot;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        TelegramBot::firstOrCreate(
            ['slug' => 'pre_order'],
            [
                'name' => 'Pre-Order Bot',
                'bot_username' => 'KaldisPreOrderBot',
                'bot_token' => env('TELEGRAM_PREORDER_BOT_TOKEN', null),
                'webhook_url' => url('/api/telegram/pre-order-webhook'),
                'is_active' => true,
                'description' => 'Official Telegram Bot for customer torta pre-orders, pickup branch selection, ratings & feedback.',
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        TelegramBot::where('slug', 'pre_order')->delete();
    }
};
