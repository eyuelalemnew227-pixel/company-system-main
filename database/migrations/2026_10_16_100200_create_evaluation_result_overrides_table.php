<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_result_overrides', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('form_id')->constrained('forms')->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete();
            $table->foreignId('fiscal_month_id')->constrained('fiscal_months')->restrictOnDelete();
            $table->string('next_action');
            $table->foreignId('training_type_id')->nullable()->constrained('training_types')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['employee_id', 'form_id', 'fiscal_month_id'],
                'eval_result_override_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_result_overrides');
    }
};
