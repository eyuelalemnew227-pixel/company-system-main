<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
            if (!Schema::hasColumn('ticket_assets', 'display_order')) {
                $table->unsignedInteger('display_order')->default(0);
            }
        });
    }
};
