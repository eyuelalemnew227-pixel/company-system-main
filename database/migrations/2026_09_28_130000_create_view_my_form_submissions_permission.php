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

        $permName = 'view my form submissions';
        Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);

        // Assign to Super Admin / Admin roles
        $adminRoles = Role::whereIn('name', ['Super Admin', 'Admin'])->get();
        foreach ($adminRoles as $role) {
            $role->givePermissionTo($permName);
        }

        // Also give to any role that currently has 'fill forms' or 'view form submissions'
        $relevantRoles = Role::whereHas('permissions', function ($q) {
            $q->whereIn('name', ['fill forms', 'view form submissions']);
        })->get();

        foreach ($relevantRoles as $role) {
            $role->givePermissionTo($permName);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::where('name', 'view my form submissions')->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
