<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->index(['status', 'name'], 'branches_status_name_index');
        });

        Schema::table('sales_budgets', function (Blueprint $table) {
            $table->index(['fiscal_month_id', 'branch_id'], 'sales_budgets_fiscal_month_branch_index');
            $table->index(['fiscal_year_id', 'fiscal_month_id', 'branch_id'], 'sales_budgets_fiscal_period_branch_index');
        });
    }

    public function down(): void
    {
        Schema::table('sales_budgets', function (Blueprint $table) {
            $table->dropIndex('sales_budgets_fiscal_month_branch_index');
            $table->dropIndex('sales_budgets_fiscal_period_branch_index');
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropIndex('branches_status_name_index');
        });
    }
};