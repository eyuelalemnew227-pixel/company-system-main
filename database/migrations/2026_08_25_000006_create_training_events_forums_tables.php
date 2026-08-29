<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('training_feedback');
        Schema::dropIfExists('training_attendance');
        Schema::dropIfExists('training_forum_posts');
        Schema::dropIfExists('training_forum_threads');
        Schema::dropIfExists('training_forums');
        Schema::dropIfExists('training_events');
        Schema::enableForeignKeyConstraints();

        Schema::create('training_events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->enum('type', ['training', 'webinar', 'exam', 'meeting'])->default('training');
            $table->string('location')->nullable();
            $table->timestamp('start_datetime');
            $table->timestamp('end_datetime')->nullable();
            $table->foreignId('organizer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->enum('status', ['scheduled', 'cancelled', 'completed'])->default('scheduled');
            $table->timestamps();
        });

        Schema::create('training_forums', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->unique()->constrained('training_courses')->cascadeOnDelete();
            $table->string('title');
            $table->boolean('is_locked')->default(false);
            $table->timestamps();
        });

        Schema::create('training_forum_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('forum_id')->constrained('training_forums')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->boolean('is_pinned')->default(false);
            $table->integer('views')->default(0);
            $table->timestamps();
        });

        Schema::create('training_forum_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('training_forum_threads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->foreignId('parent_id')->nullable()->constrained('training_forum_posts')->nullOnDelete();
            $table->boolean('is_solution')->default(false);
            $table->timestamps();
        });

        Schema::create('training_attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('training_events')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->enum('status', ['present', 'absent', 'excused'])->default('present');
            $table->timestamp('checked_in_at')->useCurrent();
            $table->timestamps();
            $table->unique(['event_id', 'employee_id']);
        });

        Schema::create('training_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->integer('rating')->default(5);
            $table->text('comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_feedback');
        Schema::dropIfExists('training_attendance');
        Schema::dropIfExists('training_forum_posts');
        Schema::dropIfExists('training_forum_threads');
        Schema::dropIfExists('training_forums');
        Schema::dropIfExists('training_events');
    }
};
