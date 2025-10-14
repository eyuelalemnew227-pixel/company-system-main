<?php

namespace App\Http\Controllers;

use App\Models\EvaluationResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MyEvaluationResultsController extends Controller
{
    public function index(\Illuminate\Http\Request $request)
    {
        $user = Auth::user();
        $employeeId = $user->employee_id;
        $search = $request->query('search', '');
        $periodId = $request->query('period_id');
        if ($periodId === 'all' || $periodId === '') {
            $periodId = null;
        }

        // Get employee and department info
        $employee = \App\Models\Employee::with('department')->find($employeeId);
        $departmentId = $employee?->department_id;

        // Calculate Personal Average Score
        $personalResponses = EvaluationResponse::query()
            ->where('evaluable_type', 'employee')
            ->where('evaluate_id', $employeeId)
            ->with('questionResponses')
            ->get();
        
        $personalScores = [];
        foreach ($personalResponses as $response) {
            $scores = $response->questionResponses->pluck('score')->filter();
            if ($scores->count() > 0) {
                $personalScores[] = $scores->avg();
            }
        }
        $personalAvgScore = count($personalScores) > 0 ? round(collect($personalScores)->avg(), 2) : null;

        // Calculate Department Average Score
        $departmentAvgScore = null;
        if ($departmentId) {
            $departmentResponses = EvaluationResponse::query()
                ->where('evaluable_type', 'department')
                ->where('evaluate_id', $departmentId)
                ->with('questionResponses')
                ->get();
            
            $departmentScores = [];
            foreach ($departmentResponses as $response) {
                $scores = $response->questionResponses->pluck('score')->filter();
                if ($scores->count() > 0) {
                    $departmentScores[] = $scores->avg();
                }
            }
            $departmentAvgScore = count($departmentScores) > 0 ? round(collect($departmentScores)->avg(), 2) : null;
        }

        // Calculate Combined Average
        $combinedAvg = null;
        if ($personalAvgScore !== null && $departmentAvgScore !== null) {
            $combinedAvg = round(($personalAvgScore + $departmentAvgScore) / 2, 2);
        } elseif ($personalAvgScore !== null) {
            $combinedAvg = $personalAvgScore;
        } elseif ($departmentAvgScore !== null) {
            $combinedAvg = $departmentAvgScore;
        }

        $responses = EvaluationResponse::query()
            ->where('evaluable_type', 'employee')
            ->where('evaluate_id', $employeeId)
            ->with(['evaluator', 'evaluation.evaluatorGroup', 'evaluation.evaluatesGroup', 'evaluationPeriod', 'questionResponses'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->whereHas('evaluation', function ($qq) use ($search) {
                        $qq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('evaluator', function ($qq) use ($search) {
                        $qq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('evaluationPeriod', function ($qq) use ($search) {
                        $qq->where('evaluation_period_name', 'like', "%{$search}%");
                    });
                });
            })
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('evaluation_period_id', $periodId);
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $items = $responses->getCollection()->map(function (EvaluationResponse $r) {
            $scores = $r->questionResponses->pluck('score');
            $avg = $scores->count() ? round($scores->avg(), 2) : null;
            return [
                'id' => $r->id,
                'evaluation' => [
                    'id' => $r->evaluation?->id,
                    'name' => $r->evaluation?->name,
                ],
                'evaluation_period' => $r->evaluationPeriod?->evaluation_period_name,
                'evaluator' => $r->evaluator?->name,
                'average_score' => $avg,
            ];
        });
        $responses->setCollection($items);

        $periods = \App\Models\EvaluationPeriod::select('id', 'evaluation_period_name')->orderBy('id', 'desc')->get();

        return Inertia::render('my-results/index', [
            'items' => $responses,
            'periods' => $periods,
            'request' => $request->only('search', 'period_id'),
            'kpi' => [
                'personal_avg_score' => $personalAvgScore,
                'department_avg_score' => $departmentAvgScore,
                'combined_avg_score' => $combinedAvg,
                'department_name' => $employee?->department?->name ?? 'N/A',
            ],
        ]);
    }

    public function show(EvaluationResponse $evaluationResponse)
    {
        $user = Auth::user();
        if (!($evaluationResponse->evaluable_type === 'employee' && $evaluationResponse->evaluate_id === $user->employee_id)) {
            abort(403);
        }

        $evaluationResponse->load(['evaluator', 'evaluation.evaluatorGroup', 'evaluation.evaluatesGroup', 'evaluationPeriod', 'questionResponses.question']);

        return Inertia::render('my-results/show', [
            'response' => [
                'id' => $evaluationResponse->id,
                'evaluation' => [
                    'id' => $evaluationResponse->evaluation?->id,
                    'name' => $evaluationResponse->evaluation?->name,
                ],
                'evaluation_period' => $evaluationResponse->evaluationPeriod?->evaluation_period_name,
                'evaluator' => $evaluationResponse->evaluator?->name,
                'comment' => $evaluationResponse->comment,
                'question_responses' => $evaluationResponse->questionResponses->map(function ($qr) {
                    return [
                        'question_id' => $qr->question_id,
                        'question_text' => $qr->question?->question_text,
                        'score' => $qr->score,
                    ];
                }),
            ],
        ]);
    }
}


