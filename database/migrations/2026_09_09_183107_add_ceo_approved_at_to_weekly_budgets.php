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
            $table->timestamp('ceo_approved_at')->nullable()->after('status_ceo');
        });

        // Backfill for existing approved records
        DB::statement("UPDATE weekly_budgets SET ceo_approved_at = updated_at WHERE status_ceo = 'approved' AND ceo_approved_at IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('weekly_budgets', function (Blueprint $table) {
            $table->dropColumn('ceo_approved_at');
        });
    }
};
