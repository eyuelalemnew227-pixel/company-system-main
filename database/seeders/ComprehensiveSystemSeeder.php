<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EvaluatesGroup;
use App\Models\Evaluation;
use App\Models\EvaluationPeriod;
use App\Models\EvaluationType;
use App\Models\EvaluatorGroup;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\Image;
use App\Models\Manager;
use App\Models\OtherEvaluable;
use App\Models\Position;
use App\Models\Question;
use App\Models\QuestionGroup;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ComprehensiveSystemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Seed Departments
        $departments = [
            ['name' => 'Human Resources', 'description' => 'Handles employee relations, recruitment, and HR policies'],
            ['name' => 'Finance', 'description' => 'Manages financial operations and accounting'],
            ['name' => 'IT', 'description' => 'Information Technology and system management'],
            ['name' => 'Sales', 'description' => 'Sales and customer acquisition'],
            ['name' => 'Marketing', 'description' => 'Marketing and brand management'],
            ['name' => 'Operations', 'description' => 'Day-to-day operations management'],
            ['name' => 'Customer Service', 'description' => 'Customer support and satisfaction'],
            ['name' => 'Research & Development', 'description' => 'Product research and development'],
        ];

        foreach ($departments as $dept) {
            Department::create($dept);
        }

        // 2. Seed Branches
        $branches = [
            [
                'branch_code' => 'HQ-001',
                'name' => 'Head Office',
                'location' => 'Addis Ababa, Bole',
                'contact_email' => 'hq@company.com',
                'contact_phone' => '+251-11-123-4567',
                'description' => 'Main headquarters'
            ],
            [
                'branch_code' => 'BR-002',
                'name' => 'Bahir Dar Branch',
                'location' => 'Bahir Dar, Near Lake Tana',
                'contact_email' => 'bahirdar@company.com',
                'contact_phone' => '+251-58-220-1234',
                'description' => 'Northern region branch'
            ],
            [
                'branch_code' => 'BR-003',
                'name' => 'Hawassa Branch',
                'location' => 'Hawassa, City Center',
                'contact_email' => 'hawassa@company.com',
                'contact_phone' => '+251-46-220-5678',
                'description' => 'Southern region branch'
            ],
            [
                'branch_code' => 'BR-004',
                'name' => 'Mekelle Branch',
                'location' => 'Mekelle, Industrial Area',
                'contact_email' => 'mekelle@company.com',
                'contact_phone' => '+251-34-440-9012',
                'description' => 'Northern region branch'
            ],
            [
                'branch_code' => 'BR-005',
                'name' => 'Dire Dawa Branch',
                'location' => 'Dire Dawa, Commercial District',
                'contact_email' => 'diredawa@company.com',
                'contact_phone' => '+251-25-112-3456',
                'description' => 'Eastern region branch'
            ],
        ];

        foreach ($branches as $branch) {
            Branch::create($branch);
        }

        // 3. Attach departments to branches
        $allBranches = Branch::all();
        $allDepartments = Department::all();
        
        foreach ($allBranches as $branch) {
            // Attach 4-6 random departments to each branch
            $branch->departments()->attach(
                $allDepartments->random(rand(4, 6))->pluck('id')->toArray()
            );
        }

        // 4. Seed Positions
        // Enum values: 'Team', 'Manager', 'Director', 'General Manager', 'CEO'
        $positions = [
            ['title' => 'Chief Executive Officer', 'level' => 'CEO', 'description' => 'Chief Executive Officer - Top executive'],
            ['title' => 'Chief Technology Officer', 'level' => 'CEO', 'description' => 'Chief Technology Officer'],
            ['title' => 'Chief Financial Officer', 'level' => 'CEO', 'description' => 'Chief Financial Officer'],
            ['title' => 'General Manager - Operations', 'level' => 'General Manager', 'description' => 'Oversees operations'],
            ['title' => 'General Manager - Sales', 'level' => 'General Manager', 'description' => 'Oversees sales operations'],
            ['title' => 'IT Director', 'level' => 'Director', 'description' => 'Director of IT department'],
            ['title' => 'Finance Director', 'level' => 'Director', 'description' => 'Director of finance department'],
            ['title' => 'HR Director', 'level' => 'Director', 'description' => 'Director of human resources'],
            ['title' => 'Department Manager', 'level' => 'Manager', 'description' => 'Manages entire department'],
            ['title' => 'Team Lead', 'level' => 'Manager', 'description' => 'Leads a team of employees'],
            ['title' => 'Senior Developer', 'level' => 'Team', 'description' => 'Experienced software developer'],
            ['title' => 'Developer', 'level' => 'Team', 'description' => 'Software developer'],
            ['title' => 'Junior Developer', 'level' => 'Team', 'description' => 'Entry-level developer'],
            ['title' => 'Senior Accountant', 'level' => 'Team', 'description' => 'Experienced accountant'],
            ['title' => 'Accountant', 'level' => 'Team', 'description' => 'Finance professional'],
            ['title' => 'HR Manager', 'level' => 'Manager', 'description' => 'Human Resources manager'],
            ['title' => 'HR Specialist', 'level' => 'Team', 'description' => 'HR professional'],
            ['title' => 'Sales Manager', 'level' => 'Manager', 'description' => 'Sales team manager'],
            ['title' => 'Sales Representative', 'level' => 'Team', 'description' => 'Sales professional'],
            ['title' => 'Customer Service Rep', 'level' => 'Team', 'description' => 'Customer service representative'],
        ];

        foreach ($positions as $pos) {
            Position::create($pos);
        }

        // 5. Seed Employees (50 employees)
        $firstNames = ['Abebe', 'Almaz', 'Bekele', 'Chaltu', 'Daniel', 'Eleni', 'Fikadu', 'Genet', 
                       'Haile', 'Hirut', 'Kebede', 'Lemlem', 'Mekdes', 'Negash', 'Rahel', 'Samuel',
                       'Tigist', 'Yonas', 'Zewdu', 'Bethlehem', 'Michael', 'Sara', 'Dawit', 'Helen'];
        
        $lastNames = ['Tesfaye', 'Getachew', 'Amare', 'Wolde', 'Bekele', 'Tadesse', 'Alemayehu',
                      'Haile', 'Desta', 'Kebede', 'Gebreyes', 'Negash', 'Worku', 'Mulugeta'];
        
        $genders = ['male', 'female'];
        $statuses = ['active', 'active', 'active', 'active', 'inactive']; // 80% active

        for ($i = 1; $i <= 50; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $gender = $genders[array_rand($genders)];
            $empCode = 'EMP-' . str_pad($i, 4, '0', STR_PAD_LEFT);
            
            Employee::create([
                'employee_code' => $empCode,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone' => '+251-9' . rand(10, 99) . '-' . rand(100, 999) . '-' . rand(1000, 9999),
                'gender' => $gender,
                'date_of_birth' => date('Y-m-d', strtotime('-' . rand(25, 50) . ' years')),
                'email' => strtolower($firstName . '.' . $lastName . $i . '@company.com'), // Add number to ensure uniqueness
                'hire_date' => date('Y-m-d', strtotime('-' . rand(1, 1825) . ' days')), // hired within last 5 years
                'branch_id' => $allBranches->random()->id,
                'department_id' => $allDepartments->random()->id,
                'position_id' => Position::inRandomOrder()->first()->id,
                'status' => $statuses[array_rand($statuses)],
            ]);
        }

        // 6. Seed Users (create users for 30 random employees)
        $employees = Employee::where('status', 'active')->limit(30)->get();
        
        foreach ($employees as $employee) {
            User::create([
                'employee_id' => $employee->id,
                'name' => $employee->first_name . ' ' . $employee->last_name,
                'email' => $employee->email,
                'password' => Hash::make('password123'), // Default password
            ]);
        }

        // 7. Seed Managers and their teams
        $managerEmployees = Employee::where('status', 'active')
            ->whereHas('position', function ($query) {
                $query->whereIn('level', ['Manager', 'Director', 'General Manager', 'CEO']);
            })
            ->limit(10)
            ->get();

        foreach ($managerEmployees as $managerEmp) {
            $manager = Manager::create([
                'employee_id' => $managerEmp->id,
            ]);

            // Assign 3-8 random team members to each manager
            $teamMembers = Employee::where('status', 'active')
                ->where('id', '!=', $managerEmp->id)
                ->where('department_id', $managerEmp->department_id)
                ->inRandomOrder()
                ->limit(rand(3, 8))
                ->pluck('id')
                ->toArray();

            if (count($teamMembers) > 0) {
                $manager->teamMembers()->attach($teamMembers);
            }
        }

        // 8. Seed Fiscal Years
        $fiscalYears = [
            [
                'name' => 'EFY 2016',
                'gregorian_start_date' => '2023-07-08',
                'gregorian_end_date' => '2024-07-07',
            ],
            [
                'name' => 'EFY 2017',
                'gregorian_start_date' => '2024-07-08',
                'gregorian_end_date' => '2025-07-07',
            ],
            [
                'name' => 'EFY 2018',
                'gregorian_start_date' => '2025-07-08',
                'gregorian_end_date' => '2026-07-07',
            ],
        ];

        foreach ($fiscalYears as $fy) {
            FiscalYear::create($fy);
        }

        // 9. Seed Fiscal Months for active fiscal year
        $activeFiscalYear = FiscalYear::orderBy('gregorian_start_date', 'desc')->first();
        
        $ethiopianMonths = FiscalMonth::$ethiopianMonths;
        $startDate = new \DateTime($activeFiscalYear->gregorian_start_date);

        foreach ($ethiopianMonths as $monthNumber => $monthNames) {
            $monthStartDate = clone $startDate;
            $monthStartDate->modify('+' . ($monthNumber - 1) . ' month');
            
            $monthEndDate = clone $monthStartDate;
            $monthEndDate->modify('+1 month -1 day');

            FiscalMonth::create([
                'fiscal_year_id' => $activeFiscalYear->id,
                'name' => $monthNames['en'],
                'efy_month_number' => $monthNumber,
                'gregorian_start_date' => $monthStartDate->format('Y-m-d'),
                'gregorian_end_date' => $monthEndDate->format('Y-m-d'),
            ]);
        }

        // 10. Seed Evaluation Periods
        $activeFiscalYear = FiscalYear::orderBy('gregorian_start_date', 'desc')->first();
        $activeFiscalMonths = FiscalMonth::where('fiscal_year_id', $activeFiscalYear->id)
            ->orderBy('efy_month_number')
            ->get();

        $evaluationPeriods = [
            [
                'evaluation_period_name' => 'Q1 Performance Review',
                'fiscal_year_id' => $activeFiscalYear->id,
                'fiscal_month_id' => $activeFiscalMonths->first()->id,
                'status' => 'active',
            ],
            [
                'evaluation_period_name' => 'Mid-Year Assessment',
                'fiscal_year_id' => $activeFiscalYear->id,
                'fiscal_month_id' => $activeFiscalMonths->skip(1)->first()->id,
                'status' => 'active',
            ],
            [
                'evaluation_period_name' => 'Annual Performance Review',
                'fiscal_year_id' => $activeFiscalYear->id,
                'fiscal_month_id' => $activeFiscalMonths->skip(2)->first()->id,
                'status' => 'inactive',
            ],
        ];

        foreach ($evaluationPeriods as $period) {
            EvaluationPeriod::create($period);
        }

        // 11. Seed Evaluation Types
        // Enum values: 'person', 'department', 'branch', 'other'
        $evaluationTypes = [
            ['name' => 'Person Evaluation', 'evaluation_type' => 'person'],
            ['name' => 'Department Evaluation', 'evaluation_type' => 'department'],
            ['name' => 'Branch Evaluation', 'evaluation_type' => 'branch'],
            ['name' => 'Other Evaluation', 'evaluation_type' => 'other'],
        ];

        foreach ($evaluationTypes as $type) {
            EvaluationType::create($type);
        }

        // 12. Seed Questions
        $questionTexts = [
            'How would you rate the overall performance?',
            'Does the employee meet deadlines consistently?',
            'How well does the employee communicate with the team?',
            'Rate the quality of work delivered',
            'How proactive is the employee in taking initiatives?',
            'Does the employee demonstrate leadership qualities?',
            'How well does the employee handle challenging situations?',
            'Rate the employee\'s technical skills',
            'How well does the employee collaborate with others?',
            'Does the employee show commitment to continuous learning?',
            'How effectively does the employee manage their time?',
            'Rate the employee\'s problem-solving abilities',
            'How well does the employee adapt to changes?',
            'Does the employee contribute to team morale?',
            'How professional is the employee\'s conduct?',
            'Rate the employee\'s attention to detail',
            'How well does the employee handle feedback?',
            'Does the employee demonstrate creativity?',
            'How reliable is the employee?',
            'Rate the employee\'s customer service skills',
        ];

        $allEvaluationTypes = EvaluationType::all();
        
        foreach ($questionTexts as $questionText) {
            Question::create([
                'question_text' => $questionText,
                'evaluation_type_id' => $allEvaluationTypes->random()->id,
                'status' => rand(0, 10) > 1 ? 'active' : 'inactive', // 90% active
            ]);
        }

        // 12. Seed Question Groups
        $questionGroups = [
            ['name' => 'Performance Metrics'],
            ['name' => 'Behavioral Assessment'],
            ['name' => 'Technical Skills'],
            ['name' => 'Communication Skills'],
            ['name' => 'Leadership Qualities'],
            ['name' => 'Team Collaboration'],
        ];

        foreach ($questionGroups as $qg) {
            $questionGroup = QuestionGroup::create($qg);
            
            // Attach 3-5 random questions to each group
            $questions = Question::where('status', 'active')
                ->inRandomOrder()
                ->limit(rand(3, 5))
                ->pluck('id')
                ->toArray();
            
            $questionGroup->questions()->attach($questions);
        }

        // 13. Seed Evaluator Groups
        $allQuestionGroups = QuestionGroup::all();
        
        for ($i = 1; $i <= 8; $i++) {
            $evaluatorGroup = EvaluatorGroup::create([
                'name' => 'Evaluator Group ' . $i,
                'question_group_id' => $allQuestionGroups->random()->id,
            ]);

            // Attach 3-6 employees as evaluators
            $evaluators = Employee::where('status', 'active')
                ->inRandomOrder()
                ->limit(rand(3, 6))
                ->pluck('id')
                ->toArray();
            
            $evaluatorGroup->employees()->attach($evaluators);
        }

        // 14. Seed Other Evaluables (if not already seeded)
        if (OtherEvaluable::count() === 0) {
            $otherEvaluables = [
                ['name' => 'Customer Feedback', 'description' => 'Evaluation based on customer satisfaction surveys'],
                ['name' => 'Project Completion', 'description' => 'Assessment of project delivery timelines'],
                ['name' => 'Innovation Score', 'description' => 'Evaluation of creative solutions contributed'],
                ['name' => 'Team Collaboration', 'description' => 'Assessment of teamwork skills'],
                ['name' => 'Training Completion', 'description' => 'Tracking of training courses completed'],
            ];

            foreach ($otherEvaluables as $evaluable) {
                OtherEvaluable::create($evaluable);
            }
        }

        // 15. Seed Evaluates Groups
        $evaluableTypes = ['employee', 'department', 'branch', 'other'];
        
        for ($i = 1; $i <= 10; $i++) {
            $evaluableType = $evaluableTypes[array_rand($evaluableTypes)];
            
            $evaluatesGroup = EvaluatesGroup::create([
                'name' => 'Evaluates Group ' . $i . ' (' . ucfirst($evaluableType) . ')',
                'question_group_id' => $allQuestionGroups->random()->id,
                'evaluable_type' => $evaluableType,
            ]);

            // Attach entities based on evaluable type
            switch ($evaluableType) {
                case 'employee':
                    $evaluatesGroup->employees()->attach(
                        Employee::where('status', 'active')
                            ->inRandomOrder()
                            ->limit(rand(2, 5))
                            ->pluck('id')
                            ->toArray()
                    );
                    break;
                case 'department':
                    $evaluatesGroup->departments()->attach(
                        Department::inRandomOrder()
                            ->limit(rand(1, 3))
                            ->pluck('id')
                            ->toArray()
                    );
                    break;
                case 'branch':
                    $evaluatesGroup->branches()->attach(
                        Branch::inRandomOrder()
                            ->limit(rand(1, 2))
                            ->pluck('id')
                            ->toArray()
                    );
                    break;
                case 'other':
                    $evaluatesGroup->otherEvaluables()->attach(
                        OtherEvaluable::inRandomOrder()
                            ->limit(rand(1, 3))
                            ->pluck('id')
                            ->toArray()
                    );
                    break;
            }
        }

        // 16. Seed Evaluations
        $allEvaluatorGroups = EvaluatorGroup::all();
        $allEvaluatesGroups = EvaluatesGroup::all();
        // Enum values: 'pending', 'in_progress', 'completed'
        $evalStatuses = ['pending', 'in_progress', 'completed'];

        for ($i = 1; $i <= 15; $i++) {
            Evaluation::create([
                'name' => 'Evaluation ' . $i . ' - ' . date('Y-m'),
                'evaluator_group_id' => $allEvaluatorGroups->random()->id,
                'evaluates_group_id' => $allEvaluatesGroups->random()->id,
                'status' => $evalStatuses[array_rand($evalStatuses)],
            ]);
        }


        $this->command->info('✅ Comprehensive system seeding completed successfully!');
        $this->command->info('📊 Summary:');
        $this->command->info('   - Departments: ' . Department::count());
        $this->command->info('   - Branches: ' . Branch::count());
        $this->command->info('   - Positions: ' . Position::count());
        $this->command->info('   - Employees: ' . Employee::count());
        $this->command->info('   - Users: ' . User::count());
        $this->command->info('   - Managers: ' . Manager::count());
        $this->command->info('   - Fiscal Years: ' . FiscalYear::count());
        $this->command->info('   - Fiscal Months: ' . FiscalMonth::count());
        $this->command->info('   - Evaluation Types: ' . EvaluationType::count());
        $this->command->info('   - Questions: ' . Question::count());
        $this->command->info('   - Question Groups: ' . QuestionGroup::count());
        $this->command->info('   - Evaluator Groups: ' . EvaluatorGroup::count());
        $this->command->info('   - Evaluates Groups: ' . EvaluatesGroup::count());
        $this->command->info('   - Other Evaluables: ' . OtherEvaluable::count());
        $this->command->info('   - Evaluations: ' . Evaluation::count());
        $this->command->info('   - Evaluation Periods: ' . EvaluationPeriod::count());
    }
}

