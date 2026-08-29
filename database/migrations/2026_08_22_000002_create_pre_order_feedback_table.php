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
        Schema::create('pre_order_feedback', function (Blueprint $table) {
            $table->id();
            $table->string('chat_id', 50)->nullable()->index();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->tinyInteger('delivery_rating')->nullable();
            $table->tinyInteger('torta_rating')->nullable();
            $table->tinyInteger('service_rating')->nullable();
            $table->text('written_feedback')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pre_order_feedback');
    }
};
