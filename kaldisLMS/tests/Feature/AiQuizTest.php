<?php

use App\Models\Course;
use App\Models\Quiz;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    config(['services.anthropic.key' => null]);
});

test('ai generation returns a clear error when no API key is configured', function () {
    $trainer = makeEmployeeUser('trainer');

    $response = $this->actingAs($trainer)->postJson('/ai-quiz/generate', [
        'topic' => 'Espresso', 'difficulty' => 'easy', 'count' => 5, 'type' => 'single',
    ]);

    $response->assertStatus(503);
    $response->assertJsonPath('error', fn ($v) => str_contains($v, 'ANTHROPIC_API_KEY'));
});

test('employee cannot access the ai quiz generator', function () {
    $employee = makeEmployeeUser('employee');

    $this->actingAs($employee)->get('/ai-quiz')->assertForbidden();
});

test('a quiz can be created manually from a question list', function () {
    $trainer = makeEmployeeUser('trainer');
    $course = Course::create(['title' => 'AI Course', 'slug' => 'ai-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);

    $response = $this->actingAs($trainer)->post('/quizzes', [
        'course_id' => $course->id,
        'title' => 'Generated Quiz',
        'questions' => [
            [
                'text' => 'What is espresso?', 'type' => 'single', 'points' => 1, 'explanation' => 'It is concentrated coffee.',
                'answers' => [
                    ['text' => 'Concentrated coffee', 'isCorrect' => true],
                    ['text' => 'Tea', 'isCorrect' => false],
                ],
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();
    $quiz = Quiz::where('title', 'Generated Quiz')->firstOrFail();
    expect($quiz->questions)->toHaveCount(1);
    expect($quiz->questions->first()->answers)->toHaveCount(2);
});
