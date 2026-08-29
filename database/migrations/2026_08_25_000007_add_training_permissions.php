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
            'training.view',
            'training.courses.manage',
            'training.courses.enroll',
            'training.quizzes.take',
            'training.quizzes.manage',
            'training.sop.manage',
            'training.certificates.manage',
            'training.reports.view',
            'training.forums.manage',
            'training.agendas.manage',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        $roles = Role::all();
        foreach ($roles as $role) {
            // Assign view & basic student permissions to all roles by default
            $role->givePermissionTo([
                'training.view',
                'training.quizzes.take',
            ]);

            // Assign full management permissions to Admin / Super Admin roles
            if (in_array(strtolower($role->name), ['super admin', 'admin', 'administrator', 'super-admin', 'manager', 'trainer'])) {
                $role->givePermissionTo($permissions);
            }
        }
    }

    public function down(): void
    {
        $permissions = [
            'training.view',
            'training.courses.manage',
            'training.courses.enroll',
            'training.quizzes.take',
            'training.quizzes.manage',
            'training.sop.manage',
            'training.certificates.manage',
            'training.reports.view',
            'training.forums.manage',
            'training.agendas.manage',
        ];

        foreach ($permissions as $permissionName) {
            $perm = Permission::where('name', $permissionName)->first();
            if ($perm) {
                $perm->delete();
            }
        }
    }
};
