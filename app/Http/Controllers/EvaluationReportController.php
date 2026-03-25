<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Branch;
use App\Models\Department;
use App\Models\EvaluationPeriod;
use App\Models\Evaluation;
use App\Models\EvaluationCategory;
use App\Models\EvaluationResponse;

class EvaluationReportController extends Controller
{
    public function summary(Request $request)
    {
        // Cache branches for 10 minutes
        $branches = Cache::remember(
            'branches_all_sorted',
            600,
            fn() =>
            Branch::select('id', 'name')->orderBy('name')->get()
        );

        // Cache departments for 10 minutes
        $departments = Cache::remember(
            'departments_all_sorted',
            600,
            fn() =>
            Department::select('id', 'name')->orderBy('name')->get()
        );

        // Cache evaluation periods for 10 minutes
        $periods = Cache::remember(
            'evaluation_periods_all',
            600,
            fn() =>
            EvaluationPeriod::select('id', 'evaluation_period_name')->orderByDesc('id')->get()
        );

        $evalCategories = EvaluationCategory::where('is_active', true)->get();
        $employeeEvalNames = $evalCategories->where('name', '!=', 'Department to Department')->pluck('name')->toArray();
        $departmentEvalName = 'Department to Department';
        $evaluationNames = $evalCategories->pluck('name')->toArray();
        $categoryWeights = $evalCategories->pluck('weight', 'name')->toArray();

        $branchId = $request->query('branch_id');
        $departmentId = $request->query('department_id');
        $periodId = $request->query('period_id');

        if ($branchId === 'all' || $branchId === '') {
            $branchId = null;
        }
        if ($departmentId === 'all' || $departmentId === '') {
            $departmentId = null;
        }

        // Default to latest period if not specified
        if ($periodId === null) {
            $periodId = $periods->first()?->id;
        } elseif ($periodId === 'all' || $periodId === '') {
            $periodId = null;
        }

        [$result, $evaluationNames] = $this->computeSummaryRows(
            $employeeEvalNames,
            $departmentEvalName,
            $branchId,
            $departmentId,
            $periodId,
            $categoryWeights
        );

        // keep rows only if at least one evaluation has a value
        $result = array_values(array_filter($result, function ($row) use ($evaluationNames) {
            foreach ($evaluationNames as $name) {
                if (array_key_exists($name, $row) && $row[$name] !== null) {
                    return true;
                }
            }
            return false;
        }));

        return Inertia::render('reports/evaluation-summary', [
            'rows' => $result,
            'evaluationNames' => $evaluationNames,
            'branches' => $branches,
            'departments' => $departments,
            'periods' => $periods,
            'request' => [
                'branch_id' => $request->query('branch_id'),
                'department_id' => $request->query('department_id'),
                'period_id' => $request->query('period_id') === null ? (string) $periods->first()?->id : $request->query('period_id'),
            ],
        ]);
    }

