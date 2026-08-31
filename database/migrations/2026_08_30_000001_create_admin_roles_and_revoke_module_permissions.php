<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create new dedicated admin roles
        $itAdminRole = Role::findOrCreate('IT Admin', 'web');
        $trainingAdminRole = Role::findOrCreate('Training Admin', 'web');
        $memoAdminRole = Role::findOrCreate('Memo Admin', 'web');
        $superAdminRole = Role::findOrCreate('Super Admin', 'web');

        // 2. Identify module permissions
        $telecomPermissions = Permission::where(function ($query) {
            $query->where('name', 'view telecom management')
                  ->orWhere('name', 'manage telecom connections')
                  ->orWhere('name', 'export telecom data')
                  ->orWhere('name', 'like', 'telecom.%');
        })->pluck('name')->toArray();

        $memoPermissions = Permission::where(function ($query) {
            $query->where('name', 'like', 'memo.%');
        })->pluck('name')->toArray();

        $trainingPermissions = Permission::where(function ($query) {
            $query->where('name', 'like', 'training.%')
                  ->orWhere('name', 'training.view');
        })->pluck('name')->toArray();

        $allModulePermissions = array_unique(array_merge(
            $telecomPermissions,
            $memoPermissions,
            $trainingPermissions
        ));

        // 3. Revoke all Telecom, Memo, and LMS/Training permissions from ALL existing roles
        $allRoles = Role::all();
        foreach ($allRoles as $role) {
            foreach ($allModulePermissions as $perm) {
                if ($role->hasPermissionTo($perm)) {
                    $role->revokePermissionTo($perm);
                }
            }
        }

        // 4. Assign permissions to dedicated admin roles & Super Admin
        if (!empty($telecomPermissions)) {
            $itAdminRole->givePermissionTo($telecomPermissions);
            if ($superAdminRole) {
                $superAdminRole->givePermissionTo($telecomPermissions);
            }
        }

        if (!empty($memoPermissions)) {
            $memoAdminRole->givePermissionTo($memoPermissions);
            if ($superAdminRole) {
                $superAdminRole->givePermissionTo($memoPermissions);
            }
        }

        if (!empty($trainingPermissions)) {
            $trainingAdminRole->givePermissionTo($trainingPermissions);
            if ($superAdminRole) {
                $superAdminRole->givePermissionTo($trainingPermissions);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Revoke and delete created roles if down is executed
        $rolesToDelete = ['IT Admin', 'Training Admin', 'Memo Admin'];
        foreach ($rolesToDelete as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->delete();
            }
        }
    }
};
