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

        $permissions = [
            'memo.view',
            'memo.create',
            'memo.edit',
            'memo.delete',
            'memo.sign',
            'memo.settings',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        // Assign to Super Admin / Admin roles if present
        $roles = Role::whereIn('name', ['Super Admin', 'Admin', 'administrator', 'super-admin'])->get();
        foreach ($roles as $role) {
            $role->givePermissionTo($permissions);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = [
            'memo.view',
            'memo.create',
            'memo.edit',
            'memo.delete',
            'memo.sign',
            'memo.settings',
        ];

        foreach ($permissions as $permissionName) {
            $permission = Permission::findByName($permissionName, 'web');
            if ($permission) {
                $permission->delete();
            }
        }
    }
};
