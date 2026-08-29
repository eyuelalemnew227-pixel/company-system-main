<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramSettings extends Model
{
    protected $fillable = [
        'bot_token',
        'bot_username',
        'helpdesk_bot_token',
        'helpdesk_bot_username',
        'budget_bot_token',
        'budget_bot_username',
        'memo_bot_token',
        'memo_bot_username',
        'pre_order_bot_token',
        'pre_order_bot_username',
        'training_bot_token',
        'training_bot_username',
        'pre_order_admin_group_chat_id',
        'webhook_url',
        'is_active',
        'parse_mode',
        'deactivation_reason',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the user who last updated the settings.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the singleton instance of Telegram settings.
     */
    public static function getInstance(): self
    {
        return self::firstOrCreate(
            ['id' => 1],
            [
                'bot_token' => config('services.telegram.bot_token') ?? env('TELEGRAM_BOT_TOKEN'),
                'helpdesk_bot_token' => env('TELEGRAM_HELPDESK_BOT_TOKEN', env('TELEGRAM_BOT_TOKEN')),
                'budget_bot_token' => env('TELEGRAM_BUDGET_BOT_TOKEN'),
                'memo_bot_token' => env('TELEGRAM_MEMO_BOT_TOKEN'),
                'bot_username' => null,
                'webhook_url' => null,
                'is_active' => true,
                'parse_mode' => 'HTML',
                'deactivation_reason' => null,
            ]
        );
    }

    /**
     * Check if Telegram notifications are active and token is present.
     */
    public static function isActive(): bool
    {
        $instance = self::getInstance();
        return $instance->is_active && (!empty($instance->bot_token) || !empty($instance->helpdesk_bot_token) || !empty($instance->memo_bot_token));
    }
}
