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
        Schema::table('pre_orders', function (Blueprint $table) {
            DB::statement("ALTER TABLE pre_orders ADD CONSTRAINT check_paid_orders_payment CHECK (status != 'Paid' OR (payment_method IS NOT NULL AND (transaction_reference IS NOT NULL OR voucher_code IS NOT NULL OR payment_method = 'RTGS (Bank to Other Bank)')))");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pre_orders', function (Blueprint $table) {
            DB::statement("ALTER TABLE pre_orders DROP CONSTRAINT check_paid_orders_payment");
        });
    }
};
