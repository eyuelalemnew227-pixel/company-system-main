<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Drop foreign key constraints if they exist
        Schema::table('purchase_inspection_items', function (Blueprint $table) {
            try {
                $table->dropForeign(['child_category_id']);
            } catch (\Exception $e) {
                // Ignore if foreign key was already dropped or has different name
            }

            try {
                $table->dropForeign(['product_id']);
            } catch (\Exception $e) {
                // Ignore
            }
        });

        // 2. Add API item columns and make child_category_id / product_id nullable
        Schema::table('purchase_inspection_items', function (Blueprint $table) {
            $table->unsignedBigInteger('child_category_id')->nullable()->change();
            $table->unsignedBigInteger('product_id')->nullable()->change();

            if (!Schema::hasColumn('purchase_inspection_items', 'category_name')) {
                $table->string('category_name', 150)->nullable()->after('purchase_inspection_id');
            }
            if (!Schema::hasColumn('purchase_inspection_items', 'item_code')) {
                $table->string('item_code', 100)->nullable()->after('category_name');
            }
            if (!Schema::hasColumn('purchase_inspection_items', 'item_name')) {
                $table->string('item_name', 255)->nullable()->after('item_code');
            }
            if (!Schema::hasColumn('purchase_inspection_items', 'unit_of_measure')) {
                $table->string('unit_of_measure', 50)->nullable()->after('item_name');
            }
            if (!Schema::hasColumn('purchase_inspection_items', 'article_id')) {
                $table->string('article_id', 50)->nullable()->after('unit_of_measure');
            }
            if (!Schema::hasColumn('purchase_inspection_items', 'wac')) {
                $table->decimal('wac', 14, 4)->nullable()->after('inspected_quantity');
            }
        });

        // 3. Backfill any existing items from child_categories and products tables
        DB::statement("
            UPDATE purchase_inspection_items pii
            LEFT JOIN child_categories cc ON pii.child_category_id = cc.id
            LEFT JOIN products p ON pii.product_id = p.id
            SET pii.category_name = COALESCE(pii.category_name, cc.child_name, 'Uncategorized'),
                pii.item_code = COALESCE(pii.item_code, p.product_code, ''),
                pii.item_name = COALESCE(pii.item_name, p.product_name, 'Unknown Item'),
                pii.unit_of_measure = COALESCE(pii.unit_of_measure, p.measurement, 'Pcs')
            WHERE pii.category_name IS NULL OR pii.item_name IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_inspection_items', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_inspection_items', 'category_name')) {
                $table->dropColumn('category_name');
            }
            if (Schema::hasColumn('purchase_inspection_items', 'item_code')) {
                $table->dropColumn('item_code');
            }
            if (Schema::hasColumn('purchase_inspection_items', 'item_name')) {
                $table->dropColumn('item_name');
            }
            if (Schema::hasColumn('purchase_inspection_items', 'unit_of_measure')) {
                $table->dropColumn('unit_of_measure');
            }
            if (Schema::hasColumn('purchase_inspection_items', 'article_id')) {
                $table->dropColumn('article_id');
            }
            if (Schema::hasColumn('purchase_inspection_items', 'wac')) {
                $table->dropColumn('wac');
            }
        });
    }
};
