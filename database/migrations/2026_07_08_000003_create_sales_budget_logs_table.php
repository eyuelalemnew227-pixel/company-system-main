<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_budget_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_budget_id')->nullable()->constrained('sales_budgets')->nullOnDelete();
            $table->string('branch_name')->nullable();
            $table->unsignedTinyInteger('ethiopian_month')->nullable();
            $table->unsignedSmallInteger('ethiopian_year')->nullable();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('action', ['created', 'updated', 'deleted']);
            $table->decimal('old_sales_amount', 15, 2)->nullable();
            $table->decimal('new_sales_amount', 15, 2)->nullable();
            $table->decimal('old_prev_expense', 15, 2)->nullable();
            $table->decimal('new_prev_expense', 15, 2)->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_budget_logs');
    }
};