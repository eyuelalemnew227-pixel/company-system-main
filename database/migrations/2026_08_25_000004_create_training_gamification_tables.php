<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('training_learning_streaks');
        Schema::dropIfExists('training_leaderboards');
        Schema::dropIfExists('training_employee_badges');
        Schema::dropIfExists('training_badges');
        Schema::enableForeignKeyConstraints();

        Schema::create('training_badges', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description');
            $table->string('icon');
            $table->enum('criteria_type', ['first_course', 'courses_count', 'streak', 'score', 'branch_rank', 'sop_complete'])->default('first_course');
            $table->integer('criteria_value')->default(0);
            $table->integer('points')->default(0);
            $table->timestamps();
        });

        Schema::create('training_employee_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('badge_id')->constrained('training_badges')->cascadeOnDelete();
            $table->foreignId('course_id')->nullable()->constrained('training_courses')->nullOnDelete();
            $table->timestamp('earned_at')->useCurrent();
            $table->timestamps();
            $table->unique(['employee_id', 'badge_id']);
        });

        Schema::create('training_leaderboards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->enum('period_type', ['monthly', 'alltime'])->default('monthly');
            $table->string('period_label');
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->integer('points')->default(0);
            $table->integer('rank')->default(0);
            $table->timestamp('calculated_at')->useCurrent();
            $table->timestamps();
            $table->unique(['employee_id', 'period_type', 'period_label', 'branch_id', 'department_id'], 'tr_leaderboard_unique');
        });

        Schema::create('training_learning_streaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->unique()->constrained('employees')->cascadeOnDelete();
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->date('last_activity_date')->nullable();
            $table->integer('total_days_active')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_learning_streaks');
        Schema::dropIfExists('training_leaderboards');
        Schema::dropIfExists('training_employee_badges');
        Schema::dropIfExists('training_badges');
    }
};
