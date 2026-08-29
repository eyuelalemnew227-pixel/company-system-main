<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Certificate;
use App\Models\Training\EmployeeBadge;
use App\Models\Training\Enrollment;
use App\Models\Training\LearningStreak;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyLearningController extends Controller
{
    public function index(Request $request): Response
    {
        $employee = $request->user()->employee;

        if (!$employee) {
            return Inertia::render('training/my-learning/index', [
                'enrollments' => [],
                'certificates' => [],
                'badges' => [],
                'streak' => null,
                'notice' => 'No employee profile linked to user.',
            ]);
        }

        $enrollments = Enrollment::with(['course.category', 'course.lessons'])
            ->where('employee_id', $employee->id)
            ->latest()
            ->get();

        $certificates = Certificate::with(['course'])
            ->where('employee_id', $employee->id)
            ->where('is_revoked', false)
            ->latest()
            ->get();

        $badges = EmployeeBadge::with(['badge', 'course'])
            ->where('employee_id', $employee->id)
            ->latest()
            ->get();

        $streak = LearningStreak::where('employee_id', $employee->id)->first();

        return Inertia::render('training/my-learning/index', [
            'enrollments' => $enrollments,
            'certificates' => $certificates,
            'badges' => $badges,
            'streak' => $streak,
        ]);
    }
}
