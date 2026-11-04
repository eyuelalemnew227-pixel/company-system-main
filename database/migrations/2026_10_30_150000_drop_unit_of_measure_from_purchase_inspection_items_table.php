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
        Schema::table('purchase_inspection_items', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_inspection_items', 'unit_of_measure')) {
                $table->dropColumn('unit_of_measure');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_inspection_items', function (Blueprint $table) {
            $table->string('unit_of_measure', 50)->nullable()->after('inspected_quantity');
        });
    }
};
