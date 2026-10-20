<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('td_kpi_assessments', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('assessment_name');
            $table->foreignId('training_module_id')
                ->constrained('recurring_training_modules')
                ->restrictOnDelete();
            $table->unsignedInteger('randomization_questions_number');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('td_kpi_assessments');
    }
};
