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
        Schema::table('pre_order_payment_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('pre_order_payment_settings', 'account_name')) {
                $table->string('account_name')->nullable()->after('payment_method');
            }
            if (!Schema::hasColumn('pre_order_payment_settings', 'account_number')) {
                $table->string('account_number')->nullable()->after('account_name');
            }
            if (!Schema::hasColumn('pre_order_payment_settings', 'instructions')) {
                $table->text('instructions')->nullable()->after('account_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pre_order_payment_settings', function (Blueprint $table) {
            if (Schema::hasColumn('pre_order_payment_settings', 'account_name')) {
                $table->dropColumn('account_name');
            }
            if (Schema::hasColumn('pre_order_payment_settings', 'account_number')) {
                $table->dropColumn('account_number');
            }
            if (Schema::hasColumn('pre_order_payment_settings', 'instructions')) {
                $table->dropColumn('instructions');
            }
        });
    }
};
