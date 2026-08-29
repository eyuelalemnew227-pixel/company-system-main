<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeBadge;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LeaderboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $scope = $request->query('scope', 'company');
        $period = $request->query('period', 'alltime');
        $month = $request->query('month');

        $query = Employee::where('status', 'active');
        $scopeLabel = 'All Branches';

        if (in_array($scope, ['branch', 'department'], true)) {
            if (! $user->employee) {
                return Inertia::render('Leaderboard/Index', ['entries' => [], 'scope' => $scope, 'scopeLabel' => $scopeLabel, 'period' => $period, 'month' => $month]);
            }
            $emp = $user->employee->load(['branch', 'department']);
            if ($scope === 'branch' && $emp->branch_id) {
                $query->where('branch_id', $emp->branch_id);
                $scopeLabel = $emp->branch->name ?? 'Branch';
            } elseif ($scope === 'department' && $emp->department_id) {
                $query->where('department_id', $emp->department_id);
                $scopeLabel = $emp->department->name ?? 'Department';
            } else {
                $scope = 'company';
            }
        }

        if ($period === 'monthly' && $month) {
            [$yy, $mm] = array_map('intval', explode('-', $month) + [null, null]);
            if (! $yy || ! $mm) {
                abort(400, 'Invalid month format. Use YYYY-MM.');
            }
            $start = now()->setDate($yy, $mm, 1)->startOfDay();
            $end = (clone $start)->addMonthNoOverflow();

            $employeeIds = (clone $query)->pluck('id');

            $pts = [];
            EmployeeBadge::whereBetween('earned_at', [$start, $end])->whereIn('employee_id', $employeeIds)
                ->with('badge:id,points')->get()
                ->each(function ($b) use (&$pts) { $pts[$b->employee_id] = ($pts[$b->employee_id] ?? 0) + ($b->badge->points ?? 0); });

            QuizAttempt::whereBetween('created_at', [$start, $end])->whereIn('employee_id', $employeeIds)
                ->get(['employee_id', 'passed', 'score'])
                ->each(function ($q) use (&$pts) {
                    $add = ($q->passed ? 10 : 0) + min(50, (int) floor($q->score / 2));
                    $pts[$q->employee_id] = ($pts[$q->employee_id] ?? 0) + $add;
                });

            $employees = $query->with(['branch:id,name', 'department:id,name'])->get();
            $rows = $employees->map(fn (Employee $e) => ['employee' => $e, 'points' => $pts[$e->id] ?? 0])
                ->filter(fn ($r) => $r['points'] > 0)
                ->sortByDesc('points')
                ->values()
                ->take(50);

            $entries = $rows->map(fn ($r, $i) => $this->present($r['employee'], $r['points'], $i + 1, $user));

            return Inertia::render('Leaderboard/Index', [
                'entries' => $entries, 'scope' => $scope, 'scopeLabel' => $scopeLabel, 'period' => 'monthly', 'month' => $month,
            ]);
        }

        $employees = $query->with(['branch:id,name', 'department:id,name'])->orderByDesc('total_points')->limit(50)->get();
        $entries = $employees->values()->map(fn (Employee $e, $i) => $this->present($e, $e->total_points, $i + 1, $user));

        return Inertia::render('Leaderboard/Index', [
            'entries' => $entries, 'scope' => $scope, 'scopeLabel' => $scopeLabel, 'period' => 'alltime', 'month' => $month,
        ]);
    }

    private function present(Employee $e, int $points, int $rank, $user): array
    {
        return [
            'rank' => $rank,
            'employeeId' => $e->id,
            'name' => "{$e->first_name} {$e->last_name}",
            'firstName' => $e->first_name,
            'lastName' => $e->last_name,
            'branchName' => $e->branch->name ?? '—',
            'departmentName' => $e->department->name ?? '—',
            'points' => $points,
            'isCurrentUser' => $user->employee && $e->id === $user->employee->id,
        ];
    }
}
