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
            'training.td_kpi.training_types.view',
            'training.td_kpi.training_types.create',
            'training.td_kpi.training_types.update',
            'training.td_kpi.training_types.delete',
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
            'training.td_kpi.training_types.view',
            'training.td_kpi.training_types.create',
            'training.td_kpi.training_types.update',
            'training.td_kpi.training_types.delete',
        ];

        foreach ($permissions as $permName) {
            Permission::where('name', $permName)->delete();
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
