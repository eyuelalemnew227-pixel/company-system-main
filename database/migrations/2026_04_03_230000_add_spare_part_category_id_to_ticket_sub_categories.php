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
        Schema::table('ticket_sub_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_sub_categories', 'spare_part_category_id')) {
                $table->unsignedBigInteger('spare_part_category_id')->nullable()->after('child_category_id');
                $table->foreign('spare_part_category_id')->references('id')->on('spare_part_categories')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ticket_sub_categories', function (Blueprint $table) {
            $table->dropForeign(['spare_part_category_id']);
            $table->dropColumn('spare_part_category_id');
        });
    }
};
