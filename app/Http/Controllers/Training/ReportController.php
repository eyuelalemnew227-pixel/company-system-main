<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Certificate;
use App\Models\Training\Course;
use App\Models\Training\Enrollment;
use App\Models\Training\QuizAttempt;
use App\Models\Training\SopAcknowledgement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        $courseCompletionRate = 0;
        $totalEnrollments = Enrollment::count();
        if ($totalEnrollments > 0) {
            $completedCount = Enrollment::where('status', 'completed')->count();
            $courseCompletionRate = (int) round(($completedCount / $totalEnrollments) * 100);
        }

        $quizPassRate = 0;
        $totalAttempts = QuizAttempt::count();
        if ($totalAttempts > 0) {
            $passedAttempts = QuizAttempt::where('passed', true)->count();
            $quizPassRate = (int) round(($passedAttempts / $totalAttempts) * 100);
        }

        $reportsSummary = [
            'total_courses' => Course::count(),
            'total_enrollments' => $totalEnrollments,
            'completion_rate' => $courseCompletionRate,
            'certificates_issued' => Certificate::count(),
            'quiz_pass_rate' => $quizPassRate,
            'sop_acknowledgements' => SopAcknowledgement::count(),
        ];

        $recentEnrollments = Enrollment::with(['employee.branch', 'employee.department', 'course'])
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('training/reports/index', [
            'summary' => $reportsSummary,
            'recentEnrollments' => $recentEnrollments,
        ]);
    }
}
