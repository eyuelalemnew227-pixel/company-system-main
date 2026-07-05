<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const LEGACY_MANAGE_PERMISSION = 'manage expense budgets';

    private const MANAGE_ANYTIME_PERMISSION = 'manage expense budget anytime';

    private const MANAGE_WINDOWED_PERMISSION = 'manage expense budget within time window';

    private const VIEW_PERMISSION = 'view expense budgets';

    /** @var list<string> */
    private const ANYTIME_ROLES = [
        'Admin',
        'Super Admin',
        'Finance Manager',
        'Finance Director',
    ];

    /** @var list<string> */
    private const WINDOWED_ROLES = [
        'Branch Manager',
        'Department Manager',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('permissions')) {
            return;
        }

        $now = now();

        foreach ([self::MANAGE_ANYTIME_PERMISSION, self::MANAGE_WINDOWED_PERMISSION, self::VIEW_PERMISSION] as $permission) {
            if (! DB::table('permissions')->where('name', $permission)->exists()) {
                DB::table('permissions')->insert([
                    'name' => $permission,
                    'guard_name' => 'web',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        $legacyPermissionId = DB::table('permissions')
            ->where('name', self::LEGACY_MANAGE_PERMISSION)
            ->value('id');

        if (! $legacyPermissionId) {
            return;
        }

        $anytimePermissionId = DB::table('permissions')
            ->where('name', self::MANAGE_ANYTIME_PERMISSION)
            ->value('id');
        $windowedPermissionId = DB::table('permissions')
            ->where('name', self::MANAGE_WINDOWED_PERMISSION)
            ->value('id');

        if (Schema::hasTable('roles') && Schema::hasTable('role_has_permissions')) {
            foreach (self::ANYTIME_ROLES as $roleName) {
                $this->migrateRolePermission($roleName, (int) $legacyPermissionId, (int) $anytimePermissionId);
            }

            foreach (self::WINDOWED_ROLES as $roleName) {
                $this->migrateRolePermission($roleName, (int) $legacyPermissionId, (int) $windowedPermissionId);
            }
        }

        if (Schema::hasTable('model_has_permissions')) {
            $directAssignments = DB::table('model_has_permissions')
                ->where('permission_id', $legacyPermissionId)
                ->get();

            foreach ($directAssignments as $assignment) {
                DB::table('model_has_permissions')->updateOrInsert(
                    [
                        'permission_id' => $windowedPermissionId,
                        'model_type' => $assignment->model_type,
                        'model_id' => $assignment->model_id,
                    ],
                    [],
                );
            }
        }

        DB::table('role_has_permissions')->where('permission_id', $legacyPermissionId)->delete();
        DB::table('model_has_permissions')->where('permission_id', $legacyPermissionId)->delete();
        DB::table('permissions')->where('id', $legacyPermissionId)->delete();
    }

    public function down(): void
    {
        if (! Schema::hasTable('permissions')) {
            return;
        }

        $now = now();

        if (! DB::table('permissions')->where('name', self::LEGACY_MANAGE_PERMISSION)->exists()) {
            DB::table('permissions')->insert([
                'name' => self::LEGACY_MANAGE_PERMISSION,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        DB::table('permissions')->whereIn('name', [
            self::MANAGE_ANYTIME_PERMISSION,
            self::MANAGE_WINDOWED_PERMISSION,
        ])->delete();
    }

    private function migrateRolePermission(string $roleName, int $legacyPermissionId, int $newPermissionId): void
    {
        $roleId = DB::table('roles')->where('name', $roleName)->value('id');

        if (! $roleId) {
            return;
        }

        $hasLegacyPermission = DB::table('role_has_permissions')
            ->where('role_id', $roleId)
            ->where('permission_id', $legacyPermissionId)
            ->exists();

        if (! $hasLegacyPermission) {
            return;
        }

        DB::table('role_has_permissions')->updateOrInsert(
            [
                'permission_id' => $newPermissionId,
                'role_id' => $roleId,
            ],
            [],
        );
    }
};
