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
        Schema::table('pre_order_products', function (Blueprint $table) {
            if (!Schema::hasColumn('pre_order_products', 'walkin_price')) {
                $table->decimal('walkin_price', 10, 2)->after('unit_price')->default(0);
                // Set walkin_price to match unit_price for existing products
                DB::table('pre_order_products')->update([
                    'walkin_price' => DB::raw('unit_price')
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pre_order_products', function (Blueprint $table) {
            $table->dropColumn('walkin_price');
        });
    }
};
