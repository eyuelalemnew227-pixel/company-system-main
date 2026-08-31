<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pre_order_payment_settings', function (Blueprint $table) {
            $table->string('payment_type')->default('Bank')->after('payment_method');
            $table->string('validation_type')->default('Regex Validation')->after('payment_type');
            $table->string('reference_prefix')->nullable()->after('example');
            $table->boolean('auto_fill_prefix')->default(false)->after('reference_prefix');
            $table->integer('reference_length')->nullable()->after('auto_fill_prefix');
            $table->boolean('reference_required')->default(true)->after('reference_length');
        });

        // Migrate existing data
        DB::table('pre_order_payment_settings')->where('payment_method', 'CBE')->update([
            'payment_type' => 'Bank',
            'validation_type' => 'Regex Validation',
            'reference_prefix' => 'FT26',
            'auto_fill_prefix' => true,
            'reference_length' => 12,
            'reference_required' => true,
        ]);

        DB::table('pre_order_payment_settings')->where('payment_method', 'Telebirr')->update([
            'payment_type' => 'Mobile Money',
            'validation_type' => 'Regex Validation',
            'reference_prefix' => 'D',
            'auto_fill_prefix' => false,
            'reference_length' => 10,
            'reference_required' => true,
        ]);

        DB::table('pre_order_payment_settings')->where('payment_method', 'RTGS (Bank to Other Bank)')->update([
            'payment_type' => 'RTGS',
            'validation_type' => 'No Validation',
            'reference_prefix' => null,
            'auto_fill_prefix' => false,
            'reference_length' => null,
            'reference_required' => false,
            'validation_pattern' => null,
            'example' => null,
        ]);

        Schema::table('pre_orders', function (Blueprint $table) {
            DB::statement("ALTER TABLE pre_orders DROP CONSTRAINT check_paid_orders_payment");
            // Add a more generic constraint: if it's Paid, payment_method must be present.
            // Transaction reference validation will be handled at the backend based on dynamic rules.
            DB::statement("ALTER TABLE pre_orders ADD CONSTRAINT check_paid_orders_payment CHECK (status != 'Paid' OR payment_method IS NOT NULL)");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pre_orders', function (Blueprint $table) {
            DB::statement("ALTER TABLE pre_orders DROP CONSTRAINT check_paid_orders_payment");
            DB::statement("ALTER TABLE pre_orders ADD CONSTRAINT check_paid_orders_payment CHECK (status != 'Paid' OR (payment_method IS NOT NULL AND (transaction_reference IS NOT NULL OR voucher_code IS NOT NULL OR payment_method = 'RTGS (Bank to Other Bank)')))");
        });

        Schema::table('pre_order_payment_settings', function (Blueprint $table) {
            $table->dropColumn([
                'payment_type',
                'validation_type',
                'reference_prefix',
                'auto_fill_prefix',
                'reference_length',
                'reference_required',
            ]);
        });
    }
};
