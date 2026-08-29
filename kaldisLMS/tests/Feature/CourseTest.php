<?php

use App\Models\Course;
use App\Models\Employee;
use App\Models\Enrollment;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function makeEmployeeUser(string $roleSlug = 'employee'): User
{
    $user = User::factory()->create(['role_id' => Role::where('slug', $roleSlug)->firstOrFail()->id]);
    Employee::create([
        'user_id' => $user->id,
        'employee_number' => 'EMP-'.$user->id,
        'first_name' => 'Test',
        'last_name' => 'User',
    ]);

    return $user->fresh();
}

test('trainer can create a course with lessons', function () {
    $trainer = makeEmployeeUser('trainer');

    $response = $this->actingAs($trainer)->post('/courses', [
        'title' => 'Espresso Basics',
        'description' => 'Learn the basics',
        'difficulty' => 'beginner',
        'status' => 'published',
        'enrollment_type' => 'open',
        'lessons' => [
            ['title' => 'Intro', 'type' => 'text', 'content' => 'Welcome', 'duration_minutes' => 5],
            ['title' => 'Video Lesson', 'type' => 'video', 'content' => 'https://youtu.be/dQw4w9WgXcQ', 'duration_minutes' => 10],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $course = Course::where('title', 'Espresso Basics')->firstOrFail();
    expect($course->lessons)->toHaveCount(2);
    expect($course->slug)->not->toBeEmpty();
});

test('employee cannot create a course', function () {
    $employee = makeEmployeeUser('employee');

    $response = $this->actingAs($employee)->post('/courses', [
        'title' => 'Should Fail',
        'difficulty' => 'beginner',
        'status' => 'draft',
        'enrollment_type' => 'open',
    ]);

    $response->assertForbidden();
});

test('employee can enroll in a published course and complete a lesson', function () {
    $trainer = makeEmployeeUser('trainer');
    $employee = makeEmployeeUser('employee');

    $this->actingAs($trainer)->post('/courses', [
        'title' => 'Milk Steaming',
        'difficulty' => 'beginner',
        'status' => 'published',
        'enrollment_type' => 'open',
        'lessons' => [
            ['title' => 'Lesson One', 'type' => 'text', 'content' => 'Content', 'duration_minutes' => 5],
        ],
    ]);
    $course = Course::where('title', 'Milk Steaming')->firstOrFail();

    $this->actingAs($employee)->post("/courses/{$course->id}/enroll")->assertSessionHasNoErrors();

    $enrollment = Enrollment::where('course_id', $course->id)->where('employee_id', $employee->employee->id)->firstOrFail();
    expect($enrollment->status)->toBe('active');

    $lesson = $course->lessons->first();
    $response = $this->actingAs($employee)->postJson("/lessons/{$lesson->id}/complete", ['enrollment_id' => $enrollment->id]);

    $response->assertOk();
    $response->assertJsonPath('courseCompleted', true);
    $response->assertJsonPath('pointsAwarded', fn ($v) => $v > 0);

    expect($enrollment->fresh()->status)->toBe('completed');
    expect($employee->fresh()->employee->total_points)->toBeGreaterThan(0);
});

test('draft courses are hidden from the catalog', function () {
    $trainer = makeEmployeeUser('trainer');
    $employee = makeEmployeeUser('employee');

    $this->actingAs($trainer)->post('/courses', [
        'title' => 'Draft Course', 'difficulty' => 'beginner', 'status' => 'draft', 'enrollment_type' => 'open',
    ]);

    $response = $this->actingAs($employee)->get('/courses');
    $response->assertInertia(fn ($page) => $page->where('courses', fn ($courses) => collect($courses)->where('title', 'Draft Course')->isEmpty()));
});
