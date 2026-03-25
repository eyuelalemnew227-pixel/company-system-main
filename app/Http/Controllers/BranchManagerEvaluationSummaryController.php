<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Branch;
use App\Models\Department;
use App\Models\EvaluationPeriod;

class BranchManagerEvaluationSummaryController extends Controller
{
    public function details(Request $request)
    {
        $employeeId = $request->query('employee_id');
        $periodId = $request->query('period_id');

        if (!$employeeId) {
            return response()->json(['error' => 'Employee ID is required'], 400);
        }

        // Find ALL "Branch Managers Evaluation" evaluations (one per department)
        $evaluationIds = DB::table('evaluations')
            ->where('name', 'Branch Managers Evaluation')
            ->pluck('id')
            ->toArray();

        if (empty($evaluationIds)) {
            return response()->json(['error' => 'Evaluation not found'], 404);
        }

        // Get evaluation details grouped by evaluator group (which represents departments)
        $evaluationResponses = DB::table('evaluation_responses as er')
            ->join('evaluations as e', 'e.id', '=', 'er.evaluation_id')
            ->join('evaluator_groups as eg', 'eg.id', '=', 'e.evaluator_group_id')
            ->join('users as evaluator', 'evaluator.id', '=', 'er.evaluator_id')
            ->whereIn('er.evaluation_id', $evaluationIds)
            ->where('er.evaluate_id', $employeeId)
            ->where('er.evaluable_type', 'employee')
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('er.evaluation_period_id', $periodId);
            })
            ->select(
                'er.id as response_id',
                'er.comment',
                'evaluator.name as evaluator_name',
                'eg.name as department_name'
            )
            ->get();

        // Get all question responses for these evaluations
        $responseIds = $evaluationResponses->pluck('response_id')->toArray();

        $questionResponses = DB::table('question_responses as qr')
            ->join('questions as q', 'q.id', '=', 'qr.question_id')
            ->whereIn('qr.evaluation_response_id', $responseIds)
            ->select(
                'qr.evaluation_response_id',
                'qr.score',
                'q.id as question_id',
                'q.question_text'
            )
            ->get()
            ->groupBy('evaluation_response_id');

        // Group by department (evaluator group name)
        $byDepartment = $evaluationResponses->groupBy('department_name')->map(function ($deptEvaluations) use ($questionResponses) {
            $evaluations = $deptEvaluations->map(function ($evalResponse) use ($questionResponses) {
                $questions = $questionResponses->get($evalResponse->response_id, collect())->map(function ($qr) {
                    return [
                        'question_id' => $qr->question_id,
                        'question_text' => $qr->question_text,
                        'score' => $qr->score,
                    ];
                })->values()->toArray();

                return [
                    'evaluator_name' => $evalResponse->evaluator_name,
                    'comment' => $evalResponse->comment,
                    'questions' => $questions,
                ];
            })->values()->toArray();

            // Calculate average score for this department
            $allScores = collect($evaluations)->flatMap(fn($e) => collect($e['questions'])->pluck('score'));
            $averageScore = $allScores->count() > 0 ? round($allScores->avg(), 2) : 0;

            return [
                'department_name' => $deptEvaluations->first()->department_name,
                'average_score' => $averageScore,
                'evaluations' => $evaluations,
            ];
        })->values();

        // Calculate overall average
        $allScores = $byDepartment->flatMap(
            fn($dept) =>
            collect($dept['evaluations'])->flatMap(
                fn($e) =>
                collect($e['questions'])->pluck('score')
            )
        );
        $overallAverage = $allScores->count() > 0 ? round($allScores->avg(), 2) : 0;

        return response()->json([
            'overall_average' => $overallAverage,
            'by_department' => $byDepartment,
        ]);
    }

    public function summary(Request $request)
    {
        // Cache branches for 10 minutes
        $branches = Cache::remember(
            'branches_all_sorted',
            600,
            fn() =>
            Branch::select('id', 'name')->orderBy('name')->get()
        );

        // Cache evaluation periods for 10 minutes
        $periods = Cache::remember(
            'evaluation_periods_all',
            600,
            fn() =>
            EvaluationPeriod::select('id', 'evaluation_period_name')->orderByDesc('id')->get()
        );

        $branchId = $request->query('branch_id');
        $periodId = $request->query('period_id');

        if ($branchId === 'all' || $branchId === '') {
            $branchId = null;
        }

        // Default to latest period if not specified
        if ($periodId === null) {
            $periodId = $periods->first()?->id;
        } elseif ($periodId === 'all' || $periodId === '') {
            $periodId = null;
        }

        [$result, $departmentNames] = $this->computeSummaryRows($branchId, $periodId);

        return Inertia::render('reports/branch-manager-evaluation-summary', [
            'rows' => $result,
            'departmentNames' => $departmentNames,
            'branches' => $branches,
            'periods' => $periods,
            'request' => [
                'branch_id' => $request->query('branch_id'),
                'period_id' => $request->query('period_id') === null ? (string) $periods->first()?->id : $request->query('period_id'),
            ],
        ]);
    }

    public function export(Request $request)
    {
        $branchId = $request->query('branch_id');
        $periodId = $request->query('period_id');
        if ($branchId === 'all' || $branchId === '') {
            $branchId = null;
        }

        $periods = Cache::remember(
            'evaluation_periods_all',
            600,
            fn() =>
            \App\Models\EvaluationPeriod::select('id', 'evaluation_period_name')->orderByDesc('id')->get()
        );

        if ($periodId === null) {
            $periodId = $periods->first()?->id;
        } elseif ($periodId === 'all' || $periodId === '') {
            $periodId = null;
        }

        [$rows, $departmentNames] = $this->computeSummaryRows($branchId, $periodId);

        $columnsParam = (string) $request->query('columns', '');
        $visibleNames = $departmentNames;
        if ($columnsParam !== '') {
            $requested = array_map('trim', explode(',', $columnsParam));
            $visibleNames = array_values(array_intersect($departmentNames, $requested));
            if (empty($visibleNames)) {
                $visibleNames = $departmentNames;
            }
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="branch-manager-evaluation-summary.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($rows, $visibleNames) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fputcsv($out, array_merge(['Branch', 'Manager Name'], $visibleNames, ['Final Result (100%)']));
            foreach ($rows as $r) {
                $values = [];
                foreach ($visibleNames as $name) {
                    $values[] = $r[$name] ?? null;
                }
                $nonNull = array_values(array_filter($values, fn($v) => $v !== null));
                $overall = null;
                if (count($nonNull) > 0) {
                    $sum = array_reduce($nonNull, function ($carry, $v) {
                        return $carry + (float) $v;
                    }, 0.0);
                    $avg = $sum / count($nonNull);
                    $overall = round(($avg / 5) * 100, 2) . '%';
                } else {
                    $overall = '';
                }
                fputcsv($out, array_merge([
                    (string) ($r['branch'] ?? ''),
                    (string) ($r['manager_name'] ?? ''),
                ], array_map(function ($v) {
                    return $v === null ? '' : $v;
                }, $values), [
                    $overall,
                ]));
            }
            fclose($out);
        }, 200, $headers);
    }

    private function computeSummaryRows($branchId, $periodId): array
    {
        // Find ALL "Branch Managers Evaluation" evaluations (there may be multiple with different departments)
        $evaluations = DB::table('evaluations')
            ->where('name', 'Branch Managers Evaluation')
            ->pluck('id')
            ->toArray();

        if (empty($evaluations)) {
            return [[], []];
        }

        // Get employees who were evaluated with ANY of these evaluations
        $managers = DB::table('evaluation_responses as er')
            ->join('employees as emp', 'emp.id', '=', 'er.evaluate_id')
            ->leftJoin('branches as b', 'b.id', '=', 'emp.branch_id')
            ->whereIn('er.evaluation_id', $evaluations)
            ->where('er.evaluable_type', 'employee')
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('er.evaluation_period_id', $periodId);
            })
            ->when($branchId, function ($q) use ($branchId) {
                $q->where('emp.branch_id', $branchId);
            })
            ->groupBy('emp.id', 'b.name', 'emp.first_name', 'emp.last_name', 'emp.branch_id')
            ->selectRaw('emp.id as employee_id, COALESCE(b.name, "-") as branch, CONCAT(emp.first_name, " ", emp.last_name) as manager_name, emp.branch_id')
            ->get();

        // First, get all evaluation responses with their department info from ALL "Branch Managers Evaluation" evaluations
        $evaluationResponses = DB::table('evaluation_responses as er')
            ->join('employees as emp', 'emp.id', '=', 'er.evaluate_id')
            ->join('users as evaluator', 'evaluator.id', '=', 'er.evaluator_id')
            ->leftJoin('employees as evaluator_emp', 'evaluator_emp.id', '=', 'evaluator.employee_id')
            ->leftJoin('departments as d', 'd.id', '=', 'evaluator_emp.department_id')
            ->whereIn('er.evaluation_id', $evaluations)
            ->where('er.evaluable_type', 'employee')
            ->whereNotNull('d.id')
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('er.evaluation_period_id', $periodId);
            })
            ->when($branchId, function ($q) use ($branchId, $managers) {
                $managerEmployeeIds = $managers->pluck('employee_id')->toArray();
                if (!empty($managerEmployeeIds)) {
                    $q->whereIn('er.evaluate_id', $managerEmployeeIds);
                }
            })
            ->select('er.id as response_id', 'emp.id as employee_id', 'd.name as department_name')
            ->get();

        // Then get all question responses and calculate averages
        $responseIds = $evaluationResponses->pluck('response_id')->toArray();
        $questionScores = [];

        if (!empty($responseIds)) {
            $scores = DB::table('question_responses')
                ->whereIn('evaluation_response_id', $responseIds)
                ->select('evaluation_response_id', DB::raw('AVG(score) as avg_score'))
                ->groupBy('evaluation_response_id')
                ->pluck('avg_score', 'evaluation_response_id');

            // Map response IDs to their average scores
            foreach ($evaluationResponses as $response) {
                $avgScore = $scores->get($response->response_id);
                if ($avgScore !== null) {
                    $key = $response->employee_id . '|' . $response->department_name;
                    if (!isset($questionScores[$key])) {
                        $questionScores[$key] = [
                            'employee_id' => $response->employee_id,
                            'department_name' => $response->department_name,
                            'scores' => []
                        ];
                    }
                    $questionScores[$key]['scores'][] = $avgScore;
                }
            }
        }

        // Calculate final averages per employee per department
        $evaluationData = collect();
        foreach ($questionScores as $data) {
            $evaluationData->push((object) [
                'employee_id' => $data['employee_id'],
                'department_name' => $data['department_name'],
                'avg_score' => round(array_sum($data['scores']) / count($data['scores']), 2)
            ]);
        }

        // Get unique department names that actually gave evaluations (sorted alphabetically)
        $departmentNames = $evaluationData->pluck('department_name')->unique()->sort()->values()->toArray();

        // Group scores by employee (manager)
        $managerDepartmentScores = $evaluationData
            ->groupBy('employee_id')
            ->map(function ($group) {
                return $group->pluck('avg_score', 'department_name')->map(function ($score) {
                    return round($score, 2);
                })->toArray();
            });

        // Build pivot rows
        $pivot = [];
        foreach ($managers as $mgr) {
            $key = (string) $mgr->employee_id;
            $pivot[$key] = [
                'employee_id' => $mgr->employee_id,
                'branch' => $mgr->branch,
                'manager_name' => $mgr->manager_name
            ];

            // Get scores for this specific manager from each department
            $managerScores = $managerDepartmentScores[$mgr->employee_id] ?? [];

            // Initialize all department columns
            foreach ($departmentNames as $deptName) {
                $pivot[$key][$deptName] = $managerScores[$deptName] ?? null;
            }

            $pivot[$key]['overall_avg'] = null;
        }

        // Compute overall average for each manager
        foreach ($pivot as $key => &$row) {
            $values = array_map(fn($name) => $row[$name] ?? null, $departmentNames);
            $nonNull = array_values(array_filter($values, fn($v) => $v !== null));
            if (count($nonNull) === 0) {
                $row['overall_avg'] = null;
            } else {
                $sum = array_reduce($nonNull, function ($carry, $v) {
                    return $carry + (float) $v;
                }, 0.0);
                $avg = $sum / count($nonNull);
                $row['overall_avg'] = round(($avg / 5) * 100, 2);
            }
        }
        unset($row);

        // Sort by branch and manager name
        $result = array_values($pivot);
        usort($result, function ($a, $b) {
            return [$a['branch'], $a['manager_name']] <=> [$b['branch'], $b['manager_name']];
        });

        return [$result, $departmentNames];
    }
}
