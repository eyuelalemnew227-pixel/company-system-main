<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('external_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('external_link_section_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('href');
            $table->string('icon')->nullable();
            $table->string('permission')->nullable();
            $table->string('target')->nullable();
            $table->string('rel')->nullable();
            $table->boolean('is_external')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('sort')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_links');
    }
};
