<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_main_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            $table->string('name', 150);
            $table->string('slug', 160)->unique();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['department_id', 'name']);
        });

        Schema::create('ticket_sub_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_main_category_id')->constrained()->onDelete('cascade');
            $table->string('name', 150);
            $table->string('slug', 160)->unique();
            $table->unsignedInteger('sla_minutes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['ticket_main_category_id', 'name'], 'subcat_main_name_unique');
        });

        Schema::create('ticket_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            $table->foreignId('ticket_sub_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 150);
            $table->string('code', 80)->nullable();
            $table->string('location', 150)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['department_id', 'name', 'ticket_sub_category_id'], 'asset_dept_sub_name_unique');
            $table->index(['ticket_sub_category_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_assets');
        Schema::dropIfExists('ticket_sub_categories');
        Schema::dropIfExists('ticket_main_categories');
    }
};
