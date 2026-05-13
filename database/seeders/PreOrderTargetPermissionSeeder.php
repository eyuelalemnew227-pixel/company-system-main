<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PreOrderTargetPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Create permission
        $permission = Permission::updateOrCreate(
            ['name' => 'manage pre-order targets', 'guard_name' => 'web']
        );

        // Assign to Admin role
        $adminRole = Role::where('name', 'Admin')->first();
        if ($adminRole) {
            $adminRole->givePermissionTo($permission);
        }
    }
}
