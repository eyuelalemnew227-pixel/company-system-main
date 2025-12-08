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
        // First, remove duplicate entries keeping only the most recent one
        DB::statement('
            DELETE ic1 FROM inventory_counts ic1
            INNER JOIN inventory_counts ic2 
            WHERE ic1.product_id = ic2.product_id 
            AND ic1.inventory_period_id = ic2.inventory_period_id
            AND ic1.id < ic2.id
        ');

        Schema::table('inventory_counts', function (Blueprint $table) {
            $table->unique(['product_id', 'inventory_period_id'], 'unique_product_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_counts', function (Blueprint $table) {
            $table->dropUnique('unique_product_period');
        });
    }
};
