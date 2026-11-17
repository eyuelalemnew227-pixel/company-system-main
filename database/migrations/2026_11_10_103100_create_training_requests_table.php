<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_requests', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('training_type_id')->constrained('training_types')->restrictOnDelete();
            $table->date('requested_on');
            $table->foreignId('recurring_module_id')->constrained('recurring_training_modules')->restrictOnDelete();
            $table->text('extra_info')->nullable();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('requester_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('status')->default('submitted');
            $table->dateTime('first_proposed_at')->nullable();
            $table->dateTime('current_proposed_at')->nullable();
            $table->dateTime('coordinator_actual_at')->nullable();
            $table->string('actual_date_verdict')->nullable();
            $table->dateTime('requester_actual_at')->nullable();
            $table->timestamps();

            $table->index(['requested_by', 'status']);
            $table->index(['employee_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_requests');
    }
};
