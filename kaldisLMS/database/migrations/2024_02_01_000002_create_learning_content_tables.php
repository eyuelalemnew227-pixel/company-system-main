<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_categories', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('parent_id')->nullable()->constrained('course_categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->integer('sort_order')->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('certificate_templates', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->longText('html_template');
            $table->string('background_image')->nullable();
            $table->string('font_settings')->nullable();
            $table->string('signature_image')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('courses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('category_id')->nullable()->constrained('course_categories')->nullOnDelete();
            $table->foreignUlid('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('thumbnail')->nullable();
            $table->float('duration_hours')->default(0);
            $table->enum('difficulty', ['beginner', 'intermediate', 'advanced'])->default('beginner');
            $table->integer('passing_score')->default(70);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_mandatory')->default(false);
            $table->foreignUlid('certificate_template_id')->nullable()->constrained('certificate_templates')->nullOnDelete();
            $table->enum('enrollment_type', ['open', 'approval', 'invite'])->default('open');
            $table->integer('max_attempts')->default(3);
            $table->integer('deadline_days')->default(30);
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('course_lessons', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->enum('type', ['video', 'pdf', 'text', 'audio', 'gallery', 'ppt']);
            $table->longText('content');
            $table->string('file_path')->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_downloadable')->default(false);
            $table->enum('completion_criteria', ['view', 'time'])->default('view');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('enrollments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignUlid('enrolled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('enrollment_date')->useCurrent();
            $table->timestamp('deadline')->nullable();
            $table->timestamp('completion_date')->nullable();
            $table->integer('progress_percent')->default(0);
            $table->enum('status', ['active', 'completed', 'dropped', 'overdue'])->default('active');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['course_id', 'employee_id']);
        });

        Schema::create('lesson_progress', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('enrollment_id')->constrained('enrollments')->cascadeOnDelete();
            $table->foreignUlid('lesson_id')->constrained('course_lessons')->cascadeOnDelete();
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('time_spent_seconds')->default(0);
            $table->integer('last_position')->default(0);
            $table->boolean('is_completed')->default(false);
            $table->timestamp('updated_at')->useCurrent();
            $table->unique(['enrollment_id', 'lesson_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_progress');
        Schema::dropIfExists('enrollments');
        Schema::dropIfExists('course_lessons');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('certificate_templates');
        Schema::dropIfExists('course_categories');
    }
};
