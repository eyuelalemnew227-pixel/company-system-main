<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('telegram_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('telegram_settings', 'helpdesk_bot_token')) {
                $table->string('helpdesk_bot_token')->nullable()->after('bot_token');
            }
            if (!Schema::hasColumn('telegram_settings', 'helpdesk_bot_username')) {
                $table->string('helpdesk_bot_username')->nullable()->after('helpdesk_bot_token');
            }
            if (!Schema::hasColumn('telegram_settings', 'budget_bot_token')) {
                $table->string('budget_bot_token')->nullable()->after('helpdesk_bot_username');
            }
            if (!Schema::hasColumn('telegram_settings', 'budget_bot_username')) {
                $table->string('budget_bot_username')->nullable()->after('budget_bot_token');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('telegram_settings', function (Blueprint $table) {
            $table->dropColumn([
                'helpdesk_bot_token',
                'helpdesk_bot_username',
                'budget_bot_token',
                'budget_bot_username',
            ]);
        });
    }
};
