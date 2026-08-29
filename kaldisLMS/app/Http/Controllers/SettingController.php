<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function edit(Request $request): Response
    {
        Gate::authorize('permission', 'settings.manage');

        $settings = Setting::orderBy('group')->orderBy('key')->get()
            ->groupBy('group')
            ->map(fn ($rows) => $rows->map(fn (Setting $s) => [
                'key' => $s->key, 'value' => $s->value, 'type' => $s->type,
            ])->values());

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        Gate::authorize('permission', 'settings.manage');

        $data = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string'],
            'settings.*.value' => ['nullable'],
        ]);

        $updatedKeys = [];

        foreach ($data['settings'] as $item) {
            $key = $item['key'];
            $value = is_bool($item['value'] ?? null) ? ($item['value'] ? 'true' : 'false') : (string) ($item['value'] ?? '');

            $existing = Setting::where('key', $key)->first();

            if ($existing) {
                $existing->update(['value' => $value, 'updated_by' => $request->user()->id]);
            } else {
                Setting::create([
                    'group' => $this->guessGroup($key),
                    'key' => $key,
                    'value' => $value,
                    'type' => 'text',
                    'updated_by' => $request->user()->id,
                ]);
            }

            $updatedKeys[] = $key;
        }

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'update_settings',
            'module' => 'settings',
            'entity_type' => 'Setting',
            'new_value' => json_encode($updatedKeys),
        ]);

        return back()->with('success', 'Settings updated.');
    }

    private function guessGroup(string $key): string
    {
        return match (true) {
            str_starts_with($key, 'telegram') => 'telegram',
            in_array($key, ['logo_url', 'primary_color', 'accent_color']) || str_starts_with($key, 'branding') => 'branding',
            str_starts_with($key, 'points') || str_starts_with($key, 'gamification') => 'gamification',
            str_starts_with($key, 'lockout') || str_starts_with($key, 'session') || str_starts_with($key, 'security') || $key === 'twofa_enabled' => 'security',
            str_starts_with($key, 'smtp') || str_starts_with($key, 'email') || $key === 'from_address' => 'email',
            default => 'general',
        };
    }
}
