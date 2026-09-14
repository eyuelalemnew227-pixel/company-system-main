<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('weekly_budgets', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('status_finance');
        });

        // Backfill for existing paid records
        DB::statement("UPDATE weekly_budgets SET paid_at = updated_at WHERE status_finance = 'paid' AND paid_at IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('weekly_budgets', function (Blueprint $table) {
            $table->dropColumn('paid_at');
        });
    }
};
