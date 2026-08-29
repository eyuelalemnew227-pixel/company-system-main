<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('training_quiz_responses');
        Schema::dropIfExists('training_quiz_attempts');
        Schema::dropIfExists('training_answers');
        Schema::dropIfExists('training_questions');
        Schema::dropIfExists('training_question_banks');
        Schema::dropIfExists('training_quizzes');
        Schema::enableForeignKeyConstraints();

        Schema::create('training_quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
            $table->string('title');
            $table->integer('time_limit_minutes')->default(30);
            $table->integer('pass_mark')->default(70);
            $table->integer('max_attempts')->default(3);
            $table->boolean('randomize_questions')->default(false);
            $table->boolean('show_answers_after')->default(true);
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('training_question_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('training_course_categories')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('text');
            $table->enum('type', ['single', 'multiple', 'truefalse', 'fillblank', 'matching', 'shortanswer', 'ordering'])->default('single');
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('medium');
            $table->string('tags')->nullable();
            $table->longText('answer_data')->nullable();
            $table->timestamps();
        });

        Schema::create('training_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('training_quizzes')->cascadeOnDelete();
            $table->foreignId('question_bank_id')->nullable()->constrained('training_question_banks')->nullOnDelete();
            $table->text('text');
            $table->enum('type', ['single', 'multiple', 'truefalse', 'fillblank', 'matching', 'shortanswer', 'ordering'])->default('single');
            $table->integer('points')->default(1);
            $table->string('media_path')->nullable();
            $table->text('explanation')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('training_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained('training_questions')->cascadeOnDelete();
            $table->text('text');
            $table->boolean('is_correct')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('training_quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('training_quizzes')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('enrollment_id')->nullable()->constrained('training_enrollments')->nullOnDelete();
            $table->integer('score')->default(0);
            $table->boolean('passed')->default(false);
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();
            $table->integer('time_taken_seconds')->default(0);
            $table->timestamps();
        });

        Schema::create('training_quiz_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('training_quiz_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('training_questions')->cascadeOnDelete();
            $table->foreignId('answer_id')->nullable()->constrained('training_answers')->nullOnDelete();
            $table->text('text_response')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_quiz_responses');
        Schema::dropIfExists('training_quiz_attempts');
        Schema::dropIfExists('training_answers');
        Schema::dropIfExists('training_questions');
        Schema::dropIfExists('training_question_banks');
        Schema::dropIfExists('training_quizzes');
    }
};
