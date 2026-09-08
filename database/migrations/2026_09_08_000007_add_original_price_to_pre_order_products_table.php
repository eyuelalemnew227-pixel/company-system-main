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
        if (Schema::hasTable('pre_order_products') && !Schema::hasColumn('pre_order_products', 'original_price')) {
            Schema::table('pre_order_products', function (Blueprint $table) {
                $table->decimal('original_price', 10, 2)->nullable()->after('unit_price');
            });

            // Backfill original_price with walkin_price or unit_price for existing records
            DB::table('pre_order_products')->whereNull('original_price')->update([
                'original_price' => DB::raw('COALESCE(walkin_price, unit_price)')
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('pre_order_products') && Schema::hasColumn('pre_order_products', 'original_price')) {
            Schema::table('pre_order_products', function (Blueprint $table) {
                $table->dropColumn('original_price');
            });
        }
    }
};
