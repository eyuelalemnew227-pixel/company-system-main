<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if already exists to ensure idempotency
        $exists = DB::table('form_input_types')->where('type_identifier', 'title')->exists();
        if (!$exists) {
            DB::table('form_input_types')->insert([
                'name' => 'Title / Label',
                'type_identifier' => 'title',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('form_input_types')
            ->where('type_identifier', 'title')
            ->delete();
    }
};
