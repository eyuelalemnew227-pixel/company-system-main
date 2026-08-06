<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramSettings extends Model
{
    protected $fillable = [
        'bot_token',
        'bot_username',
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
        $settings = self::getInstance();
        return $settings->is_active && !empty($settings->bot_token);
    }
}
