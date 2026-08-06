<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('expense_budget_periods', function (Blueprint $table) {
            $table->id();
            $table->string('period_name', 191);
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years');
            $table->foreignId('fiscal_month_id')->constrained('fiscal_months');
            $table->enum('status', ['active', 'inactive'])->default('inactive');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_budget_periods');
    }
};
