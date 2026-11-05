<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $rolesToRevoke = ['Employee Role', 'Ticket User'];

        foreach ($rolesToRevoke as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role && $role->hasPermissionTo('ticket.status.update')) {
                $role->revokePermissionTo('ticket.status.update');
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        $rolesToRestore = ['Ticket User'];

        foreach ($rolesToRestore as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->givePermissionTo('ticket.status.update');
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
