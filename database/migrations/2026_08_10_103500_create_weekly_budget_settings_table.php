<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('weekly_budget_settings', function (Blueprint $table) {
            $table->id();
            $table->string('submission_deadline_day')->default('Friday');
            $table->boolean('is_urgent_enabled')->default(true);
            $table->timestamps();
        });

        // Insert default singleton row
        DB::table('weekly_budget_settings')->insert([
            'submission_deadline_day' => 'Friday',
            'is_urgent_enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('weekly_budget_settings');
    }
};
