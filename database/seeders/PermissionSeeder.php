<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Dashboard
        Permission::firstOrCreate(['name' => 'view dashboard']);

        // Permissions
        Permission::firstOrCreate(['name' => 'view permissions']);
        Permission::firstOrCreate(['name' => 'create permissions']);
        Permission::firstOrCreate(['name' => 'update permissions']);
        Permission::firstOrCreate(['name' => 'delete permissions']);

        // Roles
        Permission::firstOrCreate(['name' => 'view roles']);
        Permission::firstOrCreate(['name' => 'create roles']);
        Permission::firstOrCreate(['name' => 'update roles']);
        Permission::firstOrCreate(['name' => 'delete roles']);

        // Users
        Permission::firstOrCreate(['name' => 'view users']);
        Permission::firstOrCreate(['name' => 'create users']);
        Permission::firstOrCreate(['name' => 'update users']);
        Permission::firstOrCreate(['name' => 'delete users']);

        // Departments
        Permission::firstOrCreate(['name' => 'view departments']);
        Permission::firstOrCreate(['name' => 'create departments']);
        Permission::firstOrCreate(['name' => 'update departments']);
        Permission::firstOrCreate(['name' => 'delete departments']);

        // Branches
        Permission::firstOrCreate(['name' => 'view branches']);
        Permission::firstOrCreate(['name' => 'create branches']);
        Permission::firstOrCreate(['name' => 'update branches']);
        Permission::firstOrCreate(['name' => 'delete branches']);

        // Positions
        Permission::firstOrCreate(['name' => 'view positions']);
        Permission::firstOrCreate(['name' => 'create positions']);
        Permission::firstOrCreate(['name' => 'update positions']);
        Permission::firstOrCreate(['name' => 'delete positions']);

        // Employees
        Permission::firstOrCreate(['name' => 'view employees']);
        Permission::firstOrCreate(['name' => 'create employees']);
        Permission::firstOrCreate(['name' => 'update employees']);
        Permission::firstOrCreate(['name' => 'delete employees']);

        // Managers
        Permission::firstOrCreate(['name' => 'view managers']);
        Permission::firstOrCreate(['name' => 'create managers']);
        Permission::firstOrCreate(['name' => 'update managers']);
        Permission::firstOrCreate(['name' => 'delete managers']);

        // Evaluation Types
        Permission::firstOrCreate(['name' => 'view evaluation types']);
        Permission::firstOrCreate(['name' => 'create evaluation types']);
        Permission::firstOrCreate(['name' => 'update evaluation types']);
        Permission::firstOrCreate(['name' => 'delete evaluation types']);

        // Question Groups
        Permission::firstOrCreate(['name' => 'view question groups']);
        Permission::firstOrCreate(['name' => 'create question groups']);
        Permission::firstOrCreate(['name' => 'update question groups']);
        Permission::firstOrCreate(['name' => 'delete question groups']);

        // Questions
        Permission::firstOrCreate(['name' => 'view questions']);
        Permission::firstOrCreate(['name' => 'create questions']);
        Permission::firstOrCreate(['name' => 'update questions']);
        Permission::firstOrCreate(['name' => 'delete questions']);

        // Evaluator Groups
        Permission::firstOrCreate(['name' => 'view evaluator groups']);
        Permission::firstOrCreate(['name' => 'create evaluator groups']);
        Permission::firstOrCreate(['name' => 'update evaluator groups']);
        Permission::firstOrCreate(['name' => 'delete evaluator groups']);

        // Evaluates Groups
        Permission::firstOrCreate(['name' => 'view evaluates groups']);
        Permission::firstOrCreate(['name' => 'create evaluates groups']);
        Permission::firstOrCreate(['name' => 'update evaluates groups']);
        Permission::firstOrCreate(['name' => 'delete evaluates groups']);

        // Other Evaluables
        Permission::firstOrCreate(['name' => 'view other evaluables']);
        Permission::firstOrCreate(['name' => 'create other evaluables']);
        Permission::firstOrCreate(['name' => 'update other evaluables']);
        Permission::firstOrCreate(['name' => 'delete other evaluables']);

        // Evaluations
        Permission::firstOrCreate(['name' => 'view evaluations']);
        Permission::firstOrCreate(['name' => 'create evaluations']);
        Permission::firstOrCreate(['name' => 'update evaluations']);
        Permission::firstOrCreate(['name' => 'delete evaluations']);


        // Fiscal Years
        Permission::firstOrCreate(['name' => 'view fiscal years']);
        Permission::firstOrCreate(['name' => 'create fiscal years']);
        Permission::firstOrCreate(['name' => 'update fiscal years']);
        Permission::firstOrCreate(['name' => 'delete fiscal years']);

        // Fiscal Months
        Permission::firstOrCreate(['name' => 'view fiscal months']);
        Permission::firstOrCreate(['name' => 'create fiscal months']);
        Permission::firstOrCreate(['name' => 'update fiscal months']);
        Permission::firstOrCreate(['name' => 'delete fiscal months']);

        // Evaluation Periods
        Permission::firstOrCreate(['name' => 'view evaluation periods']);
        Permission::firstOrCreate(['name' => 'create evaluation periods']);
        Permission::firstOrCreate(['name' => 'update evaluation periods']);
        Permission::firstOrCreate(['name' => 'delete evaluation periods']);

        // Evaluation Responses
        Permission::firstOrCreate(['name' => 'view evaluation responses']);
        Permission::firstOrCreate(['name' => 'create evaluation responses']);
        Permission::firstOrCreate(['name' => 'update evaluation responses']);
        Permission::firstOrCreate(['name' => 'delete evaluation responses']);

        // Evaluator Completion Tracking
        Permission::firstOrCreate(['name' => 'view evaluator completion']);
    }
}