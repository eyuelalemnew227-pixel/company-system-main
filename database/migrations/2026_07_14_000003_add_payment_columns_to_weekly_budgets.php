<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('weekly_budgets', function (Blueprint $table) {
            $table->foreignId('payment_category_id')
                ->nullable()
                ->constrained('payment_categories')
                ->onDelete('set null');
            $table->foreignId('payment_type_id')
                ->nullable()
                ->constrained('payment_types')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('weekly_budgets', function (Blueprint $table) {
            $table->dropForeign(['payment_category_id']);
            $table->dropColumn('payment_category_id');
            $table->dropForeign(['payment_type_id']);
            $table->dropColumn('payment_type_id');
        });
    }
};
