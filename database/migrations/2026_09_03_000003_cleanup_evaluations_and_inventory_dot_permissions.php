<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Delete legacy dot-notation permissions for Evaluations and Inventory modules and transfer role grants.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $evalsAndInventoryMap = [
            // Evaluation Types
            'evaluation.type.create' => 'create evaluation types',
            'evaluation.type.delete' => 'delete evaluation types',
            'evaluation.type.edit' => 'update evaluation types',
            'evaluation.type.view' => 'view evaluation types',

            // Evaluation Categories
            'evaluation.category.create' => 'create evaluation categories',
            'evaluation.category.delete' => 'delete evaluation categories',
            'evaluation.category.edit' => 'update evaluation categories',
            'evaluation.category.view' => 'view evaluation categories',

            // Questions & Groups
            'evaluation.question.create' => 'create questions',
            'evaluation.question.delete' => 'delete questions',
            'evaluation.question.edit' => 'update questions',
            'evaluation.question.view' => 'view questions',
            'evaluation.question_group.create' => 'create question groups',
            'evaluation.question_group.delete' => 'delete question groups',
            'evaluation.question_group.edit' => 'update question groups',
            'evaluation.question_group.view' => 'view question groups',

            // Evaluator & Evaluatee Groups
            'evaluation.evaluator_group.create' => 'create evaluator groups',
            'evaluation.evaluator_group.delete' => 'delete evaluator groups',
            'evaluation.evaluator_group.edit' => 'update evaluator groups',
            'evaluation.evaluator_group.view' => 'view evaluator groups',
            'evaluation.evaluates_group.create' => 'create evaluates groups',
            'evaluation.evaluates_group.delete' => 'delete evaluates groups',
            'evaluation.evaluates_group.edit' => 'update evaluates groups',
            'evaluation.evaluates_group.view' => 'view evaluates groups',
            'evaluation.other_evaluable.create' => 'create other evaluables',
            'evaluation.other_evaluable.delete' => 'delete other evaluables',
            'evaluation.other_evaluable.edit' => 'update other evaluables',
            'evaluation.other_evaluable.view' => 'view other evaluables',

            // Periods, Responses & Records
            'evaluation.period.create' => 'create evaluation periods',
            'evaluation.period.delete' => 'delete evaluation periods',
            'evaluation.period.edit' => 'update evaluation periods',
            'evaluation.period.view' => 'view evaluation periods',
            'evaluation.response.create' => 'create evaluation responses',
            'evaluation.response.delete' => 'delete evaluation responses',
            'evaluation.response.edit' => 'update evaluation responses',
            'evaluation.response.view' => 'view evaluation responses',
            'evaluation.record.delete' => 'delete evaluation records',
            'evaluation.record.edit' => 'update evaluation records',
            'evaluation.record.view' => 'view evaluation records',
            'evaluation.rejected.view' => 'view rejected evaluations',
            'evaluation.view' => 'view evaluations',

            // Summaries
            'evaluation.summary.view' => 'view evaluation summary',
            'evaluation.summary.champions' => 'view champions evaluation summary',
            'evaluation.summary.regional_production' => 'view regional production maintenance evaluation summary',

            // Inventory
            'inventory.count.create' => 'create inventory counts',
            'inventory.count.delete' => 'delete inventory counts',
            'inventory.count.edit' => 'update inventory counts',
            'inventory.count.view' => 'view inventory counts',
            'inventory.count.unapprove' => 'unapprove inventory counts',
            'inventory.count.summary' => 'view inventory count summary',
            'inventory.count.tracking' => 'view inventory completion tracking',
            'inventory.period.create' => 'create inventory periods',
            'inventory.period.delete' => 'delete inventory periods',
            'inventory.period.edit' => 'update inventory periods',
            'inventory.period.view' => 'view inventory periods',
        ];

        foreach ($evalsAndInventoryMap as $oldName => $newName) {
            $oldPerm = Permission::where('name', $oldName)->first();
            if ($oldPerm) {
                if ($newName) {
                    $newPerm = Permission::firstOrCreate(['name' => $newName, 'guard_name' => 'web']);
                    
                    // Transfer existing role assignments to active permission
                    $rolesWithOldPerm = Role::whereHas('permissions', function ($q) use ($oldName) {
                        $q->where('name', $oldName);
                    })->get();

                    foreach ($rolesWithOldPerm as $role) {
                        if (!$role->hasPermissionTo($newPerm)) {
                            $role->givePermissionTo($newPerm);
                        }
                    }
                }

                // Delete old duplicate permission
                $oldPerm->delete();
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // No action needed on rollback
    }
};
