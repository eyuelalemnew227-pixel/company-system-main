<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Delete obsolete dot-notation duplicate permissions and migrate role grants to active permissions.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Mapping of obsolete dot-notation permission => active system permission
        $permissionMappings = [
            'preorder.costs.manage' => 'manage pre-order costs',
            'budget.expense.anytime' => 'manage expense budget anytime',
            'budget.expense.timewindow' => 'manage expense budget within time window',
            'budget.sales.manage' => 'manage sales budget',
            'budget.weekly.view' => 'view weekly budgets',
            'budget.weekly.manage' => 'manage weekly budget periods',
            'preorder.payment.settings' => 'manage pre-order payment settings',
            'budget.weekly.logs' => null,
            'budget.ceo.view' => 'view ceo budgets',
            'budget.ceo.manage' => null,
            'budget.finance.view' => 'view finance budgets',
            'budget.finance.manage' => 'manage finance budgets',
            'budget.weekly.summary' => null,
            'budget.expense.all_except_ho' => 'view all branches except HO expense budgets',
            'finance.bank.view' => 'view bank balance',
            'finance.banks.manage' => 'manage banks',
            'finance.bank.manage' => 'manage bank balance',
        ];

        foreach ($permissionMappings as $oldName => $newName) {
            $oldPerm = Permission::where('name', $oldName)->first();
            if ($oldPerm) {
                // If there's an active replacement permission, transfer any role assignments
                if ($newName) {
                    $newPerm = Permission::firstOrCreate(['name' => $newName, 'guard_name' => 'web']);
                    
                    // Transfer roles from old to new
                    $rolesWithOldPerm = Role::whereHas('permissions', function ($q) use ($oldName) {
                        $q->where('name', $oldName);
                    })->get();

                    foreach ($rolesWithOldPerm as $role) {
                        if (!$role->hasPermissionTo($newPerm)) {
                            $role->givePermissionTo($newPerm);
                        }
                    }
                }

                // Delete the obsolete dot-notation permission
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
