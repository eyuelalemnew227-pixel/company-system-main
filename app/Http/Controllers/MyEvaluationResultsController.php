<?php

namespace App\Http\Controllers;

use App\Models\EvaluationResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
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

        // Calculate Personal Average Score (filtered by period)
        $personalResponses = EvaluationResponse::query()
            ->where('evaluable_type', 'employee')
            ->where('evaluate_id', $employeeId)
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('evaluation_period_id', $periodId);
            })
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

        // Calculate Department Average Score (filtered by period)
        $departmentAvgScore = null;
        if ($departmentId) {
            $departmentResponses = EvaluationResponse::query()
                ->where('evaluable_type', 'department')
                ->where('evaluate_id', $departmentId)
                ->when($periodId, function ($q) use ($periodId) {
                    $q->where('evaluation_period_id', $periodId);
                })
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

        // Fetch both personal evaluations and department evaluations
        $responses = EvaluationResponse::query()
            ->where(function ($q) use ($employeeId, $departmentId) {
                // Personal evaluations
                $q->where(function ($inner) use ($employeeId) {
                    $inner->where('evaluable_type', 'employee')
                          ->where('evaluate_id', $employeeId);
                });
                // Department evaluations (if employee has a department)
                if ($departmentId) {
                    $q->orWhere(function ($inner) use ($departmentId) {
                        $inner->where('evaluable_type', 'department')
                              ->where('evaluate_id', $departmentId);
                    });
                }
            })
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
            
            // Determine evaluation type
            $evaluationType = $r->evaluable_type === 'employee' ? 'Personal' : ucfirst($r->evaluable_type);
            
            // Check if period is still active
            $periodIsActive = $r->evaluationPeriod && $r->evaluationPeriod->status === 'active';
            
            return [
                'id' => $r->id,
                'evaluation' => [
                    'id' => $r->evaluation?->id,
                    'name' => $r->evaluation?->name,
                ],
                'evaluation_period' => $r->evaluationPeriod?->evaluation_period_name,
                'evaluator' => $r->evaluator?->name,
                'average_score' => $avg,
                'evaluation_type' => $evaluationType,
                'status' => $r->status,
                'period_is_active' => $periodIsActive,
                'accepted_at' => $r->accepted_at?->toDateTimeString(),
                'rejected_at' => $r->rejected_at?->toDateTimeString(),
                'rejection_reason' => $r->rejection_reason,
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
        $employee = \App\Models\Employee::find($user->employee_id);
        $departmentId = $employee?->department_id;

        // Check if the user has access to this evaluation (either personal or department)
        $hasAccess = false;
        
        if ($evaluationResponse->evaluable_type === 'employee' && $evaluationResponse->evaluate_id === $user->employee_id) {
            $hasAccess = true;
        } elseif ($evaluationResponse->evaluable_type === 'department' && $departmentId && $evaluationResponse->evaluate_id === $departmentId) {
            $hasAccess = true;
        }

        if (!$hasAccess) {
            abort(403);
        }

        $evaluationResponse->load(['evaluator', 'evaluation.evaluatorGroup', 'evaluation.evaluatesGroup', 'evaluationPeriod', 'questionResponses.question']);

        // Determine evaluation type
        $evaluationType = $evaluationResponse->evaluable_type === 'employee' ? 'Personal' : ucfirst($evaluationResponse->evaluable_type);
        
        // Check if period is still active
        $periodIsActive = $evaluationResponse->evaluationPeriod && $evaluationResponse->evaluationPeriod->status === 'active';
        
        // Check if user can accept/reject department evaluations
        $canAcceptRejectDepartment = $user->can('accept reject department evaluation');

        return Inertia::render('my-results/show', [
            'response' => [
                'id' => $evaluationResponse->id,
                'evaluation' => [
                    'id' => $evaluationResponse->evaluation?->id,
                    'name' => $evaluationResponse->evaluation?->name,
                ],
                'evaluation_period' => $evaluationResponse->evaluationPeriod?->evaluation_period_name,
                'evaluation_type' => $evaluationType,
                'evaluator' => $evaluationResponse->evaluator?->name,
                'comment' => $evaluationResponse->comment,
                'status' => $evaluationResponse->status,
                'period_is_active' => $periodIsActive,
                'can_accept_reject_department' => $canAcceptRejectDepartment,
                'accepted_at' => $evaluationResponse->accepted_at?->toDateTimeString(),
                'rejected_at' => $evaluationResponse->rejected_at?->toDateTimeString(),
                'rejection_reason' => $evaluationResponse->rejection_reason,
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

    public function accept(EvaluationResponse $evaluationResponse)
    {
        $user = Auth::user();
        $employee = \App\Models\Employee::find($user->employee_id);
        $departmentId = $employee?->department_id;

        // Check access
        $hasAccess = false;
        if ($evaluationResponse->evaluable_type === 'employee' && $evaluationResponse->evaluate_id === $user->employee_id) {
            $hasAccess = true;
        } elseif ($evaluationResponse->evaluable_type === 'department' && $departmentId && $evaluationResponse->evaluate_id === $departmentId) {
            // For department evaluations, check if user has the permission
            if (!$user->can('accept reject department evaluation')) {
                return redirect()->back()->with('error', 'You do not have permission to accept department evaluations.');
            }
            $hasAccess = true;
        }

        if (!$hasAccess) {
            abort(403);
        }

        // Check if period is still active
        if (!$evaluationResponse->evaluationPeriod || $evaluationResponse->evaluationPeriod->status !== 'active') {
            return redirect()->back()->with('error', 'Cannot accept evaluation. The evaluation period is no longer active.');
        }

        $evaluationResponse->update([
            'status' => 'accepted',
            'accepted_at' => now(),
            'rejected_at' => null,
            'rejection_reason' => null,
        ]);

        return redirect()->back()->with('success', 'Evaluation accepted successfully.');
    }

    public function reject(Request $request, EvaluationResponse $evaluationResponse)
    {
        $user = Auth::user();
        $employee = \App\Models\Employee::find($user->employee_id);
        $departmentId = $employee?->department_id;

        // Check access
        $hasAccess = false;
        if ($evaluationResponse->evaluable_type === 'employee' && $evaluationResponse->evaluate_id === $user->employee_id) {
            $hasAccess = true;
        } elseif ($evaluationResponse->evaluable_type === 'department' && $departmentId && $evaluationResponse->evaluate_id === $departmentId) {
            // For department evaluations, check if user has the permission
            if (!$user->can('accept reject department evaluation')) {
                return redirect()->back()->with('error', 'You do not have permission to reject department evaluations.');
            }
            $hasAccess = true;
        }

        if (!$hasAccess) {
            abort(403);
        }

        // Check if period is still active
        if (!$evaluationResponse->evaluationPeriod || $evaluationResponse->evaluationPeriod->status !== 'active') {
            return redirect()->back()->with('error', 'Cannot reject evaluation. The evaluation period is no longer active.');
        }

        $request->validate([
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $evaluationResponse->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'accepted_at' => null,
            'rejection_reason' => $request->rejection_reason,
        ]);

        return redirect()->back()->with('success', 'Evaluation rejected successfully.');
    }
}


