<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class WeeklyBudgetSummaryPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'view weekly budget summary',
        ];

        foreach ($permissions as $permName) {
            Permission::updateOrCreate(
                ['name' => $permName, 'guard_name' => 'web'],
            );
        }

        // Assign permission to the Admin role if it exists
        $adminRole = Role::where('name', 'Admin')->orWhere('name', 'admin')->first();
        if ($adminRole) {
            $adminRole->givePermissionTo($permissions);
        }
    }
}
