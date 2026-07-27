<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Branch;
use App\Models\EvaluationPeriod;

class ChampionsEvaluationSummaryController extends Controller
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

        [$result, $championNames] = $this->computeSummaryRows($branchId, $periodId);

        return Inertia::render('reports/champions-evaluation-summary', [
            'rows' => $result,
            'championNames' => $championNames,
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

        [$rows, $championNames] = $this->computeSummaryRows($branchId, $periodId);

        $columnsParam = (string) $request->query('columns', '');
        $visibleNames = $championNames;
        if ($columnsParam !== '') {
            $requested = array_map('trim', explode(',', $columnsParam));
            $visibleNames = array_values(array_intersect($championNames, $requested));
            if (empty($visibleNames)) {
                $visibleNames = $championNames;
            }
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="champions-evaluation-summary.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($rows, $visibleNames) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fputcsv($out, array_merge(['Evaluator Branch', 'Evaluator Name'], $visibleNames));

            // Collect column values for averages
            $columnValues = [];
            foreach ($visibleNames as $name) {
                $columnValues[$name] = [];
            }

            // First pass to collect average values without printing
            foreach ($rows as $r) {
                foreach ($visibleNames as $name) {
                    $val = $r[$name] ?? null;
                    if ($val !== null) {
                        $columnValues[$name][] = (float) $val;
                    }
                }
            }

            // Write final result row first
            if (count($rows) > 0) {
                $finalRow = ['Final', 'Result (100%)'];
                foreach ($visibleNames as $name) {
                    $vals = $columnValues[$name];
                    if (count($vals) > 0) {
                        $avg = array_product([array_sum($vals), 1.0]) / count($vals);
                        $finalRow[] = round(($avg / 5) * 100, 2) . '%';
                    } else {
                        $finalRow[] = '';
                    }
                }
                fputcsv($out, $finalRow);
            }

            // Write regular rows
            foreach ($rows as $r) {
                $values = [];
                foreach ($visibleNames as $name) {
                    $values[] = $r[$name] ?? null;
                }

                fputcsv($out, array_merge([
                    (string) ($r['evaluator_branch'] ?? ''),
                    (string) ($r['evaluator_name'] ?? ''),
                ], array_map(function ($v) {
                    return $v === null ? '' : $v;
                }, $values)));
            }
            fclose($out);
        }, 200, $headers);
    }

    private function computeSummaryRows($branchId, $periodId): array
    {
        // Find ALL "Branch manager -> Champions" evaluations
        $evaluations = DB::table('evaluations')
            ->where('name', 'Branch manager -> Champions')
            ->pluck('id')
            ->toArray();

        if (empty($evaluations)) {
            return [[], []];
        }

        // Get responses with both evaluatee (champion) and evaluator details
        $evaluationResponses = DB::table('evaluation_responses as er')
            ->join('employees as champ', 'champ.id', '=', 'er.evaluate_id')
            ->join('users as evaluator', 'evaluator.id', '=', 'er.evaluator_id')
            ->leftJoin('employees as evaluator_emp', 'evaluator_emp.id', '=', 'evaluator.employee_id')
            ->leftJoin('branches as b_evaluator', 'b_evaluator.id', '=', 'evaluator_emp.branch_id')
            ->whereIn('er.evaluation_id', $evaluations)
            ->where('er.evaluable_type', 'employee')
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('er.evaluation_period_id', $periodId);
            })
            // Apply branch filter to the EVALUATOR's branch (or Champion's branch? Let's assume the filter is for Evaluator's branch base. We'll filter evaluator branch).
            ->when($branchId, function ($q) use ($branchId) {
                $q->where('evaluator_emp.branch_id', $branchId);
            })
            ->selectRaw('
                er.id as response_id, 
                er.evaluator_id,
                er.evaluate_id,
                evaluator.name as evaluator_name, 
                COALESCE(b_evaluator.name, "-") as evaluator_branch,
                CONCAT(champ.first_name, " ", champ.last_name) as champion_name
            ')
            ->get();

        $responseIds = $evaluationResponses->pluck('response_id')->toArray();
        $questionScores = [];

        if (!empty($responseIds)) {
            $scores = DB::table('question_responses')
                ->whereIn('evaluation_response_id', $responseIds)
                ->select('evaluation_response_id', DB::raw('AVG(score) as avg_score'))
                ->groupBy('evaluation_response_id')
                ->pluck('avg_score', 'evaluation_response_id');

            // Map response IDs to average scores
            foreach ($evaluationResponses as $response) {
                $avgScore = $scores->get($response->response_id);
                if ($avgScore !== null) {
                    $key = $response->evaluator_id . '|' . $response->champion_name;
                    if (!isset($questionScores[$key])) {
                        $questionScores[$key] = [
                            'evaluator_id' => $response->evaluator_id,
                            'evaluator_name' => $response->evaluator_name,
                            'evaluator_branch' => $response->evaluator_branch,
                            'champion_name' => $response->champion_name,
                            'scores' => []
                        ];
                    }
                    $questionScores[$key]['scores'][] = $avgScore;
                }
            }
        }

        $evaluationData = collect();
        foreach ($questionScores as $data) {
            $evaluationData->push((object) [
                'evaluator_id' => $data['evaluator_id'],
                'evaluator_name' => $data['evaluator_name'],
                'evaluator_branch' => $data['evaluator_branch'],
                'champion_name' => $data['champion_name'],
                'avg_score' => round(array_sum($data['scores']) / count($data['scores']), 2)
            ]);
        }

        // The dynamic columns are now the Champion Names
        $championNames = $evaluationData->pluck('champion_name')->unique()->sort()->values()->toArray();

        // The rows will be the Evaluators
        // Group by evaluator_id
        $evaluatorScores = $evaluationData
            ->groupBy('evaluator_id')
            ->map(function ($group) {
                return $group->pluck('avg_score', 'champion_name')->map(function ($score) {
                    return round($score, 2);
                })->toArray();
            });

        // Identify unique evaluators
        $evaluators = $evaluationData->unique('evaluator_id')->values();

        $pivot = [];
        foreach ($evaluators as $evaluator) {
            $key = (string) $evaluator->evaluator_id;
            $pivot[$key] = [
                'evaluator_id' => $evaluator->evaluator_id,
                'evaluator_branch' => $evaluator->evaluator_branch,
                'evaluator_name' => $evaluator->evaluator_name
            ];

            $scores = $evaluatorScores[$evaluator->evaluator_id] ?? [];

            foreach ($championNames as $cName) {
                $pivot[$key][$cName] = $scores[$cName] ?? null;
            }

            $pivot[$key]['overall_avg'] = null;
        }

        // Sort by branch and then by evaluator name
        $result = array_values($pivot);
        usort($result, function ($a, $b) {
            return [$a['evaluator_branch'], $a['evaluator_name']] <=> [$b['evaluator_branch'], $b['evaluator_name']];
        });

        return [$result, $championNames];
    }

    /**
     * Get detailed evaluation response data for a specific eval/champion map
     */
    public function details(Request $request)
    {
        $evaluatorId = $request->query('evaluator_id');
        $championName = $request->query('champion_name');
        $periodId = $request->query('period_id');

        if (!$evaluatorId || !$championName || !$periodId) {
            return response()->json(['error' => 'Missing required parameters'], 400);
        }

        try {
            $responses = DB::table('evaluation_responses as er')
                ->join('evaluations as e', 'e.id', '=', 'er.evaluation_id')
                ->join('employees as staff', 'staff.id', '=', 'er.evaluate_id')
                ->where('e.name', 'Branch manager -> Champions')
                ->where('er.evaluator_id', $evaluatorId)
                ->where('er.evaluable_type', 'employee')
                ->where('er.evaluation_period_id', $periodId)
                ->whereRaw('CONCAT(staff.first_name, " ", staff.last_name) = ?', [$championName])
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
}
