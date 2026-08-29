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
            $table->string('pre_order_bot_token')->nullable()->after('memo_bot_username');
            $table->string('pre_order_bot_username')->nullable()->after('pre_order_bot_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('telegram_settings', function (Blueprint $table) {
            $table->dropColumn(['pre_order_bot_token', 'pre_order_bot_username']);
        });
    }
};
