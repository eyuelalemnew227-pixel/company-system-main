<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyLearningController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $status = $request->query('status', 'active');

        $items = [];
        if ($user->employee) {
            $query = Enrollment::where('employee_id', $user->employee->id)
                ->with(['course.category', 'course.instructor', 'course' => fn ($q) => $q, 'lessonProgress'])
                ->orderBy('status')
                ->orderByDesc('enrollment_date');

            if (in_array($status, ['active', 'completed'], true)) {
                $query->where('status', $status);
            }

            $items = $query->get()->map(function (Enrollment $e) {
                $totalLessons = $e->course->lessons()->where('status', 'active')->count();
                $completedLessons = $e->lessonProgress->where('is_completed', true)->count();
                $progress = $totalLessons > 0 ? (int) round($completedLessons / $totalLessons * 100) : $e->progress_percent;

                return [
                    'id' => $e->id,
                    'status' => $e->status,
                    'progressPercent' => $progress,
                    'enrollmentDate' => $e->enrollment_date,
                    'deadline' => $e->deadline,
                    'completionDate' => $e->completion_date,
                    'completedLessons' => $completedLessons,
                    'totalLessons' => $totalLessons,
                    'course' => [
                        'id' => $e->course->id, 'title' => $e->course->title, 'slug' => $e->course->slug,
                        'description' => $e->course->description, 'thumbnail' => $e->course->thumbnail,
                        'difficulty' => $e->course->difficulty, 'durationHours' => $e->course->duration_hours,
                        'isMandatory' => $e->course->is_mandatory,
                        'category' => $e->course->category ? ['id' => $e->course->category->id, 'name' => $e->course->category->name, 'slug' => $e->course->category->slug] : null,
                        'instructor' => $e->course->instructor ? ['id' => $e->course->instructor->id, 'name' => $e->course->instructor->name] : null,
                    ],
                ];
            });
        }

        return Inertia::render('MyLearning/Index', [
            'enrollments' => $items,
            'status' => $status,
        ]);
    }
}
