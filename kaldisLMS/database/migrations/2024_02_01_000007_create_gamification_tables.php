<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->text('description');
            $table->string('icon');
            $table->enum('criteria_type', ['first_course', 'courses_count', 'streak', 'score', 'branch_rank', 'sop_complete']);
            $table->integer('criteria_value')->default(0);
            $table->integer('points')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('employee_badges', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignUlid('badge_id')->constrained('badges')->cascadeOnDelete();
            $table->foreignUlid('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->timestamp('earned_at')->useCurrent();
            $table->unique(['employee_id', 'badge_id']);
        });

        Schema::create('leaderboards', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignUlid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->enum('period_type', ['monthly', 'alltime']);
            $table->string('period_label');
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->integer('points')->default(0);
            $table->integer('rank')->default(0);
            $table->timestamp('calculated_at')->useCurrent();
            $table->unique(['employee_id', 'period_type', 'period_label', 'branch_id', 'department_id'], 'leaderboard_unique');
        });

        Schema::create('learning_streaks', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('employee_id')->unique()->constrained('employees')->cascadeOnDelete();
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->date('last_activity_date')->nullable();
            $table->integer('total_days_active')->default(0);
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_streaks');
        Schema::dropIfExists('leaderboards');
        Schema::dropIfExists('employee_badges');
        Schema::dropIfExists('badges');
    }
};
