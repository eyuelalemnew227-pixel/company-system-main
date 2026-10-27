<?php

use App\Services\Forms\InspectorChecklistChampionAccess;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permission = Permission::firstOrCreate([
            'name' => InspectorChecklistChampionAccess::PERMISSION_NAME,
            'guard_name' => 'web',
        ]);

        $role = Role::firstOrCreate([
            'name' => InspectorChecklistChampionAccess::ROLE_NAME,
            'guard_name' => 'web',
        ]);

        if (! $role->hasPermissionTo($permission)) {
            $role->givePermissionTo($permission);
        }

        // Super Admin already receives all permissions via UI logic; still attach for completeness.
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin && ! $superAdmin->hasPermissionTo($permission)) {
            $superAdmin->givePermissionTo($permission);
        }

        InspectorChecklistChampionAccess::syncRoleAssignments();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $role = Role::where('name', InspectorChecklistChampionAccess::ROLE_NAME)->first();
        if ($role) {
            $role->delete();
        }

        Permission::where('name', InspectorChecklistChampionAccess::PERMISSION_NAME)->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
