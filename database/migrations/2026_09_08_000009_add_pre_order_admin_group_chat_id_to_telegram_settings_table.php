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
            if (!Schema::hasColumn('telegram_settings', 'pre_order_admin_group_chat_id')) {
                $table->string('pre_order_admin_group_chat_id')->nullable()->after('training_bot_username');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('telegram_settings', function (Blueprint $table) {
            if (Schema::hasColumn('telegram_settings', 'pre_order_admin_group_chat_id')) {
                $table->dropColumn('pre_order_admin_group_chat_id');
            }
        });
    }
};
