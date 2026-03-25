<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            $table->foreignId('ticket_main_category_id')->constrained()->onDelete('cascade');
            $table->foreignId('ticket_sub_category_id')->constrained()->onDelete('cascade');
            $table->foreignId('ticket_asset_id')->nullable()->constrained('ticket_assets')->nullOnDelete();

            $table->string('title', 200);
            $table->text('description');
            $table->string('severity', 30); // severe | mid-severe | no-impact
            $table->date('preferred_deadline')->nullable();

            // Requestor snapshot (immutable)
            $table->string('requestor_full_name', 200);
            $table->foreignId('requestor_branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('requestor_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('requestor_phone', 30)->nullable();

            // Status and reasons
            $table->string('status', 40)->default('pending_approval');
            $table->text('pending_reason')->nullable();
            $table->text('escalation_reason')->nullable();
            $table->text('rejection_reason')->nullable();

            // Lifecycle timestamps
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('in_progress_at')->nullable();
            $table->timestamp('done_at')->nullable();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps(); // created_at, updated_at = last_updated_at
            $table->softDeletes();

            $table->index(['department_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index(['ticket_sub_category_id', 'ticket_asset_id']);
            $table->index(['assigned_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
