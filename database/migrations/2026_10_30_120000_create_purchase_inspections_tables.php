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
        Schema::create('purchase_inspections', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no')->unique();
            $table->foreignId('inspector_id')->constrained('users')->cascadeOnDelete();
            $table->date('inspection_date');
            $table->string('store_name')->default('M/Store');
            $table->string('status', 30)->default('draft'); // draft, submitted, approved, rejected
            $table->text('notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'inspection_date']);
        });

        Schema::create('purchase_inspection_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_inspection_id')->constrained('purchase_inspections')->cascadeOnDelete();
            $table->foreignId('child_category_id')->constrained('child_categories')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->decimal('main_store_balance', 14, 2)->default(0);
            $table->decimal('inspected_quantity', 14, 2)->default(0);
            $table->string('unit_of_measure', 50)->nullable();
            $table->string('status', 20)->default('pass'); // pass, fail
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['purchase_inspection_id', 'product_id'], 'pi_items_inspection_prod_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_inspection_items');
        Schema::dropIfExists('purchase_inspections');
    }
};
