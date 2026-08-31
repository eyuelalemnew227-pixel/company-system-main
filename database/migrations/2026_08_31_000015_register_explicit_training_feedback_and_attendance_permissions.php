<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'training.feedback.view',
            'training.feedback.create',
            'training.feedback.manage',
            'training.attendance.view',
            'training.attendance.create',
            'training.attendance.manage',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // Only assign to Super Admin and Admin roles by default
        $adminRoles = Role::whereIn('name', ['super-admin', 'admin', 'Super Admin', 'Admin'])->get();
        foreach ($adminRoles as $role) {
            $role->givePermissionTo($permissions);
        }
    }

    public function down(): void
    {
        //
    }
};
