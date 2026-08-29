<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('title');
            $table->enum('type', ['training', 'webinar', 'exam', 'meeting']);
            $table->string('location')->nullable();
            $table->timestamp('start_datetime');
            $table->timestamp('end_datetime')->nullable();
            $table->foreignUlid('organizer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->enum('status', ['scheduled', 'cancelled', 'completed'])->default('scheduled');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('forums', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('course_id')->unique()->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->boolean('is_locked')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('forum_threads', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('forum_id')->constrained('forums')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->boolean('is_pinned')->default(false);
            $table->integer('views')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('forum_posts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('thread_id')->constrained('forum_threads')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->foreignUlid('parent_id')->nullable()->constrained('forum_posts')->nullOnDelete();
            $table->boolean('is_solution')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_posts');
        Schema::dropIfExists('forum_threads');
        Schema::dropIfExists('forums');
        Schema::dropIfExists('events');
    }
};
