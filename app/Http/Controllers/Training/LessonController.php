<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Course;
use App\Models\Training\CourseLesson;
use App\Models\Training\Enrollment;
use App\Models\Training\LessonProgress;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LessonController extends Controller
{
    public function store(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:video,pdf,text,audio,gallery,ppt',
            'content' => 'nullable|string',
            'youtube_url' => 'nullable|url',
            'duration_minutes' => 'integer|min:0',
            'sort_order' => 'integer|min:0',
            'is_downloadable' => 'boolean',
            'completion_criteria' => 'required|in:view,time',
            'status' => 'required|in:active,inactive',
        ]);

        if (!empty($validated['youtube_url'])) {
            $validated['youtube_video_id'] = CourseLesson::parseYouTubeId($validated['youtube_url']);
        }

        $course->lessons()->create($validated);

        return back()->with('success', 'Lesson added successfully.');
    }

    public function show(CourseLesson $lesson, Request $request): Response
    {
        $course = $lesson->course->load('lessons');
        $employee = $request->user()->employee;
        $progress = null;
        $enrollment = null;

        if ($employee) {
            $enrollment = Enrollment::where('course_id', $course->id)
                ->where('employee_id', $employee->id)
                ->first();

            if ($enrollment) {
                $progress = LessonProgress::firstOrCreate([
                    'enrollment_id' => $enrollment->id,
                    'lesson_id' => $lesson->id,
                    'employee_id' => $employee->id,
                ], [
                    'started_at' => now(),
                ]);
            }
        }

        return Inertia::render('training/lessons/show', [
            'course' => $course,
            'lesson' => $lesson,
            'enrollment' => $enrollment,
            'progress' => $progress,
        ]);
    }

    public function complete(CourseLesson $lesson, Request $request): RedirectResponse
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return back()->with('error', 'Employee record not found.');
        }

        $enrollment = Enrollment::where('course_id', $lesson->course_id)
            ->where('employee_id', $employee->id)
            ->firstOrFail();

        $progress = LessonProgress::updateOrCreate([
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lesson->id,
            'employee_id' => $employee->id,
        ], [
            'is_completed' => true,
            'completed_at' => now(),
            'time_spent_seconds' => $request->input('time_spent', 60),
        ]);

        // Calculate enrollment total progress
        $totalLessons = $lesson->course->lessons()->where('status', 'active')->count();
        if ($totalLessons > 0) {
            $completedCount = LessonProgress::where('enrollment_id', $enrollment->id)
                ->where('is_completed', true)
                ->count();
            
            $progressPercent = (int) round(($completedCount / $totalLessons) * 100);
            
            $updateData = ['progress_percent' => $progressPercent];
            if ($progressPercent >= 100) {
                $updateData['status'] = 'completed';
                $updateData['completion_date'] = now();
            }

            $enrollment->update($updateData);
        }

        return back()->with('success', 'Lesson marked as completed!');
    }
}
