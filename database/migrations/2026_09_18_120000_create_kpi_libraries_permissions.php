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
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view kpi libraries',
            'create kpi libraries',
            'update kpi libraries',
            'delete kpi libraries',
        ];

        foreach ($permissions as $permName) {
            Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
        }

        // Assign to Super Admin / Admin roles or roles with form permissions
        $adminRoles = Role::whereIn('name', ['Super Admin', 'Admin'])->get();
        foreach ($adminRoles as $role) {
            $role->givePermissionTo($permissions);
        }

        // Also give to any role that currently has 'view forms'
        $rolesWithForms = Role::whereHas('permissions', function ($q) {
            $q->where('name', 'view forms');
        })->get();

        foreach ($rolesWithForms as $role) {
            $role->givePermissionTo($permissions);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view kpi libraries',
            'create kpi libraries',
            'update kpi libraries',
            'delete kpi libraries',
        ];

        foreach ($permissions as $permName) {
            $perm = Permission::where('name', $permName)->first();
            if ($perm) {
                $perm->delete();
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
