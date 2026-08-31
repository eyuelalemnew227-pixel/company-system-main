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
            'training.attendance.view',
            'training.attendance.manage',
            'training.reports.view',
            'training.reports.export',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $roles = Role::all();
        foreach ($roles as $role) {
            if (in_array(strtolower($role->name), ['super-admin', 'admin', 'super admin', 'hr manager', 'training admin', 'general manager'])) {
                $role->givePermissionTo($permissions);
            } else {
                // Give view permissions to department heads / branch managers
                $role->givePermissionTo(['training.attendance.view', 'training.reports.view']);
            }
        }
    }

    public function down(): void
    {
        //
    }
};
