<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop lingering columns
        Schema::table('ticket_main_categories', function (Blueprint $table) {
            if (Schema::hasColumn('ticket_main_categories', 'slug')) {
                $table->dropColumn('slug');
            }
            if (Schema::hasColumn('ticket_main_categories', 'display_order')) {
                $table->dropColumn('display_order');
            }
        });

        Schema::table('ticket_sub_categories', function (Blueprint $table) {
            if (Schema::hasColumn('ticket_sub_categories', 'slug')) {
                $table->dropColumn('slug');
            }
            if (Schema::hasColumn('ticket_sub_categories', 'display_order')) {
                $table->dropColumn('display_order');
            }
            if (Schema::hasColumn('ticket_sub_categories', 'sla_minutes')) {
                $table->dropColumn('sla_minutes');
            }
        });

        Schema::table('ticket_assets', function (Blueprint $table) {
            if (Schema::hasColumn('ticket_assets', 'display_order')) {
                $table->dropColumn('display_order');
            }
            if (!Schema::hasColumn('ticket_assets', 'ticket_main_category_id')) {
                $table->foreignId('ticket_main_category_id')->nullable()->constrained()->nullOnDelete()->after('department_id');
            }
            if (!Schema::hasColumn('ticket_assets', 'article_code')) {
                $table->string('article_code', 100)->nullable()->after('ticket_sub_category_id');
            }
        });

        // Migrate old code -> article_code if needed
        if (Schema::hasColumn('ticket_assets', 'code') && Schema::hasColumn('ticket_assets', 'article_code')) {
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
        Schema::table('ticket_main_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_main_categories', 'slug')) {
                $table->string('slug', 160)->nullable();
            }
            if (!Schema::hasColumn('ticket_main_categories', 'display_order')) {
                $table->unsignedInteger('display_order')->default(0);
            }
        });

        Schema::table('ticket_sub_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_sub_categories', 'slug')) {
                $table->string('slug', 160)->nullable();
            }
            if (!Schema::hasColumn('ticket_sub_categories', 'display_order')) {
                $table->unsignedInteger('display_order')->default(0);
            }
            if (!Schema::hasColumn('ticket_sub_categories', 'sla_minutes')) {
                $table->unsignedInteger('sla_minutes')->nullable();
            }
        });

        Schema::table('ticket_assets', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_assets', 'code')) {
                $table->string('code', 80)->nullable();
            }
            if (!Schema::hasColumn('ticket_assets', 'location')) {
                $table->string('location', 150)->nullable();
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
