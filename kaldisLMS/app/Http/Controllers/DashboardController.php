<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Enrollment;
use App\Models\SopAcknowledgement;
use App\Models\SopDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Reuses the existing `report.view` permission (rather than a new
        // dashboard-specific one) to decide who gets the org-wide dashboard:
        // under current seed data that's admin/training_manager/coordinator,
        // matching who can already see aggregate reports.
        if ($user->hasPermission('report.view')) {
            return Inertia::render('Dashboard', $this->adminPayload());
        }

        return Inertia::render('Dashboard', $this->employeePayload($user->employee));
    }

    private function adminPayload(): array
    {
        $employees = Employee::where('status', 'active')->count();
        $courses = Course::where('status', 'published')->count();
        $branches = Branch::where('status', 'active')->count();
        $certs = Certificate::where('is_revoked', false)->count();
        $sopDocs = SopDocument::where('status', 'active')->where('requires_acknowledgement', true)->count();
        $sopAcks = SopAcknowledgement::count();

        $now = Carbon::now();

        $enrollmentTrend = $this->monthlyTrend(
            Enrollment::pluck('enrollment_date')->filter(),
            $now
        );

        $certTrend = $this->monthlyTrend(
            Certificate::pluck('issue_date')->filter(),
            $now
        );

        $branchComparison = Branch::orderBy('name')->get()->map(function (Branch $b) {
            $employeeIds = Employee::where('branch_id', $b->id)->pluck('id');

            return [
                'name' => $b->name,
                'employees' => Employee::where('branch_id', $b->id)->where('status', 'active')->count(),
                'enrollments' => Enrollment::whereIn('employee_id', $employeeIds)->count(),
                'completed' => Enrollment::whereIn('employee_id', $employeeIds)->where('status', 'completed')->count(),
            ];
        })->values();

        $deptHeatmap = Department::with('branch')->get()->take(8)->map(function (Department $d) {
            $employeeIds = Employee::where('department_id', $d->id)->pluck('id');
            $total = Enrollment::whereIn('employee_id', $employeeIds)->count();
            $done = Enrollment::whereIn('employee_id', $employeeIds)->where('status', 'completed')->count();

            return [
                'name' => "{$d->name} ({$d->branch?->code})",
                'total' => $total,
                'done' => $done,
                'rate' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
            ];
        })->values();

        $overdueEnrollments = Enrollment::with(['employee', 'course'])
            ->where('status', 'active')
            ->whereNotNull('deadline')
            ->where('deadline', '<', $now)
            ->take(5)
            ->get();

        $expiringCerts = Certificate::with(['employee', 'course'])
            ->where('is_revoked', false)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', $now->copy()->addDays(30))
            ->take(5)
            ->get();

        $complianceRate = $sopDocs > 0
            ? (int) round(($sopAcks / ($sopDocs * max($employees, 1))) * 100)
            : 100;

        return [
            'type' => 'admin',
            'kpis' => [
                'employees' => $employees,
                'courses' => $courses,
                'branches' => $branches,
                'certs' => $certs,
                'complianceRate' => min($complianceRate, 100),
            ],
            'enrollmentTrend' => $enrollmentTrend,
            'branchComparison' => $branchComparison,
            'deptHeatmap' => $deptHeatmap,
            'certTrend' => $certTrend,
            'alerts' => [
                'overdue' => $overdueEnrollments->map(fn (Enrollment $e) => [
                    'id' => $e->id,
                    'employee' => "{$e->employee->first_name} {$e->employee->last_name}",
                    'course' => $e->course->title,
                    'deadline' => $e->deadline,
                ])->values(),
                'expiringCerts' => $expiringCerts->map(fn (Certificate $c) => [
                    'id' => $c->id,
                    'employee' => "{$c->employee->first_name} {$c->employee->last_name}",
                    'course' => $c->course->title,
                    'expiry' => $c->expiry_date,
                    'number' => $c->certificate_number,
                ])->values(),
            ],
        ];
    }

    private function employeePayload(?Employee $emp): array
    {
        if (! $emp) {
            return [
                'type' => 'employee',
                'kpis' => ['streak' => 0, 'courses' => 0, 'certs' => 0, 'points' => 0],
                'continueLearning' => [],
                'deadlines' => [],
                'badges' => [],
                'rank' => null,
            ];
        }

        $emp->load([
            'streak',
            'badges' => fn ($q) => $q->with('badge')->orderByDesc('earned_at')->take(6),
            'enrollments' => fn ($q) => $q->with('course.lessons')->whereIn('status', ['active', 'completed']),
            'certificates' => fn ($q) => $q->where('is_revoked', false)->take(10),
        ]);

        $continueLearning = $emp->enrollments
            ->where('status', 'active')
            ->take(4)
            ->map(fn (Enrollment $e) => [
                'id' => $e->id,
                'courseId' => $e->course->id,
                'title' => $e->course->title,
                'progress' => $e->progress_percent,
                'thumbnail' => $e->course->thumbnail,
                'lessonsCount' => $e->course->lessons->count(),
                'deadline' => $e->deadline,
            ])->values();

        $deadlines = $emp->enrollments
            ->where('status', 'active')
            ->whereNotNull('deadline')
            ->sortBy('deadline')
            ->take(5)
            ->map(fn (Enrollment $e) => [
                'id' => $e->id,
                'course' => $e->course->title,
                'deadline' => $e->deadline,
            ])->values();

        $topEmployees = Employee::orderByDesc('total_points')->pluck('id')->values();
        $rank = $topEmployees->search($emp->id);

        return [
            'type' => 'employee',
            'kpis' => [
                'streak' => $emp->streak?->current_streak ?? 0,
                'longestStreak' => $emp->streak?->longest_streak ?? 0,
                'courses' => $emp->enrollments->count(),
                'completed' => $emp->enrollments->where('status', 'completed')->count(),
                'certs' => $emp->certificates->count(),
                'points' => $emp->total_points,
            ],
            'continueLearning' => $continueLearning,
            'deadlines' => $deadlines,
            'badges' => $emp->badges->map(fn ($b) => [
                'id' => $b->badge->id,
                'name' => $b->badge->name,
                'icon' => $b->badge->icon,
                'description' => $b->badge->description,
                'earnedAt' => $b->earned_at,
            ])->values(),
            'rank' => $rank === false ? null : $rank + 1,
            'totalRank' => $topEmployees->count(),
        ];
    }

    /** @param \Illuminate\Support\Collection<int, \Illuminate\Support\Carbon|string> $dates */
    private function monthlyTrend($dates, Carbon $now): array
    {
        $dates = $dates->map(fn ($d) => Carbon::parse($d));
        $months = [];

        for ($i = 5; $i >= 0; $i--) {
            $start = $now->copy()->startOfMonth()->subMonths($i);
            $end = $start->copy()->addMonth();
            $count = $dates->filter(fn (Carbon $d) => $d->gte($start) && $d->lt($end))->count();
            $months[] = ['label' => $start->format('M'), 'count' => $count];
        }

        return $months;
    }
}
