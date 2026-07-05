<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class ExpenseBudgetPermissionSeeder extends Seeder
{
    public function run(): void
    {
        Permission::updateOrCreate(
            ['name' => config('expense_budget.permissions.manage_anytime', 'manage expense budget anytime'), 'guard_name' => 'web'],
        );

        Permission::updateOrCreate(
            ['name' => config('expense_budget.permissions.manage_windowed', 'manage expense budget within time window'), 'guard_name' => 'web'],
        );

        Permission::updateOrCreate(
            ['name' => config('expense_budget.permissions.view', 'view expense budgets'), 'guard_name' => 'web'],
        );
    }
}
