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
            if (!Schema::hasColumn('purchase_inspection_items', 'tab_type')) {
                $table->string('tab_type', 50)->default('custody_accuracy')->after('purchase_inspection_id')->index();
            }

            if (!Schema::hasColumn('purchase_inspection_items', 'expiry_date')) {
                $table->date('expiry_date')->nullable()->after('inspected_quantity');
            }

            $table->decimal('main_store_balance', 14, 2)->nullable()->default(0)->change();
            $table->decimal('inspected_quantity', 14, 2)->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_inspection_items', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_inspection_items', 'tab_type')) {
                $table->dropIndex(['tab_type']);
                $table->dropColumn('tab_type');
            }

            if (Schema::hasColumn('purchase_inspection_items', 'expiry_date')) {
                $table->dropColumn('expiry_date');
            }

            $table->decimal('main_store_balance', 14, 2)->default(0)->nullable(false)->change();
            $table->decimal('inspected_quantity', 14, 2)->default(0)->nullable(false)->change();
        });
    }
};
