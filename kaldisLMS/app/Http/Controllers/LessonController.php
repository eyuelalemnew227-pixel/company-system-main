<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\CourseLesson;
use App\Models\Enrollment;
use App\Models\LessonProgress;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LessonController extends Controller
{
    public function show(Request $request, CourseLesson $lesson): Response
    {
        $user = $request->user();
        $lesson->load('course');
        $siblings = $lesson->course->lessons()->where('status', 'active')->orderBy('sort_order')->get();

        $progressMap = [];
        if ($user->employee) {
            $enrollment = Enrollment::where('course_id', $lesson->course_id)->where('employee_id', $user->employee->id)->first();
            if ($enrollment) {
                $progressMap = $enrollment->lessonProgress()->pluck('is_completed', 'lesson_id')->all();
            }
        }

        return Inertia::render('Lessons/Show', [
            'lesson' => [
                'id' => $lesson->id,
                'courseId' => $lesson->course_id,
                'title' => $lesson->title,
                'type' => $lesson->type,
                'content' => $lesson->content,
                'filePath' => $lesson->file_path,
                'durationMinutes' => $lesson->duration_minutes,
                'sortOrder' => $lesson->sort_order,
                'isDownloadable' => $lesson->is_downloadable,
                'completionCriteria' => $lesson->completion_criteria,
                'status' => $lesson->status,
                'siblings' => $siblings->map(fn (CourseLesson $s) => [
                    'id' => $s->id, 'title' => $s->title, 'type' => $s->type,
                    'durationMinutes' => $s->duration_minutes, 'sortOrder' => $s->sort_order, 'status' => $s->status,
                    'isCompleted' => (bool) ($progressMap[$s->id] ?? false),
                ]),
                'course' => ['id' => $lesson->course->id, 'title' => $lesson->course->title],
            ],
            'enrollmentId' => $user->employee
                ? optional(Enrollment::where('course_id', $lesson->course_id)->where('employee_id', $user->employee->id)->first())->id
                : null,
        ]);
    }

    public function complete(Request $request, CourseLesson $lesson)
    {
        $user = $request->user();
        abort_unless($user->employee, 403, 'Only employees can complete lessons.');

        $data = $request->validate(['enrollment_id' => ['required', 'exists:enrollments,id']]);

        $enrollment = Enrollment::with('lessonProgress')->findOrFail($data['enrollment_id']);
        abort_unless($enrollment->employee_id === $user->employee->id, 403, 'Enrollment does not belong to current user.');

        $existing = $enrollment->lessonProgress->firstWhere('lesson_id', $lesson->id);
        $wasCompleted = (bool) ($existing?->is_completed);

        LessonProgress::updateOrCreate(
            ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
            ['employee_id' => $user->employee->id, 'started_at' => $existing?->started_at ?? now(), 'completed_at' => now(), 'is_completed' => true]
        );

        $totalLessons = $lesson->course->lessons()->where('status', 'active')->count();
        $completedCount = LessonProgress::where('enrollment_id', $enrollment->id)->where('is_completed', true)->count();
        $progressPercent = $totalLessons > 0 ? (int) round($completedCount / $totalLessons * 100) : 0;

        $courseCompleted = false;
        if ($progressPercent >= 100 && $enrollment->status !== 'completed') {
            $enrollment->update(['progress_percent' => 100, 'status' => 'completed', 'completion_date' => now()]);
            $courseCompleted = true;
        } else {
            $enrollment->update(['progress_percent' => $progressPercent]);
        }

        $pointsAwarded = 0;
        if (! $wasCompleted) {
            $pointsAwarded = (int) (Setting::where('key', 'points_lesson_complete')->value('value') ?? 5);
            $user->employee->increment('total_points', $pointsAwarded);
            $this->bumpStreak($user->employee);

            ActivityLog::create([
                'user_id' => $user->id, 'action' => 'lesson.complete', 'module' => 'courses',
                'entity_type' => 'CourseLesson', 'entity_id' => $lesson->id,
                'new_value' => "{$lesson->title} (+{$pointsAwarded} pts)",
            ]);
        }

        $siblings = $lesson->course->lessons()->where('status', 'active')->orderBy('sort_order')->get(['id']);
        $idx = $siblings->search(fn ($s) => $s->id === $lesson->id);
        $nextLessonId = ($idx !== false && $idx < $siblings->count() - 1) ? $siblings[$idx + 1]->id : null;

        return response()->json([
            'progress' => $progressPercent,
            'completedLessons' => $completedCount,
            'totalLessons' => $totalLessons,
            'courseCompleted' => $courseCompleted,
            'pointsAwarded' => $pointsAwarded,
            'nextLessonId' => $nextLessonId,
        ]);
    }

    private function bumpStreak($employee): void
    {
        $today = now()->startOfDay();
        $streak = $employee->streak;

        if (! $streak) {
            $employee->streak()->create([
                'current_streak' => 1, 'longest_streak' => 1,
                'last_activity_date' => $today, 'total_days_active' => 1,
            ]);

            return;
        }

        $newCurrent = $streak->current_streak;
        if ($streak->last_activity_date) {
            $diffDays = $streak->last_activity_date->startOfDay()->diffInDays($today);
            if ($diffDays === 1) {
                $newCurrent++;
            } elseif ($diffDays > 1) {
                $newCurrent = 1;
            } else {
                $newCurrent = max($streak->current_streak, 1);
            }
        } else {
            $newCurrent = 1;
        }

        $streak->update([
            'current_streak' => $newCurrent,
            'longest_streak' => max($streak->longest_streak, $newCurrent),
            'last_activity_date' => $today,
            'total_days_active' => $streak->total_days_active + 1,
        ]);
    }
}
