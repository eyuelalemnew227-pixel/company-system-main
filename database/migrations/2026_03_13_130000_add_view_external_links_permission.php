<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('permissions')) {
            return;
        }

        $now = now();
        foreach (['view external links', 'manage external links'] as $perm) {
            $exists = DB::table('permissions')->where('name', $perm)->exists();
            if (! $exists) {
                DB::table('permissions')->insert([
                    'name' => $perm,
                    'guard_name' => 'web',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('permissions')) {
            return;
        }

        DB::table('permissions')->where('name', 'view external links')->delete();
    }
};
