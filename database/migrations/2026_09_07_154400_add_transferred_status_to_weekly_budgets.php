<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE weekly_budgets MODIFY COLUMN status_finance ENUM('pending', 'approved', 'rejected', 'paid', 'on-hold', 'transferred') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE weekly_budgets MODIFY COLUMN status_department ENUM('pending', 'approved', 'rejected', 'on-hold', 'transferred') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        // Reverting enum changes can be tricky if data exists, but we can try to revert the schema definition
        DB::statement("ALTER TABLE weekly_budgets MODIFY COLUMN status_finance ENUM('pending', 'approved', 'rejected', 'paid', 'on-hold') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE weekly_budgets MODIFY COLUMN status_department ENUM('pending', 'approved', 'rejected', 'on-hold') NOT NULL DEFAULT 'pending'");
    }
};
