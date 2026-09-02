<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Delete all obsolete legacy dot-notation permissions across all categories and transfer role grants to active permissions.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $legacyPermissionMap = [
            // User & Organization
            'branch.create' => 'create branches',
            'branch.delete' => 'delete branches',
            'branch.edit' => 'update branches',
            'branch.view' => 'view branches',
            'department.create' => 'create departments',
            'department.delete' => 'delete departments',
            'department.edit' => 'update departments',
            'department.view' => 'view departments',
            'employee.create' => 'create employees',
            'employee.delete' => 'delete employees',
            'employee.edit' => 'update employees',
            'employee.view' => 'view employees',
            'position.create' => 'create positions',
            'position.delete' => 'delete positions',
            'position.edit' => 'update positions',
            'position.view' => 'view positions',
            'user.create' => 'create users',
            'user.delete' => 'delete users',
            'user.edit' => 'update users',
            'user.view' => 'view users',
            'manager.create' => 'create managers',
            'manager.delete' => 'delete managers',
            'manager.edit' => 'update managers',
            'manager.view' => 'view managers',
            'employee.directory.view' => 'view employee directory',
            'preorder.view_branch' => 'view my branch orders',
            'budget.department.manage' => 'view department budgets',
            'budget.department.view' => 'view department budgets',
            'budget.expense.own_branch' => 'view only own branch expense budgets',
            'budget.expense.own_department' => 'view only own department expense budgets',
            'evaluation.summary.branch_manager' => 'view branch manager evaluation summary',

            // Roles & Access Control
            'permission.create' => 'create permissions',
            'permission.delete' => 'delete permissions',
            'permission.edit' => 'update permissions',
            'permission.view' => 'view permissions',
            'role.create' => 'create roles',
            'role.delete' => 'delete roles',
            'role.edit' => 'update roles',
            'role.view' => 'view roles',

            // System & General
            'dashboard.view' => 'view dashboard',
            'fiscal.year.create' => 'create fiscal years',
            'fiscal.year.delete' => 'delete fiscal years',
            'fiscal.year.edit' => 'update fiscal years',
            'fiscal.year.view' => 'view fiscal years',
            'fiscal.month.create' => 'create fiscal months',
            'fiscal.month.delete' => 'delete fiscal months',
            'fiscal.month.edit' => 'update fiscal months',
            'fiscal.month.view' => 'view fiscal months',
            'holiday.create' => 'create holidays',
            'holiday.delete' => 'delete holidays',
            'holiday.edit' => 'update holidays',
            'holiday.view' => 'view holidays',
            'holiday.view_all' => 'view all holidays',
            'external_links.manage' => 'manage external links',
            'external_links.view' => 'view external links',
            'spare_parts.create' => 'create spare parts',
            'spare_parts.delete' => 'delete spare parts',
            'spare_parts.edit' => 'update spare parts',
            'spare_parts.view' => 'view spare parts',
            'edit_request.view' => null,
            'edit_request.delete' => null,
            'edit_request.mark_done' => null,
            'edit_request.settings' => null,
            'create edit requests' => null,
            'approve edit requests' => null,

            // Inventory & Assets
            'product.create' => 'create products',
            'product.delete' => 'delete products',
            'product.edit' => 'update products',
            'product.view' => 'view products',
            'product.category.create' => 'create child categories',
            'product.category.delete' => 'delete child categories',
            'product.category.edit' => 'update child categories',
            'product.category.view' => 'view child categories',
            'spare_parts.category.create' => 'create spare part categories',
            'spare_parts.category.delete' => 'delete spare part categories',
            'spare_parts.category.edit' => 'update spare part categories',
            'spare_parts.category.view' => 'view spare part categories',
            'inventory.all_branches.manage' => 'view inventory completion tracking',

            // Pre-Orders & Sales
            'preorder.view' => 'view pre-orders',
            'preorder.view_all' => 'view all pre-orders',
            'preorder.details.view' => 'view pre-order details',
            'preorder.create.regular' => 'create regular pre-orders',
            'preorder.create.walkin' => 'create walkin pre-orders',
            'preorder.update_all' => 'update all pre-orders',
            'preorder.edit.own' => 'edit own pre-orders',
            'preorder.edit.other' => 'edit other users pre-orders',
            'preorder.edit.collected' => 'edit collected pre-orders',
            'preorder.delete' => 'delete pre-orders',
            'preorder.status.update' => 'update pre-order status',
            'preorder.status.update_all' => 'update all pre-order status',
            'preorder.paid.mark' => 'mark pre-order as paid',
            'preorder.paid.late' => 'mark pre-order late payment',
            'preorder.paid.override' => null,
            'preorder.audit.view' => 'view pre-order audit trail',
            'preorder.collection_days.create' => 'create collection days',
            'preorder.collection_days.delete' => 'delete collection days',
            'preorder.collection_days.edit' => 'update collection days',
            'preorder.collection_days.view' => 'view collection days',
            'preorder.order_type.create' => 'create order types',
            'preorder.order_type.delete' => 'delete order types',
            'preorder.order_type.edit' => 'update order types',
            'preorder.order_type.view' => 'view order types',
            'preorder.product.view' => 'view pre-order products',
            'preorder.product.create' => 'create pre-order products',
            'preorder.product.edit' => 'update pre-order products',
            'preorder.product.delete' => 'delete pre-order products',
            'preorder.product.price.regular' => 'update pre-order product regular price',
            'preorder.product.price.walkin' => 'update pre-order product walkin price',
            'broadcast telegram notice' => 'send telegram broadcast',

            // Telegram Integration
            'telegram.view' => 'view telegram config',
            'telegram.manage' => 'manage telegram config',
            'finance.banks.branches.manage' => 'manage banks',
        ];

        foreach ($legacyPermissionMap as $oldName => $newName) {
            $oldPerm = Permission::where('name', $oldName)->first();
            if ($oldPerm) {
                if ($newName) {
                    $newPerm = Permission::firstOrCreate(['name' => $newName, 'guard_name' => 'web']);
                    
                    // Transfer existing role assignments to active permission
                    $rolesWithOldPerm = Role::whereHas('permissions', function ($q) use ($oldName) {
                        $q->where('name', $oldName);
                    })->get();

                    foreach ($rolesWithOldPerm as $role) {
                        if (!$role->hasPermissionTo($newPerm)) {
                            $role->givePermissionTo($newPerm);
                        }
                    }
                }

                // Delete old duplicate permission
                $oldPerm->delete();
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // No action needed on rollback
    }
};
