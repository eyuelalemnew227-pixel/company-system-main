<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Insert the new permission – you will assign it manually to admin later
        DB::table('permissions')->insert([
            [
                'name' => 'override_paid_status',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('permissions')->where('name', 'override_paid_status')->delete();
    }
};
