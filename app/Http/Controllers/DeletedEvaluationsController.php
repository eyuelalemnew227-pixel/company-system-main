<?php

namespace App\Http\Controllers;

use App\Models\DeletedEvaluation;
use App\Models\Evaluation;
use App\Models\EvaluationPeriod;
use App\Models\User;
use App\Models\EvaluationResponse;
use App\Models\QuestionResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class DeletedEvaluationsController extends Controller
{
    public function index(Request $request)
    {
        $deletedEvaluations = DeletedEvaluation::query()
            ->with(['deletedBy', 'evaluator', 'evaluation', 'evaluationPeriod'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    // Search Evaluator
                    $q->whereHas('evaluator', function ($subQ) use ($search) {
                        $subQ->where('name', 'like', "%{$search}%");
                    })
                        // Search Deleted By
                        ->orWhereHas('deletedBy', function ($subQ) use ($search) {
                        $subQ->where('name', 'like', "%{$search}%");
                    })
                        // Search Evaluatee (Employee)
                        ->orWhere(function ($sq) use ($search) {
                        $sq->where('evaluable_type', 'employee')
                            ->whereIn('evaluate_id', function ($ssq) use ($search) {
                                $ssq->select('id')->from('employees')
                                    ->where(DB::raw("CONCAT(first_name, ' ', last_name)"), 'like', "%{$search}%");
                            });
                    })
                        // Search Evaluatee (Department)
                        ->orWhere(function ($sq) use ($search) {
                        $sq->where('evaluable_type', 'department')
                            ->whereIn('evaluate_id', function ($ssq) use ($search) {
                                $ssq->select('id')->from('departments')->where('name', 'like', "%{$search}%");
                            });
                    })
                        // Search Evaluatee (Branch)
                        ->orWhere(function ($sq) use ($search) {
                        $sq->where('evaluable_type', 'branch')
                            ->whereIn('evaluate_id', function ($ssq) use ($search) {
                                $ssq->select('id')->from('branches')->where('name', 'like', "%{$search}%");
                            });
                    })
                        // Search Evaluatee (Other)
                        ->orWhere(function ($sq) use ($search) {
                        $sq->where('evaluable_type', 'other')
                            ->whereIn('evaluate_id', function ($ssq) use ($search) {
                                $ssq->select('id')->from('other_evaluables')->where('name', 'like', "%{$search}%");
                            });
                    });
                });
            })
            ->when($request->evaluation_name, function ($query, $name) {
                $query->whereHas('evaluation', function ($q) use ($name) {
                    $q->where('name', 'like', "%{$name}%");
                });
            })
            ->when($request->period_id, function ($query, $id) {
                $query->where('evaluation_period_id', $id);
            })
            ->when($request->deleted_by, function ($query, $id) {
                $query->where('deleted_by', $id);
            })
            ->when($request->date_from, function ($query, $date) {
                $query->whereDate('deleted_at', '>=', $date);
            })
            ->when($request->date_to, function ($query, $date) {
                $query->whereDate('deleted_at', '<=', $date);
            })
            ->latest('deleted_at')
            ->paginate(15)
            ->withQueryString();

        // Transform results to include evaluate label
        $deletedEvaluations->getCollection()->transform(function ($r) {
            $label = 'N/A';
            $evaluationData = $r->evaluation_data;

            if (isset($evaluationData['evaluable_type']) && isset($evaluationData['evaluate_id'])) {
                $type = $evaluationData['evaluable_type'];
                $id = $evaluationData['evaluate_id'];

                if ($type === 'employee') {
                    $emp = \App\Models\Employee::find($id);
                    $label = $emp ? trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) : "Employee #{$id}";
                } elseif ($type === 'department') {
                    $dept = \App\Models\Department::find($id);
                    $label = $dept ? $dept->name : "Department #{$id}";
                } elseif ($type === 'branch') {
                    $branch = \App\Models\Branch::find($id);
                    $label = $branch ? $branch->name : "Branch #{$id}";
                } elseif ($type === 'other') {
                    $other = \App\Models\OtherEvaluable::find($id);
                    $label = $other ? $other->name : "Other #{$id}";
                }
            }

            return array_merge($r->toArray(), [
                'evaluate_label' => $label,
                'evaluator_name' => $r->evaluator->name ?? 'N/A',
                'evaluation_name' => $r->evaluation->name ?? 'N/A',
                'period_name' => $r->evaluationPeriod->evaluation_period_name ?? 'N/A',
                'deleted_by_name' => $r->deletedBy->name ?? 'Unknown',
            ]);
        });

        return Inertia::render('deleted-evaluations/index', [
            'deletedEvaluations' => $deletedEvaluations,
            'filters' => $request->only(['search', 'period_id', 'deleted_by', 'date_from', 'date_to', 'evaluation_name']),
            'periods' => EvaluationPeriod::select('id', 'evaluation_period_name')->get(),
            'users' => User::select('id', 'name')->get(),
        ]);
    }

    public function restore(DeletedEvaluation $deleted_evaluation)
    {
        DB::transaction(function () use ($deleted_evaluation) {
            $evaluationData = $deleted_evaluation->evaluation_data;
            $questionResponsesData = $deleted_evaluation->question_responses_data;

            // Re-create EvaluationResponse
            // We use create to get a new ID, or we can try to force the old ID if needed.
            // But since relations might have moved on, a new ID is safer, but the snapshot stores the old one for reference.
            $evaluationResponse = EvaluationResponse::create([
                'evaluation_id' => $evaluationData['evaluation_id'],
                'evaluator_id' => $evaluationData['evaluator_id'],
                'evaluate_id' => $evaluationData['evaluate_id'],
                'evaluable_type' => $evaluationData['evaluable_type'],
                'evaluation_period_id' => $evaluationData['evaluation_period_id'],
                'comment' => $evaluationData['comment'] ?? null,
                'status' => $evaluationData['status'] ?? 'pending',
                'accepted_at' => $evaluationData['accepted_at'] ?? null,
                'rejected_at' => $evaluationData['rejected_at'] ?? null,
                'rejection_reason' => $evaluationData['rejection_reason'] ?? null,
                'created_by' => $evaluationData['created_by'],
                'updated_by' => auth()->id(),
            ]);

            // Re-create QuestionResponses
            if (is_array($questionResponsesData)) {
                foreach ($questionResponsesData as $qrData) {
                    QuestionResponse::create([
                        'evaluation_response_id' => $evaluationResponse->id,
                        'question_id' => $qrData['question_id'],
                        'score' => $qrData['score'],
                    ]);
                }
            }

            // Delete the audit record
            $deleted_evaluation->delete();
        });

        return redirect()->route('deleted-evaluations.index')
            ->with('message', 'Evaluation record restored successfully!');
    }
}
