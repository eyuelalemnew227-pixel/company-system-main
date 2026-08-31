<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'training.agendas.view',
            'training.agendas.create',
            'training.master_schedule.view',
            'training.master_schedule.create',
            'training.evaluations.manage',
            'training.settings.manage',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = [
            'training.agendas.view',
            'training.agendas.create',
            'training.master_schedule.view',
            'training.master_schedule.create',
            'training.evaluations.manage',
            'training.settings.manage',
        ];

        Permission::whereIn('name', $permissions)->delete();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
