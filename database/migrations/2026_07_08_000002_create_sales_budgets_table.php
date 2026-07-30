<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sales_budgets', function (Blueprint $table) {
            $table->bigIncrements('id'); // PK, auto-increment
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('fiscal_year_id')->nullable();
            $table->unsignedBigInteger('fiscal_month_id')->nullable();
            $table->decimal('sales_amount', 15, 2)->nullable();
            $table->decimal('prev_sales_budget', 15, 2)->default(0);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_budgets');
    }
};