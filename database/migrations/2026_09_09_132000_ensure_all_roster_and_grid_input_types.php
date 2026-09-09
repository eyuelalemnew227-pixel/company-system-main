<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $types = [
            [
                'name' => 'Employee Attendance Roster',
                'type_identifier' => 'employee_attendance_roster',
                'is_active' => true,
            ],
            [
                'name' => 'Employee Evaluation Grid',
                'type_identifier' => 'employee_evaluation_grid',
                'is_active' => true,
            ],
            [
                'name' => 'Title / Label',
                'type_identifier' => 'title',
                'is_active' => true,
            ],
        ];

        foreach ($types as $type) {
            $exists = DB::table('form_input_types')->where('type_identifier', $type['type_identifier'])->exists();
            if (!$exists) {
                DB::table('form_input_types')->insert([
                    'name' => $type['name'],
                    'type_identifier' => $type['type_identifier'],
                    'is_active' => $type['is_active'],
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
        DB::table('form_input_types')
            ->whereIn('type_identifier', ['employee_attendance_roster', 'employee_evaluation_grid'])
            ->delete();
    }
};
