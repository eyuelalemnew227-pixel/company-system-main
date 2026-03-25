<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_assets', 'ticket_main_category_id')) {
                $table->foreignId('ticket_main_category_id')->nullable()->constrained()->nullOnDelete()->after('department_id');
            }
            if (!Schema::hasColumn('ticket_assets', 'article_code')) {
                $table->string('article_code', 100)->nullable()->after('ticket_sub_category_id');
            }
        });

        // migrate old code -> article_code if present
        if (Schema::hasColumn('ticket_assets', 'code')) {
            DB::statement('UPDATE ticket_assets SET article_code = code WHERE article_code IS NULL');
        }

        Schema::table('ticket_assets', function (Blueprint $table) {
            if (Schema::hasColumn('ticket_assets', 'code')) {
                $table->dropColumn('code');
            }
            if (Schema::hasColumn('ticket_assets', 'location')) {
                $table->dropColumn('location');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_assets', 'code')) {
                $table->string('code', 80)->nullable()->after('ticket_sub_category_id');
            }
            if (!Schema::hasColumn('ticket_assets', 'location')) {
                $table->string('location', 150)->nullable()->after('code');
            }
            if (Schema::hasColumn('ticket_assets', 'article_code')) {
                $table->dropColumn('article_code');
            }
            if (Schema::hasColumn('ticket_assets', 'ticket_main_category_id')) {
                $table->dropForeign(['ticket_main_category_id']);
                $table->dropColumn('ticket_main_category_id');
            }
        });
    }
};
