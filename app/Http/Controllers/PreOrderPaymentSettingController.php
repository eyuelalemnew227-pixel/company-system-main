<?php

namespace App\Http\Controllers;

use App\Models\PreOrderPaymentSetting;
use App\Models\TelegramSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class PreOrderPaymentSettingController extends Controller
{
    public function index()
    {
        $settings = PreOrderPaymentSetting::orderBy('id')->get();
        $telegramSettings = TelegramSettings::getInstance();

        return Inertia::render('pre-orders/settings/payment-settings', [
            'paymentSettings' => $settings,
            'adminGroupChatId' => $telegramSettings->pre_order_admin_group_chat_id,
        ]);
    }

    public function updateAdminChatId(Request $request)
    {
        $validated = $request->validate([
            'pre_order_admin_group_chat_id' => 'nullable|string|max:255',
        ]);

        $telegramSettings = TelegramSettings::getInstance();
        $telegramSettings->update([
            'pre_order_admin_group_chat_id' => $validated['pre_order_admin_group_chat_id'],
        ]);

        return back()->with('success', 'Admin Telegram group chat ID updated successfully.');
    }

    public function update(Request $request, PreOrderPaymentSetting $preOrderPaymentSetting)
    {
        $validated = $request->validate([
            'account_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:255',
            'instructions' => 'nullable|string|max:1000',
            'validation_pattern' => 'nullable|string|max:255',
            'example' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        // Specific rule to ensure pattern is a valid regex
        if (!empty($validated['validation_pattern'])) {
            $isValidPattern = @preg_match('/' . $validated['validation_pattern'] . '/', '') !== false;
            if (!$isValidPattern) {
                return back()->withErrors(['validation_pattern' => 'The provided regex pattern is invalid.']);
            }
        }

        $preOrderPaymentSetting->update($validated);

        Cache::forget('miniapp_init_data');

        return back()->with('success', 'Payment setting updated successfully.');
    }
}
