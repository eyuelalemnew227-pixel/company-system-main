<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Course;
use App\Models\CourseCategory;
use App\Models\CourseLesson;
use App\Models\Enrollment;
use App\Models\LessonProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Course::query()
            ->where('status', 'published')
            ->with(['category', 'instructor'])
            ->withCount(['lessons' => fn ($q) => $q->where('status', 'active')])
            ->orderByDesc('is_featured')
            ->orderByDesc('published_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%");
            });
        }
        if ($category = $request->query('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $category));
        }
        if ($difficulty = $request->query('difficulty')) {
            $query->where('difficulty', $difficulty);
        }

        $courses = $query->get();

        $enrollments = $user->employee
            ? Enrollment::where('employee_id', $user->employee->id)
                ->whereIn('course_id', $courses->pluck('id'))
                ->get()
                ->keyBy('course_id')
            : collect();

        return Inertia::render('Courses/Index', [
            'courses' => $courses->map(fn (Course $c) => $this->presentListItem($c, $enrollments->get($c->id))),
            'categories' => CourseCategory::orderBy('name')->get(['id', 'name', 'slug', 'icon']),
            'filters' => $request->only(['search', 'category', 'difficulty']),
            'canCreate' => $user->hasPermission('course.create'),
        ]);
    }

    public function show(Request $request, Course $course): Response
    {
        $user = $request->user();

        if ($course->status !== 'published' && ! $user->hasPermission('course.edit')) {
            abort(404);
        }

        $course->load(['category', 'instructor', 'certificateTemplate', 'quizzes' => fn ($q) => $q->orderBy('created_at')]);
        $lessons = $course->lessons()->orderBy('sort_order')->get();

        $enrollment = null;
        if ($user->employee) {
            $e = Enrollment::with('lessonProgress')->where('course_id', $course->id)->where('employee_id', $user->employee->id)->first();
            if ($e) {
                $enrollment = [
                    'id' => $e->id,
                    'status' => $e->status,
                    'progressPercent' => $e->progress_percent,
                    'deadline' => $e->deadline,
                    'completionDate' => $e->completion_date,
                    'enrolledAt' => $e->enrollment_date,
                    'completedLessons' => $e->lessonProgress->where('is_completed', true)->count(),
                    'totalLessons' => $lessons->count(),
                    'lessonProgress' => $e->lessonProgress->map(fn (LessonProgress $lp) => [
                        'lessonId' => $lp->lesson_id,
                        'isCompleted' => $lp->is_completed,
                        'completedAt' => $lp->completed_at,
                    ]),
                ];
            }
        }

        return Inertia::render('Courses/Show', [
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
                'slug' => $course->slug,
                'description' => $course->description,
                'thumbnail' => $course->thumbnail,
                'durationHours' => $course->duration_hours,
                'difficulty' => $course->difficulty,
                'passingScore' => $course->passing_score,
                'isFeatured' => $course->is_featured,
                'isMandatory' => $course->is_mandatory,
                'enrollmentType' => $course->enrollment_type,
                'maxAttempts' => $course->max_attempts,
                'deadlineDays' => $course->deadline_days,
                'status' => $course->status,
                'publishedAt' => $course->published_at,
                'category' => $course->category,
                'instructor' => $course->instructor ? ['id' => $course->instructor->id, 'name' => $course->instructor->name, 'email' => $course->instructor->email] : null,
                'certificateTemplate' => $course->certificateTemplate ? ['id' => $course->certificateTemplate->id, 'name' => $course->certificateTemplate->name] : null,
                'hasCertificate' => (bool) $course->certificate_template_id,
                'lessons' => $lessons->map(fn (CourseLesson $l) => [
                    'id' => $l->id, 'title' => $l->title, 'type' => $l->type, 'content' => $l->content,
                    'filePath' => $l->file_path, 'durationMinutes' => $l->duration_minutes, 'sortOrder' => $l->sort_order,
                    'isDownloadable' => $l->is_downloadable, 'status' => $l->status,
                ]),
                'quizzes' => $course->quizzes->map(fn ($q) => [
                    'id' => $q->id, 'title' => $q->title, 'timeLimitMinutes' => $q->time_limit_minutes,
                    'passMark' => $q->pass_mark, 'maxAttempts' => $q->max_attempts, 'status' => $q->status,
                ]),
                'enrollment' => $enrollment,
            ],
            'canEdit' => $user->hasPermission('course.edit'),
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('permission', 'course.create');

        return Inertia::render('Courses/Builder', [
            'course' => null,
            'lessons' => [],
            'categories' => CourseCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function edit(Request $request, Course $course): Response
    {
        if (! $request->user()->hasPermission('course.create') && ! $request->user()->hasPermission('course.edit')) {
            abort(403);
        }

        return Inertia::render('Courses/Builder', [
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'categoryId' => $course->category_id,
                'difficulty' => $course->difficulty,
                'durationHours' => $course->duration_hours,
                'passingScore' => $course->passing_score,
                'isFeatured' => $course->is_featured,
                'isMandatory' => $course->is_mandatory,
                'status' => $course->status,
                'enrollmentType' => $course->enrollment_type,
                'maxAttempts' => $course->max_attempts,
                'deadlineDays' => $course->deadline_days,
            ],
            'lessons' => $course->lessons()->orderBy('sort_order')->get()->map(fn (CourseLesson $l) => [
                'id' => $l->id, 'title' => $l->title, 'type' => $l->type, 'content' => $l->content,
                'durationMinutes' => $l->duration_minutes, 'sortOrder' => $l->sort_order, 'isDownloadable' => $l->is_downloadable,
            ]),
            'categories' => CourseCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'course.create');

        $data = $this->validated($request);

        $course = DB::transaction(function () use ($data, $request) {
            $course = Course::create([
                ...$data['course'],
                'slug' => $this->uniqueSlug(Str::slug($data['course']['title'])),
                'instructor_id' => $request->user()->id,
                'published_at' => $data['course']['status'] === 'published' ? now() : null,
            ]);
            $this->syncLessons($course, $data['lessons']);

            ActivityLog::create([
                'user_id' => $request->user()->id, 'action' => 'course.create', 'module' => 'courses',
                'entity_type' => 'Course', 'entity_id' => $course->id, 'new_value' => $course->title,
            ]);

            return $course;
        });

        return redirect()->route('courses.show', $course)->with('success', 'Course created.');
    }

    public function update(Request $request, Course $course)
    {
        Gate::authorize('permission', 'course.edit');

        $data = $this->validated($request);
        $wasPublished = $course->status === 'published';
        $willPublish = $data['course']['status'] === 'published';

        DB::transaction(function () use ($course, $data, $wasPublished, $willPublish) {
            $course->update([
                ...$data['course'],
                'published_at' => ! $wasPublished && $willPublish ? now() : $course->published_at,
            ]);
            $this->syncLessons($course, $data['lessons']);
        });

        return redirect()->route('courses.show', $course)->with('success', 'Course updated.');
    }

    public function destroy(Request $request, Course $course)
    {
        Gate::authorize('permission', 'course.delete');

        $course->delete();

        return redirect()->route('courses.index')->with('success', 'Course deleted.');
    }

    public function enroll(Request $request, Course $course)
    {
        $user = $request->user();
        abort_unless($user->employee, 403, 'Only employees can enroll in courses.');
        abort_unless($course->status === 'published', 400, 'Course is not available for enrollment.');

        $employee = $user->employee;
        $lessons = $course->lessons()->where('status', 'active')->get(['id']);

        $enrollment = Enrollment::firstOrCreate(
            ['course_id' => $course->id, 'employee_id' => $employee->id],
            [
                'enrolled_by' => $user->id,
                'deadline' => $course->deadline_days > 0 ? now()->addDays($course->deadline_days) : null,
                'status' => 'active',
                'progress_percent' => 0,
            ]
        );

        foreach ($lessons as $lesson) {
            LessonProgress::firstOrCreate(
                ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
                ['employee_id' => $employee->id, 'started_at' => now(), 'is_completed' => false]
            );
        }

        ActivityLog::create([
            'user_id' => $user->id, 'action' => 'course.enroll', 'module' => 'courses',
            'entity_type' => 'Enrollment', 'entity_id' => $enrollment->id, 'new_value' => $course->title,
        ]);

        return back()->with('success', 'Enrolled successfully!');
    }

    private function presentListItem(Course $c, ?Enrollment $enrollment): array
    {
        return [
            'id' => $c->id, 'title' => $c->title, 'slug' => $c->slug, 'description' => $c->description,
            'thumbnail' => $c->thumbnail, 'durationHours' => $c->duration_hours, 'difficulty' => $c->difficulty,
            'isFeatured' => $c->is_featured, 'isMandatory' => $c->is_mandatory, 'deadlineDays' => $c->deadline_days,
            'publishedAt' => $c->published_at,
            'category' => $c->category ? ['id' => $c->category->id, 'name' => $c->category->name, 'slug' => $c->category->slug, 'icon' => $c->category->icon] : null,
            'instructor' => $c->instructor ? ['id' => $c->instructor->id, 'name' => $c->instructor->name] : null,
            'lessonsCount' => $c->lessons_count,
            'enrolled' => (bool) $enrollment,
            'enrollment' => $enrollment ? ['id' => $enrollment->id, 'status' => $enrollment->status, 'progressPercent' => $enrollment->progress_percent] : null,
        ];
    }

    private function uniqueSlug(string $base): string
    {
        $base = $base ?: 'course';
        $slug = $base;
        $i = 1;
        while (Course::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function syncLessons(Course $course, array $lessons): void
    {
        $existingIds = $course->lessons()->pluck('id')->all();
        $incomingIds = collect($lessons)->pluck('id')->filter()->all();

        CourseLesson::whereIn('id', array_diff($existingIds, $incomingIds))->delete();

        foreach ($lessons as $i => $l) {
            CourseLesson::updateOrCreate(
                ['id' => $l['id'] ?? null, 'course_id' => $course->id],
                [
                    'course_id' => $course->id,
                    'title' => $l['title'],
                    'type' => $l['type'],
                    'content' => $l['content'] ?? '',
                    'duration_minutes' => $l['duration_minutes'] ?? 0,
                    'sort_order' => $i,
                    'is_downloadable' => $l['is_downloadable'] ?? false,
                    'status' => 'active',
                ]
            );
        }
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'min:3'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'exists:course_categories,id'],
            'difficulty' => ['required', Rule::in(['beginner', 'intermediate', 'advanced'])],
            'duration_hours' => ['nullable', 'numeric', 'min:0'],
            'passing_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'is_featured' => ['boolean'],
            'is_mandatory' => ['boolean'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'enrollment_type' => ['required', Rule::in(['open', 'approval', 'invite'])],
            'max_attempts' => ['nullable', 'integer', 'min:1'],
            'deadline_days' => ['nullable', 'integer', 'min:0'],
            'lessons' => ['array'],
            'lessons.*.id' => ['nullable', 'string'],
            'lessons.*.title' => ['required', 'string'],
            'lessons.*.type' => ['required', Rule::in(['video', 'pdf', 'text', 'audio', 'gallery', 'ppt'])],
            'lessons.*.content' => ['nullable', 'string'],
            'lessons.*.duration_minutes' => ['nullable', 'integer', 'min:0'],
            'lessons.*.is_downloadable' => ['boolean'],
        ]);

        return [
            'course' => [
                'title' => trim($validated['title']),
                'description' => $validated['description'] ?? '',
                'category_id' => $validated['category_id'] ?? null,
                'difficulty' => $validated['difficulty'],
                'duration_hours' => $validated['duration_hours'] ?? 0,
                'passing_score' => $validated['passing_score'] ?? 70,
                'is_featured' => $validated['is_featured'] ?? false,
                'is_mandatory' => $validated['is_mandatory'] ?? false,
                'status' => $validated['status'],
                'enrollment_type' => $validated['enrollment_type'],
                'max_attempts' => $validated['max_attempts'] ?? 3,
                'deadline_days' => $validated['deadline_days'] ?? 30,
            ],
            'lessons' => $validated['lessons'] ?? [],
        ];
    }
}
