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
        \Illuminate\Support\Facades\DB::table('form_input_types')->insert([
            ['name' => '5-Star Rating', 'type_identifier' => 'rating_stars', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Number Slider (1-10)', 'type_identifier' => 'rating_slider', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Illuminate\Support\Facades\DB::table('form_input_types')
            ->whereIn('type_identifier', ['rating_stars', 'rating_slider'])
            ->delete();
    }
};
