<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('permissions')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            $permName = 'ticket.report.view';
            $permission = Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);

            $roles = ['Super Admin', 'Ticket Super Admin', 'Ticket Department Manager', 'Department Manager', 'Admin'];
            foreach ($roles as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role) {
                    $role->givePermissionTo($permission);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('permissions')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            $permission = Permission::where('name', 'ticket.report.view')->first();
            if ($permission) {
                $permission->delete();
            }
        }
    }
};
