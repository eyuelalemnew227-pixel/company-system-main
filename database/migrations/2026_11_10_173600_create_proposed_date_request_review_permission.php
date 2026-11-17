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

        $permission = 'training.td_kpi.proposed_date_requests.review';
        Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);

        $adminRoles = Role::whereIn('name', ['Super Admin', 'Admin'])->get();
        foreach ($adminRoles as $role) {
            $role->givePermissionTo($permission);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::where('name', 'training.td_kpi.proposed_date_requests.review')->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
