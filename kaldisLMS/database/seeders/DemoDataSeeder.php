<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\CourseCategory;
use App\Models\Department;
use App\Models\Employee;
use App\Models\QuestionBank;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    private const BRANCHES = [
        ['name' => 'Bole Headquarters', 'code' => 'HQ-BOLE', 'city' => 'Addis Ababa', 'region' => 'Addis Ababa'],
        ['name' => 'Piazza Branch', 'code' => 'PIAZZA', 'city' => 'Addis Ababa', 'region' => 'Addis Ababa'],
    ];

    private const DEPARTMENTS = [
        ['branch' => 'HQ-BOLE', 'name' => 'Management', 'code' => 'MGT'],
        ['branch' => 'HQ-BOLE', 'name' => 'Barista Team', 'code' => 'BAR'],
        ['branch' => 'PIAZZA', 'name' => 'Operations', 'code' => 'OPS'],
    ];

    private const CATEGORIES = [
        ['name' => 'Barista Skills', 'slug' => 'barista-skills', 'icon' => '☕', 'color' => '#8B4513', 'sort_order' => 1],
        ['name' => 'Coffee Knowledge', 'slug' => 'coffee-knowledge', 'icon' => '🫘', 'color' => '#6F4E37', 'sort_order' => 2],
        ['name' => 'SOP & Compliance', 'slug' => 'sop-compliance', 'icon' => '📋', 'color' => '#704214', 'sort_order' => 3],
    ];

    /** One demo account per role. */
    private const DEMO_USERS = [
        ['name' => 'Abebe Bekele', 'email' => 'admin@kaldis.et', 'role' => 'admin', 'emp' => 'KC-0001', 'first' => 'Abebe', 'last' => 'Bekele', 'position' => 'System Administrator', 'branch' => 'HQ-BOLE', 'dept' => 'MGT'],
        ['name' => 'Dawit Tadesse', 'email' => 'training-manager@kaldis.et', 'role' => 'training_manager', 'emp' => 'KC-0002', 'first' => 'Dawit', 'last' => 'Tadesse', 'position' => 'Training Manager', 'branch' => 'HQ-BOLE', 'dept' => 'MGT'],
        ['name' => 'Robel Tesfaye', 'email' => 'coordinator@kaldis.et', 'role' => 'coordinator', 'emp' => 'KC-0003', 'first' => 'Robel', 'last' => 'Tesfaye', 'position' => 'Training Coordinator', 'branch' => 'HQ-BOLE', 'dept' => 'MGT'],
        ['name' => 'Yonas Haile', 'email' => 'trainer@kaldis.et', 'role' => 'trainer', 'emp' => 'KC-0004', 'first' => 'Yonas', 'last' => 'Haile', 'position' => 'Lead Barista Trainer', 'branch' => 'HQ-BOLE', 'dept' => 'BAR'],
        ['name' => 'Meriem Ali', 'email' => 'employee@kaldis.et', 'role' => 'employee', 'emp' => 'KC-0005', 'first' => 'Meriem', 'last' => 'Ali', 'position' => 'Barista', 'branch' => 'PIAZZA', 'dept' => 'OPS'],
    ];

    private const SAMPLE_QUESTIONS = [
        [
            'text' => 'What grind size is typically used for espresso extraction?',
            'type' => 'single',
            'difficulty' => 'easy',
            'category' => 'barista-skills',
            'tags' => 'espresso, grind',
            'answers' => [
                ['text' => 'Fine', 'isCorrect' => true],
                ['text' => 'Coarse', 'isCorrect' => false],
                ['text' => 'Medium-coarse', 'isCorrect' => false],
            ],
        ],
        [
            'text' => 'Washed, natural, and honey are all coffee ___ methods.',
            'type' => 'fillblank',
            'difficulty' => 'medium',
            'category' => 'coffee-knowledge',
            'tags' => 'processing',
            'answers' => [
                ['text' => 'processing', 'isCorrect' => true],
            ],
        ],
        [
            'text' => 'Milk should be steamed above 70°C to avoid scalding.',
            'type' => 'truefalse',
            'difficulty' => 'easy',
            'category' => 'barista-skills',
            'tags' => 'milk, steaming',
            'answers' => [
                ['text' => 'True', 'isCorrect' => false],
                ['text' => 'False', 'isCorrect' => true],
            ],
        ],
    ];

    public function run(): void
    {
        $branches = collect(self::BRANCHES)->map(fn ($b) => Branch::firstOrCreate(['code' => $b['code']], $b))->keyBy('code');

        $departments = collect(self::DEPARTMENTS)->mapWithKeys(function ($d) use ($branches) {
            $dept = Department::firstOrCreate(
                ['branch_id' => $branches[$d['branch']]->id, 'code' => $d['code']],
                ['name' => $d['name']]
            );

            return ["{$d['branch']}-{$d['code']}" => $dept];
        });

        $categories = collect(self::CATEGORIES)->map(fn ($c) => CourseCategory::firstOrCreate(['slug' => $c['slug']], $c))->keyBy('slug');

        $roles = Role::all()->keyBy('slug');

        $users = collect(self::DEMO_USERS)->mapWithKeys(function ($u) use ($roles, $branches, $departments) {
            $user = User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => 'password123',
                    'role_id' => $roles[$u['role']]->id,
                    'status' => 'active',
                    'last_login' => now(),
                ]
            );

            Employee::firstOrCreate(
                ['employee_number' => $u['emp']],
                [
                    'user_id' => $user->id,
                    'branch_id' => $branches[$u['branch']]->id,
                    'department_id' => $departments["{$u['branch']}-{$u['dept']}"]->id,
                    'first_name' => $u['first'],
                    'last_name' => $u['last'],
                    'position' => $u['position'],
                    'hire_date' => '2023-01-15',
                    'status' => 'active',
                    'total_points' => 120,
                ]
            );

            return [$u['role'] => $user];
        });

        $admin = $users['admin'];
        foreach (self::SAMPLE_QUESTIONS as $q) {
            QuestionBank::firstOrCreate(
                ['text' => $q['text']],
                [
                    'category_id' => $categories[$q['category']]->id,
                    'created_by' => $admin->id,
                    'type' => $q['type'],
                    'difficulty' => $q['difficulty'],
                    'tags' => $q['tags'],
                    'answer_data' => json_encode($q['answers']),
                ]
            );
        }
    }
}
