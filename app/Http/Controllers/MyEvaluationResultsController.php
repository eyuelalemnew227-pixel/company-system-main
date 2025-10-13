<?php

namespace App\Http\Controllers;

use App\Models\EvaluationResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MyEvaluationResultsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $employeeId = $user->employee_id;

        $responses = EvaluationResponse::query()
            ->where('evaluable_type', 'employee')
            ->where('evaluate_id', $employeeId)
            ->with(['evaluator', 'evaluation.evaluatorGroup', 'evaluation.evaluatesGroup', 'evaluationPeriod', 'questionResponses'])
            ->latest()
            ->get();

        $items = $responses->map(function (EvaluationResponse $r) {
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
                'created_at' => optional($r->created_at)->toDateTimeString(),
            ];
        });

        return Inertia::render('my-results/index', [
            'items' => $items,
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


