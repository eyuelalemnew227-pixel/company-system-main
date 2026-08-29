<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('training_sop_acknowledgements');
        Schema::dropIfExists('training_sop_documents');
        Schema::enableForeignKeyConstraints();

        Schema::create('training_sop_documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('version')->default('1.0');
            $table->string('category')->default('General');
            $table->string('file_path')->nullable();
            $table->longText('content')->nullable();
            $table->date('effective_date')->nullable();
            $table->boolean('requires_acknowledgement')->default(true);
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->timestamps();
        });

        Schema::create('training_sop_acknowledgements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sop_id')->constrained('training_sop_documents')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->timestamp('acknowledged_at')->useCurrent();
            $table->string('ip_address')->nullable();
            $table->string('digital_signature')->nullable();
            $table->timestamps();
            $table->unique(['sop_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_sop_acknowledgements');
        Schema::dropIfExists('training_sop_documents');
    }
};
