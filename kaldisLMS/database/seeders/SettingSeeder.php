<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /** group, key, value, type — ported 1:1 from the Next.js app's prisma/seed.ts settings list. */
    private const SETTINGS = [
        ['general', 'company_name', "Kaldi's Coffee PLC", 'text'],
        ['general', 'company_name_am', 'ካልዲስ ቡና ኃላፊነት ድርጅት', 'text'],
        ['general', 'support_email', 'support@kaldiscoffee.com', 'text'],
        ['branding', 'logo_url', 'https://i.postimg.cc/63rKBrXh/kaldis-logo-png.jpg', 'text'],
        ['branding', 'primary_color', '#6F4E37', 'text'],
        ['branding', 'accent_color', '#C8973F', 'text'],
        ['telegram', 'bot_token', '', 'text'],
        ['telegram', 'bot_username', 'KaldiAcademyBot', 'text'],
        ['telegram', 'enabled', 'true', 'boolean'],
        ['gamification', 'points_lesson_complete', '5', 'number'],
        ['gamification', 'points_quiz_pass', '20', 'number'],
        ['gamification', 'points_perfect_score', '50', 'number'],
        ['gamification', 'points_course_complete', '100', 'number'],
        ['gamification', 'points_streak_7day', '30', 'number'],
        ['email', 'smtp_host', '', 'text'],
        ['email', 'smtp_port', '587', 'number'],
        ['email', 'from_address', 'noreply@kaldiscoffee.com', 'text'],
        ['security', 'lockout_threshold', '5', 'number'],
        ['security', 'lockout_duration_minutes', '30', 'number'],
        ['security', 'session_idle_timeout', '120', 'number'],
    ];

    public function run(): void
    {
        foreach (self::SETTINGS as [$group, $key, $value, $type]) {
            Setting::updateOrCreate(['key' => $key], ['group' => $group, 'value' => $value, 'type' => $type]);
        }
    }
}
