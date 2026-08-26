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
        DB::table('form_input_types')->insert([
            ['name' => 'Number', 'type_identifier' => 'number', 'is_active' => true],
            ['name' => 'Date', 'type_identifier' => 'date', 'is_active' => true],
            ['name' => 'Time', 'type_identifier' => 'time', 'is_active' => true],
            ['name' => 'Signature', 'type_identifier' => 'signature', 'is_active' => true],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('form_input_types')->whereIn('type_identifier', ['number', 'date', 'time', 'signature'])->delete();
    }
};
