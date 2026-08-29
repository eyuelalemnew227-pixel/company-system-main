<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /** name, slug, module — ported 1:1 from the Next.js app's prisma/seed.ts PERMISSIONS list. */
    private const PERMISSIONS = [
        ['Dashboard', 'dashboard.view', 'dashboard'],
        ['View Users', 'user.view', 'users'],
        ['Create User', 'user.create', 'users'],
        ['Edit User', 'user.edit', 'users'],
        ['Delete User', 'user.delete', 'users'],
        ['Approve Registrations', 'user.approve', 'users'],
        ['View Roles', 'role.view', 'roles'],
        ['Manage Roles & Permissions', 'role.manage', 'roles'],
        ['Manage Branches', 'branch.manage', 'organization'],
        ['Manage Departments', 'department.manage', 'organization'],
        ['View Courses', 'course.view', 'courses'],
        ['Create Course', 'course.create', 'courses'],
        ['Edit Course', 'course.edit', 'courses'],
        ['Delete Course', 'course.delete', 'courses'],
        ['Enroll in Course', 'course.enroll', 'courses'],
        ['Manage Lessons', 'lesson.manage', 'courses'],
        ['View Quizzes', 'quiz.view', 'quizzes'],
        ['Create Quiz', 'quiz.create', 'quizzes'],
        ['Take Quiz', 'quiz.take', 'quizzes'],
        ['Grade Quizzes', 'quiz.grade', 'quizzes'],
        ['AI Generate Quiz', 'quiz.ai_generate', 'quizzes'],
        ['View Certificates', 'certificate.view', 'certificates'],
        ['Issue Certificate', 'certificate.issue', 'certificates'],
        ['Revoke Certificate', 'certificate.revoke', 'certificates'],
        ['Verify Certificate', 'certificate.verify', 'certificates'],
        ['View Leaderboard', 'gamification.view', 'gamification'],
        ['Manage Badges', 'badge.manage', 'gamification'],
        ['View Reports', 'report.view', 'reports'],
        ['Export Reports', 'report.export', 'reports'],
        ['View SOPs', 'sop.view', 'sop'],
        ['Manage SOPs', 'sop.manage', 'sop'],
        ['Acknowledge SOP', 'sop.acknowledge', 'sop'],
        ['Manage Settings', 'settings.manage', 'settings'],
        ['Send Notifications', 'notification.send', 'notifications'],
        ['View Forums', 'forum.view', 'forums'],
        ['Post in Forums', 'forum.post', 'forums'],
        ['Manage Events', 'event.manage', 'events'],
        ['Submit Assignment', 'assignment.submit', 'assignments'],
        ['Grade Assignment', 'assignment.grade', 'assignments'],
        ['Manage Training Manuals', 'training_manual.manage', 'training_manual'],
        ['Review Training Manuals', 'training_manual.review', 'training_manual'],
        ['Approve Training Manuals', 'training_manual.approve', 'training_manual'],
        ['Submit Training Manual', 'training_manual.submit', 'training_manual'],
    ];

    /** 5 roles per the user's requested access model. */
    private const ROLES = [
        ['name' => 'Admin', 'slug' => 'admin', 'description' => 'Full system access', 'is_system' => true],
        ['name' => 'Employee', 'slug' => 'employee', 'description' => 'Learn & complete courses', 'is_system' => true],
        ['name' => 'Trainer', 'slug' => 'trainer', 'description' => 'Create & deliver department training', 'is_system' => true],
        ['name' => 'Training Manager', 'slug' => 'training_manager', 'description' => 'Approve curricula & training manuals', 'is_system' => true],
        ['name' => 'Coordinator', 'slug' => 'coordinator', 'description' => 'Review submissions & schedule training', 'is_system' => true],
    ];

    private const ROLE_PERMISSIONS = [
        'admin' => ['*'],
        'employee' => [
            'dashboard.view', 'course.view', 'course.enroll', 'quiz.view', 'quiz.take',
            'certificate.view', 'certificate.verify', 'gamification.view',
            'sop.view', 'sop.acknowledge', 'forum.view', 'forum.post', 'assignment.submit',
        ],
        'trainer' => [
            'dashboard.view', 'course.view', 'course.create', 'course.edit', 'lesson.manage',
            'quiz.view', 'quiz.create', 'quiz.grade', 'quiz.ai_generate',
            'certificate.view', 'certificate.verify', 'gamification.view',
            'forum.view', 'forum.post', 'assignment.grade',
            'training_manual.submit',
        ],
        'training_manager' => [
            'dashboard.view', 'user.view',
            'course.view', 'course.create', 'course.edit', 'course.delete', 'course.enroll', 'lesson.manage',
            'quiz.view', 'quiz.create', 'quiz.grade', 'quiz.ai_generate',
            'certificate.view', 'certificate.issue', 'certificate.revoke', 'certificate.verify',
            'gamification.view', 'badge.manage',
            'report.view', 'report.export', 'sop.view',
            'notification.send', 'forum.view', 'forum.post', 'event.manage',
            'assignment.grade', 'training_manual.approve', 'training_manual.review',
        ],
        'coordinator' => [
            'dashboard.view', 'user.view',
            'course.view', 'quiz.view',
            'certificate.view', 'certificate.verify', 'gamification.view',
            'report.view', 'report.export', 'sop.view', 'sop.manage',
            'notification.send', 'forum.view', 'forum.post', 'event.manage',
            'branch.manage', 'department.manage',
            'training_manual.review',
        ],
    ];

    public function run(): void
    {
        $permissions = collect(self::PERMISSIONS)->map(function ($p) {
            return Permission::firstOrCreate(
                ['slug' => $p[1]],
                ['name' => $p[0], 'module' => $p[2]]
            );
        })->keyBy('slug');

        $roles = collect(self::ROLES)->map(fn ($r) => Role::firstOrCreate(['slug' => $r['slug']], $r))->keyBy('slug');

        foreach (self::ROLE_PERMISSIONS as $roleSlug => $slugs) {
            $role = $roles[$roleSlug];
            $targetSlugs = in_array('*', $slugs, true) ? $permissions->keys()->all() : $slugs;
            $ids = $permissions->only($targetSlugs)->pluck('id')->all();
            $role->permissions()->syncWithoutDetaching($ids);
        }
    }
}
