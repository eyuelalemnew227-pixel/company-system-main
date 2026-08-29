<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUlid('lesson_id')->nullable()->constrained('course_lessons')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('allowed_file_types')->nullable();
            $table->integer('max_file_size_mb')->default(50);
            $table->timestamp('deadline')->nullable();
            $table->integer('max_marks')->default(100);
            $table->integer('pass_marks')->default(50);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('assignment_submissions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('assignment_id')->constrained('assignments')->cascadeOnDelete();
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignUlid('enrollment_id')->nullable()->constrained('enrollments')->nullOnDelete();
            $table->string('file_path')->nullable();
            $table->text('submission_notes')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->integer('marks_obtained')->nullable();
            $table->text('feedback')->nullable();
            $table->foreignUlid('graded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('graded_at')->nullable();
            $table->enum('status', ['submitted', 'graded', 'resubmit'])->default('submitted');
            $table->unique(['assignment_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_submissions');
        Schema::dropIfExists('assignments');
    }
};
