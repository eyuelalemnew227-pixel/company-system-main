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

        $perms = [
            'view order types',
            'create order types',
            'update order types',
            'delete order types',
        ];

        foreach ($perms as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        // Assign to all pre-order, admin, marketing, and IT roles
        $roles = Role::all();
        foreach ($roles as $role) {
            $hasPreOrderPerm = $role->hasAnyPermission([
                'view pre-orders',
                'create pre-orders',
                'view pre-order products',
                'manage pre-order payment settings',
                'view all pre-orders',
            ]) || in_array($role->name, [
                'Super Admin',
                'IT Admin',
                'Marketing',
                'Production',
                'head office cashier role',
                'head office operator role',
                'Branch pre-order cashier',
                'department head',
            ]);

            if ($hasPreOrderPerm) {
                $role->givePermissionTo($perms);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
