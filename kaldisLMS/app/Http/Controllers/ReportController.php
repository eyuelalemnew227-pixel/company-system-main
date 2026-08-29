<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseCategory;
use App\Models\Employee;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\SopDocument;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('permission', 'report.view');

        return Inertia::render('Reports/Index', [
            'canExport' => $request->user()->hasPermission('report.export'),
            'filterData' => [
                'branches' => Branch::orderBy('name')->get(['id', 'name']),
                'courses' => Course::orderBy('title')->get(['id', 'title']),
                'categories' => CourseCategory::orderBy('name')->get(['id', 'name', 'slug']),
                'quizzes' => Quiz::orderBy('title')->get(['id', 'title']),
                'sops' => SopDocument::orderBy('title')->get(['id', 'title']),
                'users' => User::orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    public function data(Request $request, string $type)
    {
        Gate::authorize('permission', 'report.view');

        $rows = match ($type) {
            'certificates' => $this->certificates($request),
            'course-completion' => $this->courseCompletion($request),
            'employee-learning' => $this->employeeLearning($request),
            'login-audit' => $this->loginAudit($request),
            'quiz-performance' => $this->quizPerformance($request),
            'sop-compliance' => $this->sopCompliance($request),
            'trainer-activity' => $this->trainerActivity($request),
        };

        return response()->json(['rows' => $rows]);
    }

    private function certificates(Request $request): array
    {
        $status = $request->query('status');
        $expiryFrom = $request->query('expiry_from');
        $expiryTo = $request->query('expiry_to');
        $now = Carbon::now();

        $query = Certificate::with(['employee:id,first_name,last_name', 'course:id,title']);

        if ($status === 'revoked') {
            $query->where('is_revoked', true);
        } elseif ($status === 'expired') {
            $query->where('is_revoked', false)->whereNotNull('expiry_date')->where('expiry_date', '<', $now);
        } elseif ($status === 'valid') {
            $query->where('is_revoked', false)
                ->where(fn ($q) => $q->whereNull('expiry_date')->orWhere('expiry_date', '>=', $now));
        }

        if ($expiryFrom) {
            $query->where('expiry_date', '>=', Carbon::parse($expiryFrom));
        }
        if ($expiryTo) {
            $query->where('expiry_date', '<=', Carbon::parse($expiryTo));
        }

        return $query->orderByDesc('issue_date')->get()->map(function (Certificate $c) use ($now) {
            $rowStatus = $c->is_revoked
                ? 'revoked'
                : ($c->expiry_date && $c->expiry_date->lt($now) ? 'expired' : 'valid');

            return [
                'id' => $c->id,
                'number' => $c->certificate_number,
                'employeeName' => "{$c->employee->first_name} {$c->employee->last_name}",
                'courseTitle' => $c->course->title,
                'issueDate' => $c->issue_date,
                'expiryDate' => $c->expiry_date,
                'status' => $rowStatus,
            ];
        })->values()->all();
    }

    private function courseCompletion(Request $request): array
    {
        $courseId = $request->query('course_id');
        $categorySlug = $request->query('category_slug');

        $query = Course::where('status', 'published')
            ->with(['category', 'enrollments:id,course_id,status,progress_percent', 'quizzes.attempts:id,quiz_id,score']);

        if ($courseId) {
            $query->where('id', $courseId);
        }
        if ($categorySlug) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $categorySlug));
        }

        return $query->orderBy('title')->get()->map(function (Course $c) {
            $enrolled = $c->enrollments->count();
            $completed = $c->enrollments->where('status', 'completed')->count();
            $allScores = $c->quizzes->flatMap->attempts->pluck('score');

            return [
                'courseId' => $c->id,
                'title' => $c->title,
                'category' => $c->category?->name,
                'enrolled' => $enrolled,
                'completed' => $completed,
                'completionRate' => $enrolled > 0 ? (int) round(($completed / $enrolled) * 100) : 0,
                'avgScore' => $allScores->count() > 0 ? round($allScores->avg(), 1) : null,
            ];
        })->values()->all();
    }

    private function employeeLearning(Request $request): array
    {
        $branchId = $request->query('branch_id');
        $departmentId = $request->query('department_id');
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        $query = Employee::where('status', 'active')
            ->with(['branch', 'department', 'enrollments' => function ($q) use ($fromDate, $toDate) {
                if ($fromDate) {
                    $q->where('enrollment_date', '>=', Carbon::parse($fromDate));
                }
                if ($toDate) {
                    $q->where('enrollment_date', '<=', Carbon::parse($toDate));
                }
            }]);

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        return $query->orderBy('first_name')->orderBy('last_name')->get()->map(function (Employee $e) {
            $progress = $e->enrollments->pluck('progress_percent');

            return [
                'employeeId' => $e->id,
                'name' => "{$e->first_name} {$e->last_name}",
                'branchName' => $e->branch?->name,
                'departmentName' => $e->department?->name,
                'coursesEnrolled' => $e->enrollments->count(),
                'coursesCompleted' => $e->enrollments->where('status', 'completed')->count(),
                'avgProgress' => $progress->count() > 0 ? round($progress->avg(), 1) : 0,
                'totalPoints' => $e->total_points,
            ];
        })->values()->all();
    }

    private function loginAudit(Request $request): array
    {
        $query = ActivityLog::with('user:id,name,email');

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }
        if ($fromDate = $request->query('from_date')) {
            $query->where('created_at', '>=', Carbon::parse($fromDate));
        }
        if ($toDate = $request->query('to_date')) {
            $query->where('created_at', '<=', Carbon::parse($toDate));
        }

        return $query->orderByDesc('created_at')->take(500)->get()->map(fn (ActivityLog $log) => [
            'id' => $log->id,
            'userId' => $log->user_id,
            'userName' => $log->user?->name,
            'userEmail' => $log->user?->email,
            'action' => $log->action,
            'module' => $log->module,
            'entityType' => $log->entity_type,
            'entityId' => $log->entity_id,
            'ipAddress' => $log->ip_address,
            'userAgent' => $log->user_agent,
            'createdAt' => $log->created_at,
        ])->values()->all();
    }

    private function quizPerformance(Request $request): array
    {
        $query = QuizAttempt::with(['employee', 'quiz:id,title,pass_mark']);

        if ($quizId = $request->query('quiz_id')) {
            $query->where('quiz_id', $quizId);
        }
        if ($minScore = $request->query('min_score')) {
            $query->where('score', '>=', (int) $minScore);
        }
        if ($maxScore = $request->query('max_score')) {
            $query->where('score', '<=', (int) $maxScore);
        }

        $grouped = $query->get()->groupBy(fn (QuizAttempt $a) => "{$a->employee_id}:{$a->quiz_id}");

        return $grouped->map(function ($attempts) {
            /** @var QuizAttempt $first */
            $first = $attempts->first();

            return [
                'employeeId' => $first->employee_id,
                'name' => "{$first->employee->first_name} {$first->employee->last_name}",
                'quizTitle' => $first->quiz->title,
                'attempts' => $attempts->count(),
                'bestScore' => $attempts->max('score'),
                'passed' => $attempts->contains(fn (QuizAttempt $a) => $a->passed),
                'lastAttempt' => $attempts->max('submitted_at'),
            ];
        })->sortBy('name')->values()->all();
    }

    private function sopCompliance(Request $request): array
    {
        $branchId = $request->query('branch_id');
        $sopId = $request->query('sop_id');

        $totalEmployees = Employee::where('status', 'active')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->count();

        $query = SopDocument::where('status', 'active')
            ->with(['acknowledgements' => function ($q) use ($branchId) {
                if ($branchId) {
                    $q->whereHas('employee', fn ($e) => $e->where('branch_id', $branchId));
                }
            }]);

        if ($sopId) {
            $query->where('id', $sopId);
        }

        return $query->orderBy('title')->get()->map(function (SopDocument $s) use ($totalEmployees) {
            $ackCount = $s->acknowledgements->count();

            return [
                'sopId' => $s->id,
                'title' => $s->title,
                'version' => $s->version,
                'totalEmployees' => $totalEmployees,
                'acknowledgedCount' => $ackCount,
                'complianceRate' => $totalEmployees > 0 ? min((int) round(($ackCount / $totalEmployees) * 100), 100) : 0,
            ];
        })->values()->all();
    }

    private function trainerActivity(Request $request): array
    {
        $trainerId = $request->query('trainer_id');
        $fromDate = $request->query('from_date') ? Carbon::parse($request->query('from_date')) : null;
        $toDate = $request->query('to_date') ? Carbon::parse($request->query('to_date')) : null;

        $dateScope = function ($q) use ($fromDate, $toDate) {
            if ($fromDate) {
                $q->where('created_at', '>=', $fromDate);
            }
            if ($toDate) {
                $q->where('created_at', '<=', $toDate);
            }
        };

        $trainers = User::when($trainerId, fn ($q) => $q->where('id', $trainerId))
            ->orderBy('name')
            ->get();

        $gradedMap = \App\Models\AssignmentSubmission::where('status', 'graded')
            ->whereNotNull('graded_by')
            ->when($trainerId, fn ($q) => $q->where('graded_by', $trainerId))
            ->when($fromDate, fn ($q) => $q->where('graded_at', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->where('graded_at', '<=', $toDate))
            ->selectRaw('graded_by, count(*) as cnt')
            ->groupBy('graded_by')
            ->pluck('cnt', 'graded_by');

        $rows = [];
        foreach ($trainers as $trainer) {
            $courses = Course::where('instructor_id', $trainer->id)->when($dateScope, $dateScope)->get(['id']);
            $courseIds = $courses->pluck('id');

            $lessonsCreated = $courseIds->isEmpty() ? 0 : \App\Models\CourseLesson::whereIn('course_id', $courseIds)->when($dateScope, $dateScope)->count();
            $quizzesCreated = $courseIds->isEmpty() ? 0 : Quiz::whereIn('course_id', $courseIds)->when($dateScope, $dateScope)->count();
            $assignmentsGraded = (int) ($gradedMap[$trainer->id] ?? 0);

            if ($courses->count() === 0 && $assignmentsGraded === 0) {
                continue;
            }

            $rows[] = [
                'trainerId' => $trainer->id,
                'name' => $trainer->name,
                'coursesCreated' => $courses->count(),
                'lessonsCreated' => $lessonsCreated,
                'quizzesCreated' => $quizzesCreated,
                'assignmentsGraded' => $assignmentsGraded,
            ];
        }

        return $rows;
    }
}
