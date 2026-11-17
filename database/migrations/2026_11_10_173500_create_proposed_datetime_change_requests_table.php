<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposed_datetime_change_requests', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('evaluation_result_override_id')
                ->nullable()
                ->constrained('evaluation_result_overrides', 'id', 'pdcr_override_fk')
                ->cascadeOnDelete();
            $table->foreignId('training_request_id')
                ->nullable()
                ->constrained('training_requests', 'id', 'pdcr_training_request_fk')
                ->cascadeOnDelete();
            $table->string('employee_name');
            $table->string('branch_name')->nullable();
            $table->string('department_name')->nullable();
            $table->string('training_type_name')->nullable();
            $table->string('assigned_training_content')->nullable();
            $table->dateTime('current_proposed_at');
            $table->dateTime('requested_proposed_at');
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('decided_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposed_datetime_change_requests');
    }
};
