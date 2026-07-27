<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class WeeklyBudgetActivityLogPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permission = 'view weekly budget activity logs';

        Permission::updateOrCreate(
            ['name' => $permission, 'guard_name' => 'web'],
        );

        $adminRole = Role::where('name', 'Admin')->orWhere('name', 'admin')->first();

        if ($adminRole) {
            $adminRole->givePermissionTo($permission);
        }
    }
}
