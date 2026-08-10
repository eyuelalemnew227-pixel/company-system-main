<?php

namespace App\Http\Controllers;

use App\Models\WeeklyBudgetSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WeeklyBudgetPeriodController extends Controller
{
    /**
     * Display the settings form for Weekly Budget Periods.
     */
    public function index(): Response
    {
        abort_unless(auth()->user()->can('manage weekly budget periods'), 403);

        $setting = WeeklyBudgetSetting::first() ?? WeeklyBudgetSetting::create([
            'submission_deadline_day' => 'Friday',
            'is_urgent_enabled' => true,
        ]);

        return Inertia::render('weekly-budget-periods/Index', [
            'setting' => $setting,
        ]);
    }

    /**
     * Update the Weekly Budget Setting.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage weekly budget periods'), 403);

        $validated = $request->validate([
            'submission_deadline_day' => 'required|string|in:Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'is_urgent_enabled' => 'required|boolean',
        ]);

        $setting = WeeklyBudgetSetting::first();
        if ($setting) {
            $setting->update($validated);
        } else {
            WeeklyBudgetSetting::create($validated);
        }

        return redirect()->route('weekly-budget-periods.index')
            ->with('success', 'Weekly Budget settings updated successfully.');
    }
}
