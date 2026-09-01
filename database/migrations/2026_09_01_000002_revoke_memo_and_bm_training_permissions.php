<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Models\User;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Targets: Memorandum permissions and Branch Manager Training permissions
        $permissionsToRevoke = [
            // Internal Memorandum Permissions
            'memo.view',
            'memo.view.all',
            'memo.create',
            'memo.edit',
            'memo.delete',
            'memo.settings',
            'memo.sign',
            'memo.telegram.send',
            'memo.templates.manage',
            'memo.access',
            'memorandum.access',

            // Branch Manager Training Permissions
            'training.agendas.view',
            'training.agendas.create',
            'training.master_schedule.view',
            'training.master_schedule.create',
            'training.attendance.view',
            'training.attendance.create',
            'training.attendance.manage',
            'training.feedback.view',
            'training.feedback.view_own',
            'training.feedback.create',
            'training.feedback.manage',
            'training.reports.view',
            'training.reports.export',
            'training.settings.manage',
            'training.branch_manager.view',
            'training.branch_manager.agendas.manage',
            'training.branch_manager.schedules.manage',
            'training.branch_manager.evaluations.manage',
            'training.branch_manager.settings.manage',
            'training.evaluations.view',
            'training.evaluations.view_own',
            'training.evaluations.manage',
        ];

        // 1. Revoke from all roles except 'Super Admin'
        $roles = Role::whereNotIn('name', ['Super Admin', 'super admin', 'Super-Admin'])->get();
        foreach ($roles as $role) {
            foreach ($permissionsToRevoke as $perm) {
                if (Permission::where('name', $perm)->exists() && $role->hasPermissionTo($perm)) {
                    $role->revokePermissionTo($perm);
                }
            }
        }

        // 2. Revoke direct permission assignments from all non-super-admin users
        $users = User::all();
        foreach ($users as $user) {
            if (!$user->hasRole('Super Admin')) {
                foreach ($permissionsToRevoke as $perm) {
                    if (Permission::where('name', $perm)->exists() && $user->hasDirectPermission($perm)) {
                        $user->revokePermissionTo($perm);
                    }
                }
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        //
    }
};
