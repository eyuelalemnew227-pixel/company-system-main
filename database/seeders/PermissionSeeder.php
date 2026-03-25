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

        // Evaluation Categories
        Permission::firstOrCreate(['name' => 'view evaluation categories']);
        Permission::firstOrCreate(['name' => 'create evaluation categories']);
        Permission::firstOrCreate(['name' => 'update evaluation categories']);
        Permission::firstOrCreate(['name' => 'delete evaluation categories']);

        // Evaluation Types

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
        Permission::firstOrCreate(['name' => 'view evaluator group column']);


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

        // Evaluation Summary
        Permission::firstOrCreate(['name' => 'view evaluation summary']);

        // Branch Manager Evaluation Summary
        Permission::firstOrCreate(['name' => 'view branch manager evaluation summary']);

        // Inventory Count Summary
        Permission::firstOrCreate(['name' => 'view inventory count summary']);

        // Child Categories
        Permission::firstOrCreate(['name' => 'view child categories']);
        Permission::firstOrCreate(['name' => 'create child categories']);
        Permission::firstOrCreate(['name' => 'update child categories']);
        Permission::firstOrCreate(['name' => 'delete child categories']);

        // Products
        Permission::firstOrCreate(['name' => 'view products']);
        Permission::firstOrCreate(['name' => 'create products']);
        Permission::firstOrCreate(['name' => 'update products']);
        Permission::firstOrCreate(['name' => 'delete products']);

        // Inventory Periods
        Permission::firstOrCreate(['name' => 'view inventory periods']);
        Permission::firstOrCreate(['name' => 'create inventory periods']);
        Permission::firstOrCreate(['name' => 'update inventory periods']);
        Permission::firstOrCreate(['name' => 'delete inventory periods']);

        // Inventory Counts
        Permission::firstOrCreate(['name' => 'view inventory counts']);
        Permission::firstOrCreate(['name' => 'create inventory counts']);
        Permission::firstOrCreate(['name' => 'update inventory counts']);
        Permission::firstOrCreate(['name' => 'delete inventory counts']);
        Permission::firstOrCreate(['name' => 'approve inventory counts']);
        Permission::firstOrCreate(['name' => 'unapprove inventory counts']);

        // Inventory Completion Tracking
        Permission::firstOrCreate(['name' => 'view inventory completion tracking']);

        // Pre-Order Products
        Permission::firstOrCreate(['name' => 'view pre-order products']);
        Permission::firstOrCreate(['name' => 'create pre-order products']);
        Permission::firstOrCreate(['name' => 'update pre-order products']);
        Permission::firstOrCreate(['name' => 'delete pre-order products']);
        Permission::firstOrCreate(['name' => 'update pre-order product regular price']);
        Permission::firstOrCreate(['name' => 'update pre-order product walkin price']);

        // Order Types
        Permission::firstOrCreate(['name' => 'view order types']);
        Permission::firstOrCreate(['name' => 'create order types']);
        Permission::firstOrCreate(['name' => 'update order types']);
        Permission::firstOrCreate(['name' => 'delete order types']);

        // Collection Days
        Permission::firstOrCreate(['name' => 'view collection days']);
        Permission::firstOrCreate(['name' => 'create collection days']);
        Permission::firstOrCreate(['name' => 'update collection days']);
        Permission::firstOrCreate(['name' => 'delete collection days']);

        // Pre-Orders
        Permission::firstOrCreate(['name' => 'view pre-orders']);
        Permission::firstOrCreate(['name' => 'view all pre-orders']); // View orders created by others
        Permission::firstOrCreate(['name' => 'view pre-order details']); // View individual order details
        Permission::firstOrCreate(['name' => 'create all pre-orders']);
        Permission::firstOrCreate(['name' => 'create walkin pre-orders']);
        Permission::firstOrCreate(['name' => 'create regular pre-orders']);
        Permission::firstOrCreate(['name' => 'update all pre-orders']);
        Permission::firstOrCreate(['name' => 'update walkin pre-orders']);
        Permission::firstOrCreate(['name' => 'update regular pre-orders']);
        Permission::firstOrCreate(['name' => 'edit own pre-orders']); // Edit only orders created by themselves
        Permission::firstOrCreate(['name' => 'edit other users pre-orders']); // Edit orders created by other users
        Permission::firstOrCreate(['name' => 'delete pre-orders']);
        Permission::firstOrCreate(['name' => 'update pre-order status']);
        Permission::firstOrCreate(['name' => 'update all pre-order status']);
        Permission::firstOrCreate(['name' => 'mark pre-order as paid']);
        Permission::firstOrCreate(['name' => 'cancel pre-orders']);
        Permission::firstOrCreate(['name' => 'copy pre-order telegram message']);
        Permission::firstOrCreate(['name' => 'send bulk sms reminders']); // Send bulk SMS reminders for pending orders
        Permission::firstOrCreate(['name' => 'view pre-order audit trail']); // View created_by, updated_by, and date columns
        Permission::firstOrCreate(['name' => 'edit collected pre-orders']); // Allow editing orders even if status is Collected
        Permission::firstOrCreate(['name' => 'mark pre-order late payment']); // Allow checking the late payment box

        // SMS Balance & Management
        Permission::firstOrCreate(['name' => 'view sms balance']);
        Permission::firstOrCreate(['name' => 'manage sms settings']); // Activate/Deactivate SMS service

        // My Branch Orders
        Permission::firstOrCreate(['name' => 'view my branch orders']);
        Permission::firstOrCreate(['name' => 'collect branch orders']);
        // Holidays
        Permission::firstOrCreate(['name' => 'view holidays']);
        Permission::firstOrCreate(['name' => 'create holidays']);
        Permission::firstOrCreate(['name' => 'update holidays']);
        Permission::firstOrCreate(['name' => 'delete holidays']);
        // Evaluation Records Management (Global)
        Permission::firstOrCreate(['name' => 'view evaluation records']);
        Permission::firstOrCreate(['name' => 'update evaluation records']);
        Permission::firstOrCreate(['name' => 'delete evaluation records']);

        // Deleted Evaluations (Audit Trail)
        Permission::firstOrCreate(['name' => 'view deleted evaluations']);
        Permission::firstOrCreate(['name' => 'restore deleted evaluations']);
    }
}