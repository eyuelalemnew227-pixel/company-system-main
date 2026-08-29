<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('telegram_settings', function (Blueprint $table) {
            $table->string('training_bot_token')->nullable()->after('pre_order_bot_username');
            $table->string('training_bot_username')->nullable()->after('training_bot_token');
        });
    }

    public function down(): void
    {
        Schema::table('telegram_settings', function (Blueprint $table) {
            $table->dropColumn(['training_bot_token', 'training_bot_username']);
        });
    }
};
