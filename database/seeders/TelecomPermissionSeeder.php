<?php

namespace Database\Seeders;

use App\Models\TelecomProvider;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TelecomPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Clear cached permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view telecom management',
            'manage telecom connections',
            'export telecom data',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        // Grant permissions to Super Admin role
        $superAdminRole = Role::where('name', 'Super Admin')->first();
        if ($superAdminRole) {
            $superAdminRole->givePermissionTo($permissions);
        }

        // Grant permissions to all Users in the IT department
        $itUsers = \App\Models\User::whereHas('employee.department', function ($q) {
            $q->where('name', 'IT')
              ->orWhere('name', 'like', '%IT Department%');
        })->get();

        foreach ($itUsers as $user) {
            $user->givePermissionTo($permissions);
        }

        // Seed default Ethiopian Telecom Providers if empty
        if (TelecomProvider::count() === 0) {
            TelecomProvider::create([
                'name' => 'Ethio Telecom',
                'code' => 'ETHIO_TELECOM',
                'support_contact' => '994 / support@ethiotelecom.et',
                'is_active' => true,
                'notes' => 'Primary National Telecom Operator in Ethiopia',
            ]);

            TelecomProvider::create([
                'name' => 'Safaricom Ethiopia',
                'code' => 'SAFARICOM',
                'support_contact' => '700 / support@safaricom.et',
                'is_active' => true,
                'notes' => 'Secondary Telecom Operator in Ethiopia',
            ]);
        }
    }
}
