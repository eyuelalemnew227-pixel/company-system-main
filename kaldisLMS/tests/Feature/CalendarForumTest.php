<?php

use App\Models\Course;
use App\Models\Event;
use App\Models\Forum;
use App\Models\ForumPost;
use App\Models\ForumThread;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('coordinator can create a calendar event and it appears in that month', function () {
    $coordinator = makeEmployeeUser('coordinator');

    $this->actingAs($coordinator)->post('/calendar', [
        'title' => 'Q1 Barista Championship', 'type' => 'training', 'start_datetime' => '2026-08-15 10:00:00',
    ])->assertSessionHasNoErrors();

    $response = $this->actingAs($coordinator)->get('/calendar?month=2026-08');
    $response->assertInertia(fn ($page) => $page->has('events', 1)->where('events.0.title', 'Q1 Barista Championship'));
});

test('employee cannot create a calendar event', function () {
    $employee = makeEmployeeUser('employee');

    $this->actingAs($employee)->post('/calendar', ['title' => 'Should fail', 'type' => 'training', 'start_datetime' => now()->toDateTimeString()])
        ->assertForbidden();
});

test('starting a discussion creates a forum and first thread with a post', function () {
    $trainer = makeEmployeeUser('trainer');
    $course = Course::create(['title' => 'Forum Course', 'slug' => 'forum-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);

    $response = $this->actingAs($trainer)->post('/forums', [
        'course_id' => $course->id, 'title' => 'Welcome thread', 'body' => 'Say hello!',
    ]);

    $response->assertSessionHasNoErrors();
    $forum = Forum::where('course_id', $course->id)->firstOrFail();
    $thread = ForumThread::where('forum_id', $forum->id)->firstOrFail();
    expect($thread->title)->toBe('Welcome thread');
    expect($thread->posts)->toHaveCount(1);
});

test('replying to a locked forum is forbidden', function () {
    $trainer = makeEmployeeUser('trainer');
    $course = Course::create(['title' => 'Locked Course', 'slug' => 'locked-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);
    $forum = Forum::create(['course_id' => $course->id, 'title' => 'Locked Forum', 'is_locked' => true]);
    $thread = ForumThread::create(['forum_id' => $forum->id, 'user_id' => $trainer->id, 'title' => 'T']);

    $this->actingAs($trainer)->post("/forums/thread/{$thread->id}", ['body' => 'reply'])->assertForbidden();
});

test('marking a reply as solution unmarks any previous solution in the thread', function () {
    $manager = makeEmployeeUser('training_manager');
    $course = Course::create(['title' => 'Solution Course', 'slug' => 'solution-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);
    $forum = Forum::create(['course_id' => $course->id, 'title' => 'Forum']);
    $thread = ForumThread::create(['forum_id' => $forum->id, 'user_id' => $manager->id, 'title' => 'T']);
    $postA = ForumPost::create(['thread_id' => $thread->id, 'user_id' => $manager->id, 'body' => 'A', 'is_solution' => true]);
    $postB = ForumPost::create(['thread_id' => $thread->id, 'user_id' => $manager->id, 'body' => 'B']);

    $this->actingAs($manager)->patch("/forums/thread/{$thread->id}/posts/{$postB->id}/solution", ['is_solution' => true])
        ->assertSessionHasNoErrors();

    expect($postA->fresh()->is_solution)->toBeFalse();
    expect($postB->fresh()->is_solution)->toBeTrue();
});
