<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->enum('type', ['course_assigned', 'deadline', 'quiz', 'assignment', 'completion', 'certificate', 'sop', 'system']);
            $table->string('title');
            $table->text('body');
            $table->string('action_url')->nullable();
            $table->string('channels')->default('inapp');
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('notification_recipients', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('notification_id')->constrained('notifications')->cascadeOnDelete();
            $table->foreignUlid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('email_sent_at')->nullable();
            $table->timestamp('telegram_sent_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['notification_id', 'employee_id']);
        });

        Schema::create('telegram_accounts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('chat_id')->unique();
            $table->string('username')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->string('link_code')->nullable();
            $table->timestamp('linked_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_accounts');
        Schema::dropIfExists('notification_recipients');
        Schema::dropIfExists('notifications');
    }
};
