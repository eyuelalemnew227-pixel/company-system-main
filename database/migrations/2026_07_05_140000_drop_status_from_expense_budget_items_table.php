<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('expense_budget_items', 'status')) {
            return;
        }

        Schema::table('expense_budget_items', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('expense_budget_items', 'status')) {
            return;
        }

        Schema::table('expense_budget_items', function (Blueprint $table) {
            $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft')->after('planned_budget');
        });
    }
};
