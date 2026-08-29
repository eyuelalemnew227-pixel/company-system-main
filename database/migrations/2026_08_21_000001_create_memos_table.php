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
        Schema::create('memos', function (Blueprint $table) {
            $table->id();
            $table->string('memo_id', 50)->unique();
            $table->string('title');
            $table->date('memo_date');
            $table->string('sender_name', 100);
            $table->string('sender_position', 100)->nullable();
            $table->string('recipient_name', 100);
            $table->longText('content');
            $table->string('priority', 20)->default('normal');
            $table->json('departments')->nullable();
            $table->json('cc_departments')->nullable();
            $table->string('signature_type', 20)->default('typed');
            $table->text('signature_data')->nullable();
            $table->json('cc_signatures')->nullable();
            $table->string('status', 20)->default('published');
            $table->string('telegram_status', 20)->default('pending');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->string('created_by_username', 100)->nullable();
            $table->timestamps();

            $table->index('memo_id');
            $table->index('created_by');
            $table->index('memo_date');
            $table->index('priority');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('memos');
    }
};
