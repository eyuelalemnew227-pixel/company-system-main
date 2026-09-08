<?php

use App\Models\OrderType;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $sources = [
            'Facebook',
            'Instagram',
            'TikTok',
            'SMS',
            'Telegram Bot',
            'Friend Referral',
            'Walkin Customer',
        ];

        foreach ($sources as $sourceName) {
            OrderType::firstOrCreate(
                ['name' => $sourceName],
                ['status' => 'Active']
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
