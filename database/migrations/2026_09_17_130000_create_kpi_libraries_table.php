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
        Schema::create('kpi_libraries', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('weight', 8, 2)->default(0.00);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('form_kpi_library', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kpi_library_id')->constrained('kpi_libraries')->cascadeOnDelete();
            $table->foreignId('form_id')->constrained('forms')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['kpi_library_id', 'form_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_kpi_library');
        Schema::dropIfExists('kpi_libraries');
    }
};
