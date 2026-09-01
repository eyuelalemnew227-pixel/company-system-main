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
        Schema::create('form_user_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Capabilities
            $table->boolean('can_edit_schema')->default(false);
            $table->boolean('can_fill_submissions')->default(false);
            $table->boolean('can_view_submissions')->default(false);
            $table->boolean('can_edit_submissions')->default(false);
            $table->boolean('can_delete_submissions')->default(false);

            $table->timestamps();

            // A user should only have one permission row mapped to a distinct form at max.
            $table->unique(['form_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_user_permissions');
    }
};
