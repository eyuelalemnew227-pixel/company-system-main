<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('deleted_evaluations', function (Blueprint $table) {
            $table->id();

            // Original evaluation response ID (for reference)
            $table->unsignedBigInteger('evaluation_response_id');

            // Reference IDs for filtering
            $table->foreignId('evaluation_id')->nullable()->constrained('evaluations')->onDelete('set null');
            $table->foreignId('evaluator_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('evaluate_id')->nullable();
            $table->string('evaluable_type')->nullable();
            $table->foreignId('evaluation_period_id')->nullable()->constrained('evaluation_periods')->onDelete('set null');

            // Snapshot of evaluation response data (JSON)
            $table->longText('evaluation_data');

            // Snapshot of question responses (JSON array)
            $table->longText('question_responses_data')->nullable();

            // Deletion metadata
            $table->foreignId('deleted_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('deleted_at');
            $table->text('deletion_reason')->nullable();

            $table->timestamps();

            // Indexes for better query performance
            $table->index('evaluation_response_id');
            $table->index('deleted_by');
            $table->index('deleted_at');
            $table->index('evaluation_period_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deleted_evaluations');
    }
};
