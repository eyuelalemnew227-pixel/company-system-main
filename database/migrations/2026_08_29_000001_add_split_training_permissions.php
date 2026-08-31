<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $newPermissions = [
            'training.online.view',
            'training.branch_manager.view',
            'training.online.manage',
            'training.branch_manager.manage',
        ];

        foreach ($newPermissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        // Grant both permissions to all roles by default if they had training.view
        $roles = Role::all();
        foreach ($roles as $role) {
            if ($role->hasPermissionTo('training.view') || in_array(strtolower($role->name), ['super admin', 'admin', 'administrator', 'super-admin'])) {
                $role->givePermissionTo($newPermissions);
            }
        }
    }

    public function down(): void
    {
        $newPermissions = [
            'training.online.view',
            'training.branch_manager.view',
            'training.online.manage',
            'training.branch_manager.manage',
        ];

        foreach ($newPermissions as $permissionName) {
            $perm = Permission::where('name', $permissionName)->first();
            if ($perm) {
                $perm->delete();
            }
        }
    }
};
