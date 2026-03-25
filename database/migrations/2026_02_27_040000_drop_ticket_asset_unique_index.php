<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            // Drop unique index if it exists
            try {
                $table->dropUnique('asset_dept_sub_name_unique');
            } catch (\Throwable $e) {
                // ignore if index already missing
            }
        });
    }

    public function down(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            // Restore unique constraint on (department_id, ticket_sub_category_id, name)
            $table->unique(['department_id', 'ticket_sub_category_id', 'name'], 'asset_dept_sub_name_unique');
        });
    }
};
