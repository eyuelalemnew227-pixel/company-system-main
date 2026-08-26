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
            ['name' => 'Branch Lookup', 'type_identifier' => 'branch_lookup', 'is_active' => true],
            ['name' => 'Department Lookup', 'type_identifier' => 'department_lookup', 'is_active' => true],
            ['name' => 'Employee Lookup', 'type_identifier' => 'employee_lookup', 'is_active' => true],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
