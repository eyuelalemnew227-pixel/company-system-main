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
            $table->unsignedBigInteger('holiday_id')->nullable()->after('collection_day_id');
            $table->foreign('holiday_id')->references('id')->on('holidays')->onDelete('set null');
        });

        // Sync existing data from collection_days to pre_orders
        DB::statement("
            UPDATE pre_orders 
            SET holiday_id = (SELECT holiday_id FROM collection_days WHERE collection_days.id = pre_orders.collection_day_id)
            WHERE collection_day_id IS NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pre_orders', function (Blueprint $table) {
            $table->dropForeign(['holiday_id']);
            $table->dropColumn('holiday_id');
        });
    }

};
