<?php

use App\Models\CourseCategory;
use App\Models\QuestionBank;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function userWithRole(string $slug): User
{
    return User::factory()->create(['role_id' => Role::where('slug', $slug)->firstOrFail()->id]);
}

test('admin can view and create question bank entries', function () {
    $admin = userWithRole('admin');

    $this->actingAs($admin)->get('/question-bank')->assertOk();

    $response = $this->actingAs($admin)->post('/question-bank', [
        'category_id' => null,
        'text' => 'What is the boiling point of water?',
        'type' => 'single',
        'difficulty' => 'easy',
        'tags' => 'science',
        'answers' => [
            ['text' => '100C', 'isCorrect' => true],
            ['text' => '50C', 'isCorrect' => false],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    expect(QuestionBank::where('text', 'like', '%boiling point%')->exists())->toBeTrue();
});

test('employee cannot create question bank entries', function () {
    $employee = userWithRole('employee');

    $response = $this->actingAs($employee)->post('/question-bank', [
        'text' => 'Should be forbidden',
        'type' => 'single',
        'difficulty' => 'easy',
        'answers' => [
            ['text' => 'a', 'isCorrect' => true],
            ['text' => 'b', 'isCorrect' => false],
        ],
    ]);

    $response->assertForbidden();
    expect(QuestionBank::where('text', 'Should be forbidden')->exists())->toBeFalse();
});

test('fillblank questions can be created with a single correct answer', function () {
    $admin = userWithRole('admin');

    $response = $this->actingAs($admin)->post('/question-bank', [
        'text' => 'The capital of Ethiopia is ___.',
        'type' => 'fillblank',
        'difficulty' => 'easy',
        'answers' => [
            ['text' => 'Addis Ababa', 'isCorrect' => true],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();
    $item = QuestionBank::where('text', 'like', '%capital of Ethiopia%')->firstOrFail();
    expect($item->answers)->toHaveCount(1);
    expect($item->answers[0]['isCorrect'])->toBeTrue();
});

test('deleting a question actually removes it', function () {
    $admin = userWithRole('admin');
    $q = QuestionBank::create([
        'text' => 'Delete me',
        'type' => 'single',
        'difficulty' => 'easy',
        'tags' => '',
        'answer_data' => json_encode([['text' => 'a', 'isCorrect' => true], ['text' => 'b', 'isCorrect' => false]]),
    ]);

    $this->actingAs($admin)->delete("/question-bank/{$q->id}")->assertSessionHasNoErrors();

    expect(QuestionBank::find($q->id))->toBeNull();
});

test('question bank filters by category and difficulty', function () {
    $admin = userWithRole('admin');
    $cat = CourseCategory::create(['name' => 'Barista', 'slug' => 'barista-test']);

    QuestionBank::create(['category_id' => $cat->id, 'text' => 'Espresso Q', 'type' => 'single', 'difficulty' => 'hard', 'tags' => '', 'answer_data' => '[]']);
    QuestionBank::create(['text' => 'Other Q', 'type' => 'single', 'difficulty' => 'easy', 'tags' => '', 'answer_data' => '[]']);

    $response = $this->actingAs($admin)->get("/question-bank?categoryId={$cat->id}");
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('questions.data', 1)
        ->where('questions.data.0.text', 'Espresso Q')
    );
});
