<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Certificate;
use App\Models\Training\Course;
use App\Models\Training\Enrollment;
use App\Models\Training\Leaderboard;
use App\Models\Training\SopDocument;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrainingDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $employee = $user->employee;

        $stats = [
            'total_courses' => Course::where('status', 'published')->count(),
            'total_enrollments' => Enrollment::count(),
            'completed_courses' => Enrollment::where('status', 'completed')->count(),
            'total_certificates' => Certificate::count(),
            'pending_sops' => SopDocument::where('status', 'active')->count(),
        ];

        $myEnrollments = [];
        if ($employee) {
            $myEnrollments = Enrollment::with(['course.category'])
                ->where('employee_id', $employee->id)
                ->latest()
                ->take(5)
                ->get();
        }

        $topLeaderboard = Leaderboard::with(['employee.branch', 'employee.department'])
            ->orderBy('rank', 'asc')
            ->take(5)
            ->get();

        $featuredCourses = Course::with(['category', 'lessons'])
            ->where('status', 'published')
            ->where('is_featured', true)
            ->take(4)
            ->get();

        return Inertia::render('training/index', [
            'stats' => $stats,
            'myEnrollments' => $myEnrollments,
            'topLeaderboard' => $topLeaderboard,
            'featuredCourses' => $featuredCourses,
        ]);
    }
}