    /**
     * Get detailed evaluation response data for a specific evaluatee
     */
    public function details(Request $request)
    {
        $evaluationName = $request->query('evaluation_name');
        $employeeId = $request->query('employee_id');
        $departmentId = $request->query('department_id');
        $periodId = $request->query('period_id');

        if (!$evaluationName || !$periodId) {
            return response()->json(['error' => 'Missing required parameters'], 400);
        }

        $evaluableType = $evaluationName === 'Department to Department' ? 'department' : 'employee';
        $evaluateId = $evaluableType === 'department' ? $departmentId : $employeeId;

        if (!$evaluateId) {
            return response()->json(['error' => 'Missing evaluatee ID', 'received' => $request->all()], 400);
        }

        try {
            $responses = DB::table('evaluation_responses as er')
                ->join('evaluations as e', 'e.id', '=', 'er.evaluation_id')
                ->where('e.name', $evaluationName)
                ->where('er.evaluate_id', $evaluateId)
                ->where('er.evaluable_type', $evaluableType)
                ->where('er.evaluation_period_id', $periodId)
                ->leftJoin('users as u', 'u.id', '=', 'er.evaluator_id')
                ->select('er.id as response_id', 'u.name as evaluator_name')
                ->get();

            $detailedResponses = [];
            foreach ($responses as $resp) {
                $questions = DB::table('question_responses as qr')
                    ->join('questions as q', 'q.id', '=', 'qr.question_id')
                    ->where('qr.evaluation_response_id', $resp->response_id)
                    ->select('q.question_text', 'qr.score')
                    ->get();

                $detailedResponses[] = [
                    'evaluator' => $resp->evaluator_name ?? 'N/A',
                    'questions' => $questions->map(function ($q) {
                        return [
                            'text' => $q->question_text,
                            'score' => $q->score
                        ];
                    })
                ];
            }

            return response()->json([
                'responses' => $detailedResponses
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function export(Request $request)
    {
        $evalCategories = EvaluationCategory::where('is_active', true)->get();
        $employeeEvalNames = $evalCategories->where('name', '!=', 'Department to Department')->pluck('name')->toArray();
        $departmentEvalName = 'Department to Department';
        $categoryWeights = $evalCategories->pluck('weight', 'name')->toArray();

        $branchId = $request->query('branch_id');
        $departmentId = $request->query('department_id');
        $periodId = $request->query('period_id');
        if ($branchId === 'all' || $branchId === '') {
            $branchId = null;
        }
        if ($departmentId === 'all' || $departmentId === '') {
            $departmentId = null;
        }

        $periods = Cache::remember(
            'evaluation_periods_all',
            600,
            fn() =>
            EvaluationPeriod::select('id', 'evaluation_period_name')->orderByDesc('id')->get()
        );

        if ($periodId === null) {
            $periodId = $periods->first()?->id;
        } elseif ($periodId === 'all' || $periodId === '') {
            $periodId = null;
        }

        [$rows, $evaluationNames] = $this->computeSummaryRows(
            $employeeEvalNames,
            $departmentEvalName,
            $branchId,
            $departmentId,
            $periodId,
            $categoryWeights
        );

        // Apply same row filter: require at least one employee-based value
        $rows = array_values(array_filter($rows, function ($row) use ($employeeEvalNames) {
            foreach ($employeeEvalNames as $name) {
                if (array_key_exists($name, $row) && $row[$name] !== null) {
                    return true;
                }
            }
            return false;
        }));

        // Determine visible columns from query (?columns=...), default to all
        $columnsParam = (string) $request->query('columns', '');
        $visibleNames = $evaluationNames;
        if ($columnsParam !== '') {
            $requested = array_map('trim', explode(',', $columnsParam));
            $visibleNames = array_values(array_intersect($evaluationNames, $requested));
            if (empty($visibleNames)) {
                $visibleNames = $evaluationNames;
            }
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="evaluation-summary.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($rows, $visibleNames) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            // header
            fputcsv($out, array_merge(['Department', 'Employee Name'], $visibleNames, ['Final Result (100%)']));
            foreach ($rows as $r) {
                $values = [];
                foreach ($visibleNames as $name) {
                    $values[] = $r[$name] ?? null;
                }
                // compute overall average from visible, non-null
                $nonNull = array_values(array_filter($values, fn($v) => $v !== null));
                if (count($nonNull) >= 3) {
                    $sum = array_reduce($nonNull, function ($carry, $v) {
                        return $carry + (float) $v;
                    }, 0.0);
                    $avg = $sum / count($nonNull);
                    $overall = round(($avg / 5) * 100, 2) . '%';
                } else {
                    $overall = '';
                }
                fputcsv($out, array_merge([
                    (string) ($r['department'] ?? ''),
                    (string) ($r['employee_name'] ?? ''),
                ], array_map(function ($v) {
                    return $v === null ? '' : $v;
                }, $values), [
                    $overall === null ? '' : $overall,
                ]));
            }
            fclose($out);
        }, 200, $headers);
    }

    private function computeSummaryRows(array $employeeEvalNames, string $departmentEvalName, $branchId, $departmentId, $periodId, array $categoryWeights): array
    {
        $evaluationNames = array_merge($employeeEvalNames, [$departmentEvalName]);

        // Base employees
        $employees = DB::table('employees as emp')
            ->leftJoin('departments as d', 'd.id', '=', 'emp.department_id')
            ->selectRaw('emp.id as employee_id, emp.department_id, COALESCE(d.name, "-") as department, CONCAT(emp.first_name, " ", emp.last_name) as employee_name')
            ->when($branchId, function ($q) use ($branchId) {
                $q->where('emp.branch_id', $branchId);
            })
            ->when($departmentId, function ($q) use ($departmentId) {
                $q->where('emp.department_id', $departmentId);
            })
            ->get();

        // Employee-type evaluations aggregation
        $employeeAgg = DB::table('evaluation_responses as er')
            ->join('evaluations as e', 'e.id', '=', 'er.evaluation_id')
            ->join('employees as emp', 'emp.id', '=', 'er.evaluate_id')
            ->join('question_responses as qr', 'qr.evaluation_response_id', '=', 'er.id')
            ->join('evaluator_groups as eg', 'eg.id', '=', 'e.evaluator_group_id')
            ->leftJoin('question_group_question as qgq', function ($join) {
                $join->on('qgq.question_group_id', '=', 'eg.question_group_id')
                    ->on('qgq.question_id', '=', 'qr.question_id');
            })
            ->where('er.evaluable_type', 'employee')
            ->whereIn('e.name', $employeeEvalNames)
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('er.evaluation_period_id', $periodId);
            })
            ->when($branchId, function ($q) use ($branchId) {
                $q->where('emp.branch_id', $branchId);
            })
            ->when($departmentId, function ($q) use ($departmentId) {
                $q->where('emp.department_id', $departmentId);
            })
            ->groupBy('er.id', 'emp.id', 'e.name')
            ->selectRaw('emp.id as employee_id, e.name as evaluation_name, SUM(qr.score * COALESCE(qgq.weight, 1.0)) / NULLIF(SUM(COALESCE(qgq.weight, 1.0)), 0) as response_avg')
            ->get()
            ->groupBy(function ($r) {
                return $r->employee_id . '|' . $r->evaluation_name;
            })
            ->map(function ($group) {
                $first = $group->first();
                $avg = round($group->avg('response_avg'), 2);
                return (object) ['employee_id' => $first->employee_id, 'evaluation_name' => $first->evaluation_name, 'avg_score' => $avg];
            });

        // Department-type evaluation aggregation
        $departmentAgg = DB::table('evaluation_responses as er')
            ->join('evaluations as e', 'e.id', '=', 'er.evaluation_id')
            ->join('question_responses as qr', 'qr.evaluation_response_id', '=', 'er.id')
            ->join('evaluator_groups as eg', 'eg.id', '=', 'e.evaluator_group_id')
            ->leftJoin('question_group_question as qgq', function ($join) {
                $join->on('qgq.question_group_id', '=', 'eg.question_group_id')
                    ->on('qgq.question_id', '=', 'qr.question_id');
            })
            ->where('er.evaluable_type', 'department')
            ->where('e.name', $departmentEvalName)
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('er.evaluation_period_id', $periodId);
            })
            ->groupBy('er.id', 'er.evaluate_id')
            ->selectRaw('er.evaluate_id as department_id, SUM(qr.score * COALESCE(qgq.weight, 1.0)) / NULLIF(SUM(COALESCE(qgq.weight, 1.0)), 0) as response_avg')
            ->get()
            ->groupBy('department_id')
            ->map(function ($group, $departmentId) {
                return ['department_id' => (int) $departmentId, 'avg_score' => round(collect($group)->avg('response_avg'), 2)];
            });

