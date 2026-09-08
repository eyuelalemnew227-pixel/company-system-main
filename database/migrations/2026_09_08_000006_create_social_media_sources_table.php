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
        if (!Schema::hasTable('social_media_sources')) {
            Schema::create('social_media_sources', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->boolean('is_active')->default(true);
                $table->integer('display_order')->default(0);
                $table->timestamps();
            });

            // Seed initial default social media sources
            $defaultSources = [
                'Facebook',
                'Instagram',
                'TikTok',
                'Telegram Bot',
                'Friend Referral',
                'Walkin Customer',
                'SMS',
            ];

            foreach ($defaultSources as $index => $name) {
                DB::table('social_media_sources')->insertOrIgnore([
                    'name' => $name,
                    'is_active' => true,
                    'display_order' => $index,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_media_sources');
    }
};
