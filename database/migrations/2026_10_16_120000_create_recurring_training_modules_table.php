<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_training_modules', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('training_name');
            $table->text('description')->nullable();
            $table->foreignId('conducting_department_id')->constrained('departments')->restrictOnDelete();
            $table->foreignId('trainer_employee_id')->constrained('employees')->restrictOnDelete();
            // Null means all departments.
            $table->foreignId('targeted_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_training_modules');
    }
};
