<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('td_kpi_assignments', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('evaluation_result_override_id')
                ->constrained('evaluation_result_overrides')
                ->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete();
            $table->foreignId('fiscal_month_id')->constrained('fiscal_months')->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('training_type_id')->nullable()->constrained('training_types')->nullOnDelete();
            $table->foreignId('assigned_training_content_id')
                ->nullable()
                ->constrained('recurring_training_modules')
                ->nullOnDelete();
            $table->date('proposed_training_date')->nullable();
            $table->boolean('is_training_held')->default(false);
            $table->boolean('attendance')->default(false);
            $table->foreignId('assessment_id')->nullable()->constrained('td_kpi_assessments')->nullOnDelete();
            $table->decimal('post_assessment_score', 5, 2)->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['evaluation_result_override_id', 'assessment_id'],
                'td_kpi_assign_override_assessment_unique'
            );
            $table->index(
                ['employee_id', 'fiscal_year_id', 'fiscal_month_id'],
                'td_kpi_assignments_emp_period_index'
            );
        });

        Schema::create('td_kpi_assignment_questions', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('td_kpi_assignment_id')->constrained('td_kpi_assignments')->cascadeOnDelete();
            $table->foreignId('td_kpi_question_id')->constrained('td_kpi_questions')->restrictOnDelete();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->unique(['td_kpi_assignment_id', 'td_kpi_question_id'], 'td_kpi_assignment_question_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('td_kpi_assignment_questions');
        Schema::dropIfExists('td_kpi_assignments');
    }
};
