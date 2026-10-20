<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('td_kpi_questions', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->text('label');
            $table->foreignId('assessment_id')->constrained('td_kpi_assessments')->cascadeOnDelete();
            $table->foreignId('form_input_type_id')->constrained('form_input_types')->restrictOnDelete();
            $table->text('answer')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('td_kpi_question_choices', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('td_kpi_question_id')->constrained('td_kpi_questions')->cascadeOnDelete();
            $table->string('label');
            $table->string('value');
            $table->integer('order_index')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('td_kpi_question_choices');
        Schema::dropIfExists('td_kpi_questions');
    }
};
