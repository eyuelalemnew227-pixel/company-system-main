<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('expense_budget_activity_logs');
        Schema::dropIfExists('expense_budget_items');
        Schema::dropIfExists('expense_budgets');

        Schema::create('expense_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->nullable()->constrained('fiscal_years')->cascadeOnDelete();
            $table->foreignId('fiscal_month_id')->nullable()->constrained('fiscal_months')->cascadeOnDelete();
            $table->integer('expense_item_id');
            $table->decimal('planned_budget', 12, 2);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('expense_item_id')
                ->references('expense_parent_acc_code')
                ->on('expenses')
                ->cascadeOnDelete();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('expense_budgets');
    }
};
