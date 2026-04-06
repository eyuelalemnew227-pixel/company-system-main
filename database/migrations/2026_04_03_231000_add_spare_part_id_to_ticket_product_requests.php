<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ticket_product_requests', function (Blueprint $table) {
            // Make product_id nullable
            $table->unsignedBigInteger('product_id')->nullable()->change();

            // Add spare_part_id
            if (!Schema::hasColumn('ticket_product_requests', 'spare_part_id')) {
                $table->unsignedBigInteger('spare_part_id')->nullable()->after('product_id');
                $table->foreign('spare_part_id')->references('id')->on('spare_parts')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ticket_product_requests', function (Blueprint $table) {
            $table->dropForeign(['spare_part_id']);
            $table->dropColumn('spare_part_id');
            $table->unsignedBigInteger('product_id')->nullable(false)->change();
        });
    }
};
