<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('expense_budget_items', 'status')) {
            Schema::table('expense_budget_items', function (Blueprint $table) {
                $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft')->after('planned_budget');
            });
        }

        if (Schema::hasColumn('expense_budgets', 'status')) {
            DB::statement('
                UPDATE expense_budget_items
                SET status = (SELECT status FROM expense_budgets WHERE expense_budgets.id = expense_budget_items.expense_budget_id)
                WHERE expense_budget_id IS NOT NULL
            ');

            Schema::table('expense_budgets', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('expense_budgets', 'status')) {
            Schema::table('expense_budgets', function (Blueprint $table) {
                $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft')->after('created_by');
            });

            DB::statement('
                UPDATE expense_budgets eb
                INNER JOIN (
                    SELECT expense_budget_id, MAX(id) AS latest_item_id
                    FROM expense_budget_items
                    GROUP BY expense_budget_id
                ) latest ON latest.expense_budget_id = eb.id
                INNER JOIN expense_budget_items ebi ON ebi.id = latest.latest_item_id
                SET eb.status = ebi.status
            ');
        }

        if (Schema::hasColumn('expense_budget_items', 'status')) {
            Schema::table('expense_budget_items', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
