<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pre_order_products', function (Blueprint $table) {
            $table->boolean('has_discount')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('pre_order_products', function (Blueprint $table) {
            $table->dropColumn('has_discount');
        });
    }
};
