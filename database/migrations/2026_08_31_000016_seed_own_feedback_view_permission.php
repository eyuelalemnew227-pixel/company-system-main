<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::firstOrCreate(['name' => 'training.feedback.view_own', 'guard_name' => 'web']);

        // Cleanup old unwanted evaluations permissions
        Permission::whereIn('name', [
            'training.evaluations.manage',
            'training.evaluations.view',
            'training.evaluations.view_own',
        ])->delete();
    }

    public function down(): void
    {
        //
    }
};
