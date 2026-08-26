<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('form_choices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_question_id')->constrained('form_questions')->cascadeOnDelete();
            $table->string('label');
            $table->string('value');
            $table->integer('order_index')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_choices');
    }
};
