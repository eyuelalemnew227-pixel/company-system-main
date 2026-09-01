<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\TicketPermissionSeeder;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Run seeders if available
        if (class_exists(PermissionSeeder::class)) {
            (new PermissionSeeder())->run();
        }
        if (class_exists(TicketPermissionSeeder::class)) {
            (new TicketPermissionSeeder())->run();
        }

        // 2. Explicitly sync all 11 Memos & Documents Permissions
        $memosPermissions = [
            'memo.view',
            'memo.view.all',
            'memo.create',
            'memo.edit',
            'memo.delete',
            'memo.settings',
            'memo.sign',
            'memo.telegram.send',
            'memo.templates.manage',
            'memo.access',
            'memorandum.access',
        ];

        foreach ($memosPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // 3. Explicitly sync all 35 Training & LMS Permissions
        $trainingPermissions = [
            'training.agendas.view',
            'training.agendas.create',
            'training.master_schedule.view',
            'training.master_schedule.create',
            'training.attendance.view',
            'training.attendance.create',
            'training.attendance.manage',
            'training.feedback.view',
            'training.feedback.view_own',
            'training.feedback.create',
            'training.feedback.manage',
            'training.reports.view',
            'training.reports.export',
            'training.settings.manage',
            'training.branch_manager.view',
            'training.branch_manager.agendas.manage',
            'training.branch_manager.schedules.manage',
            'training.branch_manager.evaluations.manage',
            'training.branch_manager.settings.manage',
            'training.evaluations.view',
            'training.evaluations.view_own',
            'training.evaluations.manage',
            'training.online.view',
            'training.online.courses.manage',
            'training.online.courses.enroll',
            'training.online.quizzes.take',
            'training.online.quizzes.manage',
            'training.online.question_banks.manage',
            'training.online.ai_quiz.generate',
            'training.online.sop.view',
            'training.online.sop.manage',
            'training.online.certificates.manage',
            'training.online.leaderboard.view',
            'training.online.forums.manage',
            'training.online.reports.view',
        ];

        foreach ($trainingPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        //
    }
};
