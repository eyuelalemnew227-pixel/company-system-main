<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('training_feedback_responses')) {
            Schema::create('training_feedback_responses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('training_schedule_id')->nullable()->constrained('training_schedules')->onDelete('cascade');
                $table->foreignId('training_schedule_item_id')->nullable()->constrained('training_schedule_items')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('set null');
                $table->string('trainee_name')->nullable();
                
                // 11 Exact Amharic Questionnaires
                $table->integer('q1_relevance')->default(5);
                $table->string('q2_objective_clarity')->default('Yes');
                $table->integer('q3_response_quality')->default(5);
                $table->integer('q4_participatory')->default(5);
                $table->integer('q5_motivating')->default(5);
                $table->string('q6_gained_new_knowledge')->default('Yes');
                $table->text('q7_motivation_diff')->nullable();
                $table->text('q8_knowledge_increase')->nullable();
                $table->string('q9_one_word_summary')->nullable();
                $table->text('q10_most_liked_aspects')->nullable();
                $table->text('q11_additional_comments')->nullable();

                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('training_feedback_responses');
    }
};
