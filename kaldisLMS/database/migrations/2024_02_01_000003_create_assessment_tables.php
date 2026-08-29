<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quizzes', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->integer('time_limit_minutes')->default(30);
            $table->integer('pass_mark')->default(70);
            $table->integer('max_attempts')->default(3);
            $table->boolean('randomize_questions')->default(false);
            $table->boolean('show_answers_after')->default(true);
            $table->string('status')->default('active');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('question_bank', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('category_id')->nullable()->constrained('course_categories')->nullOnDelete();
            $table->foreignUlid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('text');
            $table->enum('type', ['single', 'multiple', 'truefalse', 'fillblank', 'matching', 'shortanswer', 'ordering']);
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('medium');
            $table->string('tags')->nullable();
            $table->longText('answer_data');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->foreignUlid('question_bank_id')->nullable()->constrained('question_bank')->nullOnDelete();
            $table->text('text');
            $table->enum('type', ['single', 'multiple', 'truefalse', 'fillblank', 'matching', 'shortanswer', 'ordering']);
            $table->integer('points')->default(1);
            $table->string('media_path')->nullable();
            $table->text('explanation')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('answers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('question_id')->constrained('questions')->cascadeOnDelete();
            $table->text('text');
            $table->boolean('is_correct')->default(false);
            $table->integer('sort_order')->default(0);
        });

        Schema::create('quiz_attempts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignUlid('enrollment_id')->nullable()->constrained('enrollments')->nullOnDelete();
            $table->integer('score')->default(0);
            $table->boolean('passed')->default(false);
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();
            $table->integer('time_taken_seconds')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('quiz_responses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('attempt_id')->constrained('quiz_attempts')->cascadeOnDelete();
            $table->foreignUlid('question_id')->constrained('questions')->cascadeOnDelete();
            $table->foreignUlid('answer_id')->nullable()->constrained('answers')->nullOnDelete();
            $table->text('text_response')->nullable();
            $table->boolean('is_correct')->default(false);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_responses');
        Schema::dropIfExists('quiz_attempts');
        Schema::dropIfExists('answers');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('question_bank');
        Schema::dropIfExists('quizzes');
    }
};