        // Build pivot rows
        $pivot = [];
        foreach ($employees as $emp) {
            $key = (string) $emp->employee_id;
            $pivot[$key] = [
                'employee_id' => $emp->employee_id,
                'department_id' => $emp->department_id,
                'department' => $emp->department,
                'employee_name' => $emp->employee_name
            ];
            foreach ($evaluationNames as $name) {
                $pivot[$key][$name] = null;
            }
            $pivot[$key]['overall_avg'] = null;
        }

        foreach ($employeeAgg as $obj) {
            $empKey = (string) $obj->employee_id;
            if (isset($pivot[$empKey])) {
                $pivot[$empKey][$obj->evaluation_name] = $obj->avg_score;
            }
        }

        foreach ($employees as $emp) {
            if ($emp->department_id && isset($departmentAgg[$emp->department_id])) {
                $pivot[(string) $emp->employee_id][$departmentEvalName] = $departmentAgg[$emp->department_id]['avg_score'];
            }
        }

        // compute overall weighted average
        foreach ($pivot as $key => &$row) {
            $weightedSum = 0;
            $weightTotal = 0;
            foreach ($evaluationNames as $name) {
                if ($row[$name] !== null) {
                    $weight = $categoryWeights[$name] ?? 0;
                    $weightedSum += $row[$name] * $weight;
                    $weightTotal += $weight;
                }
            }

            if ($weightTotal > 0) {
                $avgScore = $weightedSum / $weightTotal;
                $row['overall_avg'] = round(($avgScore / 5) * 100, 2);
                // We consider it sufficient if at least 60% of total possible weight is present
                $row['has_sufficient_data'] = $weightTotal >= 60;
            } else {
                $row['overall_avg'] = null;
                $row['has_sufficient_data'] = false;
            }
        }
        unset($row);

        // sort
        $result = array_values($pivot);
        usort($result, function ($a, $b) {
            return [$a['department'], $a['employee_name']] <=> [$b['department'], $b['employee_name']];
        });

        return [$result, $evaluationNames];
    }
}


