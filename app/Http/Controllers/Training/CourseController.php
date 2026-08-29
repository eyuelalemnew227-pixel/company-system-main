<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\CertificateTemplate;
use App\Models\Training\Course;
use App\Models\Training\CourseCategory;
use App\Models\Training\Enrollment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Course::with(['category', 'lessons', 'instructor']);

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('difficulty')) {
            $query->where('difficulty', $request->difficulty);
        }

        $courses = $query->latest()->paginate(12)->withQueryString();
        $categories = CourseCategory::orderBy('name')->get();

        return Inertia::render('training/courses/index', [
            'courses' => $courses,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'difficulty']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('training/courses/create', [
            'categories' => CourseCategory::orderBy('name')->get(),
            'certificateTemplates' => CertificateTemplate::all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'nullable|exists:training_course_categories,id',
            'description' => 'required|string',
            'duration_hours' => 'numeric|min:0',
            'difficulty' => 'required|in:beginner,intermediate,advanced',
            'passing_score' => 'integer|min:0|max:100',
            'is_featured' => 'boolean',
            'is_mandatory' => 'boolean',
            'certificate_template_id' => 'nullable|exists:training_certificate_templates,id',
            'enrollment_type' => 'required|in:open,approval,invite',
            'max_attempts' => 'integer|min:1',
            'deadline_days' => 'integer|min:1',
            'status' => 'required|in:draft,published,archived',
        ]);

        $validated['slug'] = Str::slug($validated['title']) . '-' . Str::random(5);
        $validated['instructor_id'] = $request->user()->id;

        if ($validated['status'] === 'published') {
            $validated['published_at'] = now();
        }

        $course = Course::create($validated);

        return redirect()->route('training.courses.show', $course->id)
            ->with('success', 'Course created successfully.');
    }

    public function show(Course $course, Request $request): Response
    {
        $course->load(['category', 'instructor', 'lessons', 'quizzes', 'certificateTemplate', 'feedbacks.employee']);
        
        $user = $request->user();
        $employee = $user->employee;
        $isEnrolled = false;
        $enrollment = null;

        if ($employee) {
            $enrollment = Enrollment::where('course_id', $course->id)
                ->where('employee_id', $employee->id)
                ->first();
            $isEnrolled = (bool)$enrollment;
        }

        return Inertia::render('training/courses/show', [
            'course' => $course,
            'isEnrolled' => $isEnrolled,
            'enrollment' => $enrollment,
        ]);
    }

    public function edit(Course $course): Response
    {
        return Inertia::render('training/courses/edit', [
            'course' => $course->load(['category', 'lessons']),
            'categories' => CourseCategory::orderBy('name')->get(),
            'certificateTemplates' => CertificateTemplate::all(),
        ]);
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'nullable|exists:training_course_categories,id',
            'description' => 'required|string',
            'duration_hours' => 'numeric|min:0',
            'difficulty' => 'required|in:beginner,intermediate,advanced',
            'passing_score' => 'integer|min:0|max:100',
            'is_featured' => 'boolean',
            'is_mandatory' => 'boolean',
            'certificate_template_id' => 'nullable|exists:training_certificate_templates,id',
            'enrollment_type' => 'required|in:open,approval,invite',
            'max_attempts' => 'integer|min:1',
            'deadline_days' => 'integer|min:1',
            'status' => 'required|in:draft,published,archived',
        ]);

        if ($course->status !== 'published' && $validated['status'] === 'published') {
            $validated['published_at'] = now();
        }

        $course->update($validated);

        return redirect()->route('training.courses.show', $course->id)
            ->with('success', 'Course updated successfully.');
    }

    public function destroy(Course $course): RedirectResponse
    {
        $course->delete();

        return redirect()->route('training.courses.index')
            ->with('success', 'Course deleted successfully.');
    }

    public function enroll(Course $course, Request $request): RedirectResponse
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return back()->with('error', 'User profile must be associated with an Employee record to enroll.');
        }

        $enrollment = Enrollment::firstOrCreate([
            'course_id' => $course->id,
            'employee_id' => $employee->id,
        ], [
            'enrolled_by' => $request->user()->id,
            'enrollment_date' => now(),
            'deadline' => now()->addDays($course->deadline_days ?? 30),
            'progress_percent' => 0,
            'status' => 'active',
        ]);

        return redirect()->route('training.courses.show', $course->id)
            ->with('success', 'Enrolled in course successfully!');
    }
}
