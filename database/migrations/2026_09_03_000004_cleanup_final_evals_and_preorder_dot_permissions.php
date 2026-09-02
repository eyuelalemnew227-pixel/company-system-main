<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Delete final remaining legacy dot-notation permissions for evaluations and pre-orders.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $finalDotMap = [
            'evaluation.create' => 'create evaluations',
            'evaluation.edit' => 'update evaluations',
            'evaluation.delete' => 'delete evaluations',
            'evaluation.fill' => 'Fill Evaluation',
            'evaluation.history' => 'Evaluation History',
            'evaluation.my_results' => 'My Results',
            'evaluation.column.view' => 'view evaluator group column',
            'evaluation.completion.view' => 'view evaluator completion',
            'evaluation.deleted.view' => 'view deleted evaluations',
            'evaluation.deleted.restore' => 'restore deleted evaluations',
            'evaluation.group.evaluator.create' => 'create evaluator groups',
            'evaluation.group.evaluator.delete' => 'delete evaluator groups',
            'evaluation.group.evaluator.edit' => 'update evaluator groups',
            'evaluation.group.evaluator.view' => 'view evaluator groups',
            'evaluation.group.evaluates.create' => 'create evaluates groups',
            'evaluation.group.evaluates.delete' => 'delete evaluates groups',
            'evaluation.group.evaluates.edit' => 'update evaluates groups',
            'evaluation.group.evaluates.view' => 'view evaluates groups',
            'evaluation.other.create' => 'create other evaluables',
            'evaluation.other.delete' => 'delete other evaluables',
            'evaluation.other.edit' => 'update other evaluables',
            'evaluation.other.view' => 'view other evaluables',
            'preorder.targets.manage' => 'manage pre-order targets',
        ];

        foreach ($finalDotMap as $oldName => $newName) {
            $oldPerm = Permission::where('name', $oldName)->first();
            if ($oldPerm) {
                if ($newName) {
                    $newPerm = Permission::firstOrCreate(['name' => $newName, 'guard_name' => 'web']);
                    
                    // Transfer any role permissions
                    $rolesWithOldPerm = Role::whereHas('permissions', function ($q) use ($oldName) {
                        $q->where('name', $oldName);
                    })->get();

                    foreach ($rolesWithOldPerm as $role) {
                        if (!$role->hasPermissionTo($newPerm)) {
                            $role->givePermissionTo($newPerm);
                        }
                    }
                }

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
