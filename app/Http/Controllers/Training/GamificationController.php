<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Badge;
use App\Models\Training\EmployeeBadge;
use App\Models\Training\Leaderboard;
use App\Models\Training\LearningStreak;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GamificationController extends Controller
{
    public function leaderboard(Request $request): Response
    {
        $leaderboard = Leaderboard::with(['employee.branch', 'employee.department'])
            ->orderBy('points', 'desc')
            ->paginate(20);

        return Inertia::render('training/leaderboard/index', [
            'leaderboard' => $leaderboard,
        ]);
    }

    public function badges(Request $request): Response
    {
        $badges = Badge::withCount('employeeBadges')->get();

        return Inertia::render('training/badges/index', [
            'badges' => $badges,
        ]);
    }

    public function storeBadge(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'icon' => 'required|string',
            'criteria_type' => 'required|in:first_course,courses_count,streak,score,branch_rank,sop_complete',
            'criteria_value' => 'integer|min:0',
            'points' => 'integer|min:0',
        ]);

        Badge::create($validated);

        return back()->with('success', 'Badge created successfully.');
    }
}
