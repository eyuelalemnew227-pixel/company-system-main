<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('training_lesson_progress');
        Schema::dropIfExists('training_enrollments');
        Schema::dropIfExists('training_course_lessons');
        Schema::dropIfExists('training_courses');
        Schema::dropIfExists('training_certificate_templates');
        Schema::dropIfExists('training_course_categories');
        Schema::enableForeignKeyConstraints();

        Schema::create('training_course_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('training_course_categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->integer('sort_order')->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('training_certificate_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->longText('html_template');
            $table->string('background_image')->nullable();
            $table->string('font_settings')->nullable();
            $table->string('signature_image')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('training_courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('training_course_categories')->nullOnDelete();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('thumbnail')->nullable();
            $table->float('duration_hours')->default(0);
            $table->enum('difficulty', ['beginner', 'intermediate', 'advanced'])->default('beginner');
            $table->integer('passing_score')->default(70);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_mandatory')->default(false);
            $table->foreignId('certificate_template_id')->nullable()->constrained('training_certificate_templates')->nullOnDelete();
            $table->enum('enrollment_type', ['open', 'approval', 'invite'])->default('open');
            $table->integer('max_attempts')->default(3);
            $table->integer('deadline_days')->default(30);
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('training_course_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
            $table->string('title');
            $table->enum('type', ['video', 'pdf', 'text', 'audio', 'gallery', 'ppt'])->default('text');
            $table->longText('content')->nullable();
            $table->string('file_path')->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_downloadable')->default(false);
            $table->enum('completion_criteria', ['view', 'time'])->default('view');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('training_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('enrolled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('enrollment_date')->useCurrent();
            $table->timestamp('deadline')->nullable();
            $table->timestamp('completion_date')->nullable();
            $table->integer('progress_percent')->default(0);
            $table->enum('status', ['active', 'completed', 'dropped', 'overdue'])->default('active');
            $table->timestamps();
            $table->unique(['course_id', 'employee_id']);
        });

        Schema::create('training_lesson_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('training_enrollments')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('training_course_lessons')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('time_spent_seconds')->default(0);
            $table->integer('last_position')->default(0);
            $table->boolean('is_completed')->default(false);
            $table->timestamps();
            $table->unique(['enrollment_id', 'lesson_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_lesson_progress');
        Schema::dropIfExists('training_enrollments');
        Schema::dropIfExists('training_course_lessons');
        Schema::dropIfExists('training_courses');
        Schema::dropIfExists('training_certificate_templates');
        Schema::dropIfExists('training_course_categories');
    }
};
