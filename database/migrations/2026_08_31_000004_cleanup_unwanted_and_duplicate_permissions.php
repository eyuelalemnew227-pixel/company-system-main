<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * Run the migrations to delete duplicate/outdated permissions.
     */
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $unwantedPermissions = [
            // Outdated & duplicate Training / Branch Manager permissions
            'training.branch_manager.agendas.manage',
            'training.branch_manager.agendas.view',
            'training.branch_manager.evaluations.manage',
            'training.branch_manager.evaluations.view',
            'training.branch_manager.manage',
            'training.branch_manager.schedules.manage',
            'training.branch_manager.schedules.view',
            'training.branch_manager.settings.manage',
            'training.branch_manager.view',
            'training.online.certificates.view',
            'training.online.courses.view',
            'training.online.forums.view',
            'training.online.manage',
            'training.view',

            // Duplicate & outdated Telecom permissions
            'telecom.export',
            'telecom.manage',
            'telecom.view',
            'telecom.sms.balance',
            'telecom.sms.send_bulk',
            'telecom.sms.settings',
        ];

        Permission::whereIn('name', $unwantedPermissions)->delete();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No action needed on rollback
    }
};
