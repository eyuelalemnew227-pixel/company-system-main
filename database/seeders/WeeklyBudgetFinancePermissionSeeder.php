<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class WeeklyBudgetFinancePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'view finance budgets',
            'manage finance budgets',
        ];

        foreach ($permissions as $permName) {
            Permission::updateOrCreate(
                ['name' => $permName, 'guard_name' => 'web'],
            );
        }

        // Assign both permissions to the Admin role if it exists
        $adminRole = Role::where('name', 'Admin')->orWhere('name', 'admin')->first();
        if ($adminRole) {
            $adminRole->givePermissionTo($permissions);
        }
    }
}
