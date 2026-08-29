<?php

use App\Models\Answer;
use App\Models\Course;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function makeQuizWithQuestions(): Quiz
{
    $trainer = makeEmployeeUser('trainer');
    $course = Course::create([
        'title' => 'Quiz Course', 'slug' => 'quiz-course-'.uniqid(), 'description' => '',
        'difficulty' => 'beginner', 'status' => 'published', 'instructor_id' => $trainer->id,
    ]);
    $quiz = Quiz::create(['course_id' => $course->id, 'title' => 'Sample Quiz', 'pass_mark' => 70, 'max_attempts' => 2]);

    $q1 = Question::create(['quiz_id' => $quiz->id, 'text' => 'Single choice?', 'type' => 'single', 'points' => 1, 'sort_order' => 0]);
    Answer::create(['question_id' => $q1->id, 'text' => 'Right', 'is_correct' => true, 'sort_order' => 0]);
    Answer::create(['question_id' => $q1->id, 'text' => 'Wrong', 'is_correct' => false, 'sort_order' => 1]);

    $q2 = Question::create(['quiz_id' => $quiz->id, 'text' => 'Fill blank?', 'type' => 'fillblank', 'points' => 1, 'sort_order' => 1]);
    Answer::create(['question_id' => $q2->id, 'text' => 'answer', 'is_correct' => true, 'sort_order' => 0]);

    return $quiz->fresh(['questions.answers']);
}

test('quiz take page does not expose isCorrect before submission', function () {
    $quiz = makeQuizWithQuestions();
    $employee = makeEmployeeUser('employee');

    $response = $this->actingAs($employee)->get("/quizzes/{$quiz->id}/take");

    $response->assertInertia(function ($page) {
        $questions = $page->toArray()['props']['quiz']['questions'];
        foreach ($questions as $q) {
            foreach ($q['answers'] as $a) {
                expect($a)->not->toHaveKey('isCorrect');
            }
        }
    });
});

test('correct answers are graded and points awarded on submit', function () {
    $quiz = makeQuizWithQuestions();
    $employee = makeEmployeeUser('employee');
    $q1 = $quiz->questions[0];
    $q2 = $quiz->questions[1];
    $correctAnswerId = $q1->answers->firstWhere('is_correct', true)->id;

    $response = $this->actingAs($employee)->postJson("/quizzes/{$quiz->id}/submit", [
        'responses' => [
            ['question_id' => $q1->id, 'answer_id' => $correctAnswerId],
            ['question_id' => $q2->id, 'text_response' => 'Answer'],
        ],
    ]);

    $response->assertOk();
    $response->assertJsonPath('score', 100);
    $response->assertJsonPath('passed', true);
    expect($response->json('pointsAwarded'))->toBeGreaterThan(0);
});

test('quiz enforces max attempts', function () {
    $quiz = makeQuizWithQuestions();
    $employee = makeEmployeeUser('employee');

    for ($i = 0; $i < 2; $i++) {
        QuizAttempt::create([
            'quiz_id' => $quiz->id, 'employee_id' => $employee->employee->id,
            'score' => 50, 'passed' => false, 'started_at' => now(), 'submitted_at' => now(),
        ]);
    }

    $response = $this->actingAs($employee)->postJson("/quizzes/{$quiz->id}/submit", ['responses' => []]);
    $response->assertForbidden();
});
