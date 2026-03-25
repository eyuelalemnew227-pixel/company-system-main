<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TicketPermissionSeeder extends Seeder
{
    private array $permissions = [
        'ticket.create',
        'ticket.view.own',
        'ticket.view.department',
        'ticket.view.all',
        'ticket.approve',
        'ticket.reject',
        'ticket.assign',
        'ticket.status.update',
        'ticket.escalate',
        'ticket.pending',
        'ticket.done',
        'ticket.close',
        'ticket.rate',
        'ticket.delete',
        'ticket.manage.taxonomy',
        'ticket.view.logs',
    ];

    public function run(): void
    {
        foreach ($this->permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // Suggested role wiring (adjust to your existing role names)
        $roleMap = [
            'Ticket User' => [
                'ticket.create',
                'ticket.view.own',
                'ticket.status.update', // only for approve/reject done handled by policy
                'ticket.rate',
            ],
            'Ticket Department Manager' => [
                'ticket.view.department',
                'ticket.approve',
                'ticket.reject',
                'ticket.assign',
                'ticket.escalate',
                'ticket.pending',
                'ticket.view.logs',
                'ticket.status.update',
                'ticket.close',
            ],
            'Ticket Staff' => [
                'ticket.view.department',
                'ticket.status.update',
                'ticket.pending',
                'ticket.escalate',
                'ticket.done',
                'ticket.view.logs',
            ],
            'Ticket Super Admin' => [
                'ticket.view.all',
                'ticket.approve',
                'ticket.reject',
                'ticket.assign',
                'ticket.escalate',
                'ticket.pending',
                'ticket.done',
                'ticket.close',
                'ticket.delete',
                'ticket.manage.taxonomy',
                'ticket.view.logs',
            ],
        ];

        foreach ($roleMap as $roleName => $perms) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $role->givePermissionTo($perms);
        }
    }
}
