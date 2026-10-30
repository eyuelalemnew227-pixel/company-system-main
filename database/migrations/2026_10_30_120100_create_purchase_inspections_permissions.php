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

        $permissions = [
            'view purchase inspections',
            'create purchase inspections',
            'edit purchase inspections',
            'delete purchase inspections',
            'approve purchase inspections',
        ];

        foreach ($permissions as $permName) {
            Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
        }

        $adminRoles = Role::whereIn('name', ['Super Admin', 'Admin'])->get();
        foreach ($adminRoles as $role) {
            $role->givePermissionTo($permissions);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view purchase inspections',
            'create purchase inspections',
            'edit purchase inspections',
            'delete purchase inspections',
            'approve purchase inspections',
        ];

        foreach ($permissions as $permName) {
            Permission::where('name', $permName)->delete();
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
