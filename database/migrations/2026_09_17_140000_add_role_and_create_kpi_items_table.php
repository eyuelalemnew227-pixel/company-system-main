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
        // 1. Create master kpi_items catalog
        Schema::create('kpi_items', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 2. Add role_id and kpi_item_id to kpi_libraries
        Schema::table('kpi_libraries', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('id')->constrained('roles')->nullOnDelete();
            $table->foreignId('kpi_item_id')->nullable()->after('role_id')->constrained('kpi_items')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpi_libraries', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['kpi_item_id']);
            $table->dropColumn(['role_id', 'kpi_item_id']);
        });

        Schema::dropIfExists('kpi_items');
    }
};
