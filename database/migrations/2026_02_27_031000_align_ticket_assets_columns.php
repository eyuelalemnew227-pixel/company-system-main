<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            // Drop legacy columns if they still exist
            if (Schema::hasColumn('ticket_assets', 'code')) {
                $table->dropColumn('code');
            }
            if (Schema::hasColumn('ticket_assets', 'location')) {
                $table->dropColumn('location');
            }
            if (Schema::hasColumn('ticket_assets', 'display_order')) {
                $table->dropColumn('display_order');
            }

            // Add desired columns if missing
            if (!Schema::hasColumn('ticket_assets', 'ticket_main_category_id')) {
                $table->foreignId('ticket_main_category_id')->nullable()->constrained()->nullOnDelete()->after('department_id');
            }
            if (!Schema::hasColumn('ticket_assets', 'article_code')) {
                $table->string('article_code', 100)->nullable()->after('ticket_sub_category_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            if (Schema::hasColumn('ticket_assets', 'article_code')) {
                $table->dropColumn('article_code');
            }
            if (Schema::hasColumn('ticket_assets', 'ticket_main_category_id')) {
                $table->dropForeign(['ticket_main_category_id']);
                $table->dropColumn('ticket_main_category_id');
            }
            // Note: not restoring legacy code/location/display_order
        });
    }
};
