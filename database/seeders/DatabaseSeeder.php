<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Database\Seeders\TicketPermissionSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            TicketPermissionSeeder::class,
            TelecomPermissionSeeder::class,
            ExpenseBudgetPermissionSeeder::class,
            SalesBudgetPermissionSeeder::class,
            WeeklyBudgetPermissionSeeder::class,
            WeeklyBudgetActivityLogPermissionSeeder::class,
            WeeklyBudgetCeoPermissionSeeder::class,
            WeeklyBudgetDepartmentPermissionSeeder::class,
            WeeklyBudgetFinancePermissionSeeder::class,
            WeeklyBudgetSummaryPermissionSeeder::class,
            PreOrderCostPermissionSeeder::class,
            PreOrderTargetPermissionSeeder::class,
            BankPermissionSeeder::class,
        ]);
    }
}
