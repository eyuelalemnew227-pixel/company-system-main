<?php

namespace App\Http\Controllers;

use App\Models\Badge;
use App\Models\Employee;
use App\Models\EmployeeBadge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BadgeController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $badges = Badge::orderByDesc('points')->get();

        $earnedMap = [];
        $metrics = [
            'completedCourses' => 0, 'longestStreak' => 0, 'ackedSops' => 0,
            'activeSops' => 0, 'perfectScoreQuiz' => false, 'firstLessonDone' => false, 'branchRank' => null,
        ];

        if ($user->employee) {
            $employee = $user->employee;
            $earnedMap = EmployeeBadge::where('employee_id', $employee->id)->pluck('earned_at', 'badge_id')->all();

            $metrics['completedCourses'] = $employee->enrollments()->where('status', 'completed')->count();
            $metrics['longestStreak'] = optional($employee->streak)->longest_streak ?? 0;
            $metrics['ackedSops'] = $employee->sopAcknowledgements()->count();
            $metrics['activeSops'] = \App\Models\SopDocument::where('status', 'active')->where('requires_acknowledgement', true)->count();
            $metrics['perfectScoreQuiz'] = $employee->quizAttempts()->where('score', 100)->exists();
            $metrics['firstLessonDone'] = $employee->enrollments()->whereHas('lessonProgress', fn ($q) => $q->where('is_completed', true))->exists();

            if ($employee->branch_id) {
                $branchEmployees = Employee::where('branch_id', $employee->branch_id)->orderByDesc('total_points')->pluck('id')->values();
                $idx = $branchEmployees->search($employee->id);
                $metrics['branchRank'] = $idx !== false ? $idx + 1 : null;
            }
        }

        $result = $badges->map(function (Badge $b) use ($earnedMap, $metrics) {
            $earned = array_key_exists($b->id, $earnedMap);
            $progress = null;
            $progressHint = '';

            switch ($b->criteria_type) {
                case 'courses_count':
                    $progress = ['current' => min($metrics['completedCourses'], $b->criteria_value), 'target' => $b->criteria_value];
                    $progressHint = "{$metrics['completedCourses']}/{$b->criteria_value} courses";
                    break;
                case 'streak':
                    $progress = ['current' => min($metrics['longestStreak'], $b->criteria_value), 'target' => $b->criteria_value];
                    $progressHint = "{$metrics['longestStreak']}/{$b->criteria_value} day streak";
                    break;
                case 'sop_complete':
                    $target = max($metrics['activeSops'], 1);
                    $progress = ['current' => min($metrics['ackedSops'], $target), 'target' => $target];
                    $progressHint = "{$metrics['ackedSops']}/{$metrics['activeSops']} SOPs";
                    break;
                case 'first_course':
                    $progress = ['current' => $metrics['firstLessonDone'] ? 1 : 0, 'target' => 1];
                    $progressHint = $metrics['firstLessonDone'] ? 'Done' : '0/1 lesson';
                    break;
                case 'score':
                    $progress = ['current' => $metrics['perfectScoreQuiz'] ? 100 : 0, 'target' => $b->criteria_value];
                    $progressHint = $metrics['perfectScoreQuiz'] ? 'Earned' : 'Not yet';
                    break;
                case 'branch_rank':
                    $progress = ['current' => $metrics['branchRank'] ?? 0, 'target' => $b->criteria_value];
                    $progressHint = $metrics['branchRank'] ? "Currently #{$metrics['branchRank']}" : 'No rank yet';
                    break;
            }

            return [
                'id' => $b->id, 'name' => $b->name, 'description' => $b->description, 'icon' => $b->icon,
                'criteriaType' => $b->criteria_type, 'criteriaValue' => $b->criteria_value, 'points' => $b->points,
                'earned' => $earned, 'earnedAt' => $earnedMap[$b->id] ?? null,
                'progress' => $progress, 'progressHint' => $progressHint,
            ];
        });

        return Inertia::render('Badges/Index', [
            'badges' => $result,
            'canManage' => $user->hasPermission('badge.manage'),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'badge.manage');

        $data = $request->validate([
            'name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'icon' => ['nullable', 'string'],
            'criteria_type' => ['required', 'string'],
            'criteria_value' => ['nullable', 'integer'],
            'points' => ['nullable', 'integer'],
        ]);

        Badge::create([
            'name' => trim($data['name']),
            'description' => trim($data['description']),
            'icon' => $data['icon'] ?? '🏅',
            'criteria_type' => $data['criteria_type'],
            'criteria_value' => $data['criteria_value'] ?? 0,
            'points' => $data['points'] ?? 0,
        ]);

        return back()->with('success', 'Badge created.');
    }
}
