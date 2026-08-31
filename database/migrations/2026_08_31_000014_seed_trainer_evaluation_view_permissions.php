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
            'training.evaluations.view',
            'training.evaluations.view_own',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $allRoles = Role::all();
        foreach ($allRoles as $role) {
            if (in_array(strtolower($role->name), ['super-admin', 'admin', 'super admin', 'hr manager', 'training admin', 'general manager'])) {
                $role->givePermissionTo(['training.evaluations.view', 'training.evaluations.view_own']);
            } else {
                $role->givePermissionTo(['training.evaluations.view_own']);
            }
        }
    }

    public function down(): void
    {
        //
    }
};
