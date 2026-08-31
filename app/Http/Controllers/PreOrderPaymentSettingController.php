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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'payment_method' => 'required|string|max:255|unique:pre_order_payment_settings',
            'account_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:255',
            'instructions' => 'nullable|string|max:1000',
            'payment_type' => 'required|string|max:255',
            'validation_type' => 'required|string|max:255',
            'validation_pattern' => 'nullable|string|max:255',
            'example' => 'nullable|string|max:255',
            'reference_prefix' => 'nullable|string|max:255',
            'auto_fill_prefix' => 'boolean',
            'reference_length' => 'nullable|integer|min:1',
            'reference_required' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validated['validation_type'] === 'Regex Validation' && !empty($validated['validation_pattern'])) {
            $isValidPattern = @preg_match('/' . $validated['validation_pattern'] . '/', '') !== false;
            if (!$isValidPattern) {
                return back()->withErrors(['validation_pattern' => 'The provided regex pattern is invalid.']);
            }
        }

        PreOrderPaymentSetting::create($validated);

        return back()->with('success', 'Payment setting created successfully.');
    }

    public function update(Request $request, PreOrderPaymentSetting $preOrderPaymentSetting)
    {
        $validated = $request->validate([
            'payment_method' => 'required|string|max:255|unique:pre_order_payment_settings,payment_method,' . $preOrderPaymentSetting->id,
            'account_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:255',
            'instructions' => 'nullable|string|max:1000',
            'payment_type' => 'required|string|max:255',
            'validation_type' => 'required|string|max:255',
            'validation_pattern' => 'nullable|string|max:255',
            'example' => 'nullable|string|max:255',
            'reference_prefix' => 'nullable|string|max:255',
            'auto_fill_prefix' => 'boolean',
            'reference_length' => 'nullable|integer|min:1',
            'reference_required' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validated['validation_type'] === 'Regex Validation' && !empty($validated['validation_pattern'])) {
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
