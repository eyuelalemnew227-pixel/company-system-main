<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_budget_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_budget_id')->constrained('expense_budgets')->cascadeOnDelete();
            $table->unsignedInteger('expense_item_id');
            $table->decimal('planned_budget', 12, 2);
            $table->timestamps();

            $table->foreign('expense_item_id')
                ->references('expense_parent_acc_code')
                ->on('expenses')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_budget_items');
    }
};
