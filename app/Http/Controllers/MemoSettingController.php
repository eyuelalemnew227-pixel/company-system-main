<?php

namespace App\Http\Controllers;

use App\Models\MemoSetting;
use App\Models\TelegramSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MemoSettingController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user->hasRole(['Super Admin', 'Admin'])) {
            // Non-admins view settings
        }

        $settings = MemoSetting::all()->pluck('setting_value', 'setting_key')->toArray();
        $telegramInstance = TelegramSettings::getInstance();

        // Defaults
        $defaults = [
            'COMPANY_NAME' => "KALDI'S COFFEE P.L.C.",
            'COMPANY_LOGO_URL' => '/images/logo.png',
            'MEMO_PREFIX' => 'KCM',
            'DEFAULT_SIGNATURE_TYPE' => 'typed',
            'TELEGRAM_ENABLED' => 'true',
        ];

        $mergedSettings = array_merge($defaults, $settings);

        return Inertia::render('memos/settings', [
            'settings' => $mergedSettings,
            'telegramInfo' => [
                'is_active' => $telegramInstance->is_active && !empty($telegramInstance->bot_token),
                'bot_username' => $telegramInstance->bot_username ?? 'Configured',
                'parse_mode' => $telegramInstance->parse_mode ?? 'HTML',
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasRole(['Super Admin', 'Admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'COMPANY_NAME' => 'required|string|max:255',
            'COMPANY_LOGO_URL' => 'nullable|string|max:500',
            'MEMO_PREFIX' => 'required|string|max:20',
            'DEFAULT_SIGNATURE_TYPE' => 'required|string|in:typed,drawn',
            'TELEGRAM_ENABLED' => 'required|string|in:true,false',
        ]);

        foreach ($validated as $key => $value) {
            MemoSetting::setValue($key, $value, null, 'General', $user->name);
        }

        return back()->with('success', 'Internal Memorandum settings updated successfully.');
    }
}
