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
            // Internal Memorandum Permissions
            'memo.view',
            'memo.view.all',
            'memo.create',
            'memo.edit',
            'memo.delete',
            'memo.templates.manage',
            'memo.settings',
            'memo.telegram.send',

            // Online Training Permissions
            'training.online.view',
            'training.online.courses.manage',
            'training.online.courses.enroll',
            'training.online.quizzes.take',
            'training.online.quizzes.manage',
            'training.online.question_banks.manage',
            'training.online.ai_quiz.generate',
            'training.online.sop.view',
            'training.online.sop.manage',
            'training.online.certificates.manage',
            'training.online.leaderboard.view',
            'training.online.forums.manage',
            'training.online.reports.view',

            // Branch Manager Training Permissions
            'training.branch_manager.view',
            'training.branch_manager.agendas.manage',
            'training.branch_manager.schedules.manage',
            'training.branch_manager.evaluations.manage',
            'training.branch_manager.settings.manage',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        // Assign all permissions to Super Admin & Admin roles
        $roles = Role::all();
        foreach ($roles as $role) {
            $roleName = strtolower($role->name);
            if (in_array($roleName, ['super admin', 'admin', 'administrator', 'super-admin'])) {
                $role->givePermissionTo($permissions);
            }
        }
    }

    public function down(): void
    {
        //
    }
};
