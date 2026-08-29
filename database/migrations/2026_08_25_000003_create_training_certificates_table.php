<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('training_certificates');
        Schema::enableForeignKeyConstraints();

        Schema::create('training_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
            $table->foreignId('enrollment_id')->nullable()->constrained('training_enrollments')->nullOnDelete();
            $table->string('certificate_number')->unique();
            $table->timestamp('issue_date')->useCurrent();
            $table->timestamp('expiry_date')->nullable();
            $table->text('qr_code_data')->nullable();
            $table->string('pdf_path')->nullable();
            $table->boolean('is_revoked')->default(false);
            $table->string('revoked_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_certificates');
    }
};
