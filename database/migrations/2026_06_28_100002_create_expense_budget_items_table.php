<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('expense_budget_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_budget_id')->constrained('expense_budgets')->cascadeOnDelete();
<<<<<<< HEAD
            $table->integer('expense_item_id');
=======
            $table->unsignedInteger('expense_item_id');
            $table->decimal('prev_month_budget', 12, 2)->nullable();
>>>>>>> 28a593e8318fe238bf468d52532b64c58d769025
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
