<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('departments', 'is_active_on_weekly_budget')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->boolean('is_active_on_weekly_budget')->default(0)->after('is_active_on_ticketing');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('departments', 'is_active_on_weekly_budget')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->dropColumn('is_active_on_weekly_budget');
            });
        }
    }
};
