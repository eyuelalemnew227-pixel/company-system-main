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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('min_count_threshold', 10, 2)->nullable()->after('unit_cost');
            $table->decimal('max_count_threshold', 10, 2)->nullable()->after('min_count_threshold');
            $table->decimal('variance_percentage', 5, 2)->nullable()->default(20.00)->after('max_count_threshold');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['min_count_threshold', 'max_count_threshold', 'variance_percentage']);
        });
    }
};
