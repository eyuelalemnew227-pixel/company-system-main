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

        // 2. Comprehensive Master List of ALL System Permissions
        $masterPermissions = [
            // Core & Administration
            'view dashboard',
            'view permissions', 'create permissions', 'update permissions', 'delete permissions',
            'view roles', 'create roles', 'update roles', 'delete roles',
            'view users', 'create users', 'update users', 'delete users',
            'view departments', 'create departments', 'update departments', 'delete departments',
            'view branches', 'create branches', 'update branches', 'delete branches',
            'view positions', 'create positions', 'update positions', 'delete positions',
            'view employees', 'create employees', 'update employees', 'delete employees',
            'view managers', 'create managers', 'update managers', 'delete managers',

            // Evaluations & Summaries
            'view evaluation categories', 'create evaluation categories', 'update evaluation categories', 'delete evaluation categories',
            'view question groups', 'create question groups', 'update question groups', 'delete question groups',
            'view questions', 'create questions', 'update questions', 'delete questions',
            'view evaluator groups', 'create evaluator groups', 'update evaluator groups', 'delete evaluator groups',
            'view evaluates groups', 'create evaluates groups', 'update evaluates groups', 'delete evaluates groups',
            'view other evaluables', 'create other evaluables', 'update other evaluables', 'delete other evaluables',
            'view evaluations', 'create evaluations', 'update evaluations', 'delete evaluations', 'view evaluator group column',
            'view fiscal years', 'create fiscal years', 'update fiscal years', 'delete fiscal years',
            'view fiscal months', 'create fiscal months', 'update fiscal months', 'delete fiscal months',
            'view evaluation periods', 'create evaluation periods', 'update evaluation periods', 'delete evaluation periods',
            'view evaluation responses', 'create evaluation responses', 'update evaluation responses', 'delete evaluation responses',
            'view evaluator completion', 'view evaluation summary', 'view branch manager evaluation summary',
            'view champions evaluation summary', 'view regional production maintenance evaluation summary',
            'view evaluation records', 'update evaluation records', 'delete evaluation records',
            'view deleted evaluations', 'restore deleted evaluations',

            // Inventory
            'view inventory count summary',
            'view child categories', 'create child categories', 'update child categories', 'delete child categories',
            'view products', 'create products', 'update products', 'delete products',
            'view inventory periods', 'create inventory periods', 'update inventory periods', 'delete inventory periods',
            'view inventory counts', 'create inventory counts', 'update inventory counts', 'delete inventory counts',
            'approve inventory counts', 'unapprove inventory counts', 'view inventory completion tracking',

            // Pre-Orders
            'view pre-order products', 'create pre-order products', 'update pre-order products', 'delete pre-order products',
            'update pre-order product regular price', 'update pre-order product walkin price',
            'view order types', 'create order types', 'update order types', 'delete order types',
            'view collection days', 'create collection days', 'update collection days', 'delete collection days',
            'view pre-orders', 'view all pre-orders', 'view pre-order details', 'create all pre-orders',
            'create walkin pre-orders', 'create regular pre-orders', 'update all pre-orders',
            'update walkin pre-orders', 'update regular pre-orders', 'edit own pre-orders',
            'edit other users pre-orders', 'delete pre-orders', 'update pre-order status',
            'update all pre-order status', 'mark pre-order as paid', 'cancel pre-orders',
            'copy pre-order telegram message', 'send bulk sms reminders', 'view pre-order audit trail',
            'edit collected pre-orders', 'mark pre-order late payment', 'manage pre-order payment settings',
            'view sms balance', 'manage sms settings', 'view telegram config', 'manage telegram config',
            'view my branch orders', 'collect branch orders',

            // Holidays & Directory
            'view holidays', 'create holidays', 'update holidays', 'delete holidays', 'view all holidays',
            'view external links', 'manage external links', 'view employee directory',

            // Telecom
            'view telecom management', 'telecom.phone_numbers.manage', 'telecom.broadbands.manage',
            'telecom.providers.manage', 'export telecom data', 'manage telecom connections',

            // Internal Memorandum
            'memo.view', 'memo.view.all', 'memo.create', 'memo.edit', 'memo.delete', 'memo.settings',
            'memo.sign', 'memo.telegram.send', 'memo.templates.manage', 'memo.access', 'memorandum.access',

            // Training & LMS
            'training.agendas.view', 'training.agendas.create', 'training.master_schedule.view', 'training.master_schedule.create',
            'training.attendance.view', 'training.attendance.create', 'training.attendance.manage',
            'training.feedback.view', 'training.feedback.view_own', 'training.feedback.create', 'training.feedback.manage',
            'training.reports.view', 'training.reports.export', 'training.settings.manage',
            'training.branch_manager.view', 'training.branch_manager.agendas.manage', 'training.branch_manager.schedules.manage',
            'training.branch_manager.evaluations.manage', 'training.branch_manager.settings.manage',
            'training.evaluations.view', 'training.evaluations.view_own', 'training.evaluations.manage',
            'training.online.view', 'training.online.courses.manage', 'training.online.courses.enroll',
            'training.online.quizzes.take', 'training.online.quizzes.manage', 'training.online.question_banks.manage',
            'training.online.ai_quiz.generate', 'training.online.sop.view', 'training.online.sop.manage',
            'training.online.certificates.manage', 'training.online.leaderboard.view', 'training.online.forums.manage', 'training.online.reports.view',

            // Spare Parts
            'view spare part categories', 'create spare part categories', 'update spare part categories', 'delete spare part categories',
            'view spare parts', 'create spare parts', 'update spare parts', 'delete spare parts',

            // Ticketing
            'ticket.create', 'ticket.view.own', 'ticket.view.department', 'ticket.view.all',
            'ticket.approve', 'ticket.reject', 'ticket.assign', 'ticket.status.update',
            'ticket.escalate', 'ticket.pending', 'ticket.done', 'ticket.close',
            'ticket.rate', 'ticket.delete', 'ticket.manage.taxonomy', 'ticket.view.logs', 'ticket.report.view',
        ];

        foreach ($masterPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        //
    }
};
