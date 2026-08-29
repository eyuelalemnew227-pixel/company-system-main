<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sop_documents', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('title');
            $table->string('version');
            $table->string('category');
            $table->string('file_path')->nullable();
            $table->longText('content')->nullable();
            $table->date('effective_date')->nullable();
            $table->boolean('requires_acknowledgement')->default(true);
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('sop_acknowledgements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('sop_id')->constrained('sop_documents')->cascadeOnDelete();
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->timestamp('acknowledged_at')->useCurrent();
            $table->string('ip_address')->nullable();
            $table->string('digital_signature')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sop_acknowledgements');
        Schema::dropIfExists('sop_documents');
    }
};
