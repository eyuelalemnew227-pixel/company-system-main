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

        $names = InspectorChecklistChampionAccess::evaluationPermissionNames();

        foreach ($names as $name) {
            Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => 'web',
            ]);
        }

        // Super Admin receives all permissions for convenience; roles for champions are assigned in the UI.
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            foreach ($names as $name) {
                if (! $superAdmin->hasPermissionTo($name)) {
                    $superAdmin->givePermissionTo($name);
                }
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::whereIn('name', InspectorChecklistChampionAccess::evaluationPermissionNames())->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
