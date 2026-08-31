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

        // 1. Define explicit Telecom Management permissions
        $telecomPermissions = [
            'view telecom management',
            'telecom.phone_numbers.manage',
            'telecom.broadbands.manage',
            'telecom.providers.manage',
            'export telecom data',
            'manage telecom connections',
        ];

        foreach ($telecomPermissions as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        // 2. Define explicit Online Training permissions
        $onlineTrainingPermissions = [
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
        ];

        foreach ($onlineTrainingPermissions as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $allRestrictedPermissions = array_unique(array_merge($telecomPermissions, $onlineTrainingPermissions));

        // 3. Revoke these permissions from ALL existing roles (including Super Admin, Admin, IT Admin, Training Admin)
        $allRoles = Role::all();
        foreach ($allRoles as $role) {
            foreach ($allRestrictedPermissions as $permName) {
                if ($role->hasPermissionTo($permName)) {
                    $role->revokePermissionTo($permName);
                }
            }
        }

        // 4. Revoke direct user permission assignments for telecom & online training
        $permissionsToRevoke = Permission::whereIn('name', $allRestrictedPermissions)->get();
        foreach ($permissionsToRevoke as $permissionObj) {
            \Illuminate\Support\Facades\DB::table('model_has_permissions')
                ->where('permission_id', $permissionObj->id)
                ->delete();
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
