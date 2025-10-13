<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\Employee;
use App\Models\EvaluationPeriod;
use App\Models\EvaluationResponse;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MyEvaluationController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Evaluations where the current user's employee is in the evaluator group
        $evaluations = Evaluation::query()
            ->whereHas('evaluatorGroup.employees', function ($query) use ($user) {
                $query->where('employee_id', $user->employee_id);
            })
            ->with(['evaluatorGroup', 'evaluatesGroup'])
            ->latest()
            ->get();

        return Inertia::render('my-evaluation/index', [
            'evaluations' => $evaluations,
        ]);
    }

    public function show(Evaluation $evaluation)
    {
        $user = Auth::user();

        // Authorization: must belong to evaluator group
        $isAuthorized = $evaluation->evaluatorGroup->employees()
            ->where('employee_id', $user->employee_id)
            ->exists();

        if (!$isAuthorized) {
            abort(403, 'You are not authorized to evaluate this evaluation.');
        }

        // Active evaluation periods
        $activePeriods = EvaluationPeriod::where('status', 'active')
            ->select('id', 'evaluation_period_name')
            ->orderBy('id', 'desc')
            ->get();

        // Build evaluatees based on evaluable_type
        $evaluatees = collect();
        $evaluableType = $evaluation->evaluatesGroup?->evaluable_type;
        if ($evaluation->evaluatesGroup) {
            switch ($evaluableType) {
                case 'employee':
                    $evaluatees = $evaluation->evaluatesGroup->employees()
                        ->with(['user:id,employee_id,name'])
                        ->get(['employees.id', 'first_name', 'last_name', 'email']);
                    // Exclude self
                    $evaluatees = $evaluatees->filter(fn ($emp) => (int) $emp->id !== (int) $user->employee_id);
                    break;
                case 'department':
                    $evaluatees = $evaluation->evaluatesGroup->departments()->get(['departments.id', 'name']);
                    // Exclude own department if available
                    $evaluatorDeptId = optional(Employee::find($user->employee_id))->department_id;
                    if ($evaluatorDeptId) {
                        $evaluatees = $evaluatees->filter(fn ($dept) => (int) $dept->id !== (int) $evaluatorDeptId);
                    }
                    break;
                case 'branch':
                    $evaluatees = $evaluation->evaluatesGroup->branches()->get(['branches.id', 'name']);
                    break;
                case 'other':
                    $evaluatees = $evaluation->evaluatesGroup->otherEvaluables()->get(['other_evaluables.id', 'name']);
                    break;
            }
        }

        // Already evaluated evaluate ids grouped by evaluation_period_id for this evaluator and evaluation
        $responsesByPeriod = EvaluationResponse::where('evaluation_id', $evaluation->id)
            ->where('evaluator_id', $user->id)
            ->where('evaluable_type', $evaluableType ?? '')
            ->get(['evaluate_id', 'evaluation_period_id']);
        $alreadyEvaluatedByPeriod = [];
        foreach ($responsesByPeriod as $resp) {
            $pid = (string) ($resp->evaluation_period_id ?? '');
            if (!isset($alreadyEvaluatedByPeriod[$pid])) {
                $alreadyEvaluatedByPeriod[$pid] = [];
            }
            $alreadyEvaluatedByPeriod[$pid][] = $resp->evaluate_id;
        }

        // Questions come from the evaluates group's question group
        $questions = $evaluation->evaluatesGroup && $evaluation->evaluatesGroup->questionGroup
            ? $evaluation->evaluatesGroup->questionGroup->questions()->where('status', 'active')->get()
            : Question::whereRaw('1 = 0')->get();

        return Inertia::render('my-evaluation/show', [
            'evaluation' => $evaluation->only(['id', 'name']),
            'evaluationPeriods' => $activePeriods,
            'evaluableType' => $evaluableType,
            'evaluatees' => $evaluatees->map(function ($ent) use ($evaluableType) {
                if ($evaluableType === 'employee') {
                    return [
                        'id' => $ent->id,
                        'label' => trim(($ent->first_name ?? '') . ' ' . ($ent->last_name ?? '')),
                    ];
                }
                return [ 'id' => $ent->id, 'label' => $ent->name ];
            })->values(),
            'alreadyEvaluatedByPeriod' => $alreadyEvaluatedByPeriod,
            'questions' => $questions->map(fn ($q) => [ 'id' => $q->id, 'question_text' => $q->question_text ]),
        ]);
    }

    public function store(Request $request, Evaluation $evaluation)
    {
        $user = Auth::user();

        $isAuthorized = $evaluation->evaluatorGroup->employees()
            ->where('employee_id', $user->employee_id)
            ->exists();
        if (!$isAuthorized) {
            abort(403, 'You are not authorized to evaluate this evaluation.');
        }

        $validated = $request->validate([
            'evaluation_period_id' => 'required|exists:evaluation_periods,id',
            'evaluable_type' => 'required|in:employee,department,branch,other',
            'evaluate_id' => 'required|integer',
            'comment' => 'nullable|string',
            'question_responses' => 'required|array|min:1',
            'question_responses.*.question_id' => 'required|exists:questions,id',
            'question_responses.*.score' => 'required|integer|min:1|max:5',
        ]);

        // Prevent self-evaluation and own-department evaluation
        if ($validated['evaluable_type'] === 'employee' && (int) $validated['evaluate_id'] === (int) $user->employee_id) {
            return back()->withErrors(['evaluate_id' => 'You cannot evaluate yourself.']);
        }
        if ($validated['evaluable_type'] === 'department') {
            $evaluatorDeptId = optional(Employee::find($user->employee_id))->department_id;
            if ($evaluatorDeptId && (int) $validated['evaluate_id'] === (int) $evaluatorDeptId) {
                return back()->withErrors(['evaluate_id' => 'You cannot evaluate your own department.']);
            }
        }

        // Ensure not already evaluated
        $existing = EvaluationResponse::where('evaluation_id', $evaluation->id)
            ->where('evaluator_id', $user->id)
            ->where('evaluable_type', $validated['evaluable_type'])
            ->where('evaluate_id', $validated['evaluate_id'])
            ->where('evaluation_period_id', $validated['evaluation_period_id'])
            ->first();
        if ($existing) {
            return back()->withErrors(['evaluate_id' => 'You have already evaluated this item.']);
        }

        // Persist response
        $evaluationResponse = EvaluationResponse::create([
            'evaluation_id' => $evaluation->id,
            'evaluator_id' => $user->id,
            'evaluate_id' => $validated['evaluate_id'],
            'evaluable_type' => $validated['evaluable_type'],
            'evaluation_period_id' => $validated['evaluation_period_id'],
            'comment' => $validated['comment'] ?? null,
        ]);

        foreach ($validated['question_responses'] as $qr) {
            $evaluationResponse->questionResponses()->create([
                'question_id' => $qr['question_id'],
                'score' => $qr['score'],
            ]);
        }

        return back()->with('message', 'Evaluation submitted successfully!');
    }

    public function history()
    {
        $user = Auth::user();

        $responses = EvaluationResponse::where('evaluator_id', $user->id)
            ->with(['evaluation.evaluatesGroup.questionGroup', 'evaluationPeriod'])
            ->latest()
            ->get();

        $items = $responses->map(function (EvaluationResponse $r) {
            $label = '';
            switch ($r->evaluable_type) {
                case 'employee':
                    $emp = \App\Models\Employee::find($r->evaluate_id);
                    $label = $emp ? trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) : 'Employee #' . $r->evaluate_id;
                    break;
                case 'department':
                    $dep = \App\Models\Department::find($r->evaluate_id);
                    $label = $dep?->name ?? 'Department #' . $r->evaluate_id;
                    break;
                case 'branch':
                    $br = \App\Models\Branch::find($r->evaluate_id);
                    $label = $br?->name ?? 'Branch #' . $r->evaluate_id;
                    break;
                case 'other':
                    $oth = \App\Models\OtherEvaluable::find($r->evaluate_id);
                    $label = $oth?->name ?? 'Other #' . $r->evaluate_id;
                    break;
            }

            $periodActive = optional($r->evaluationPeriod)->status === 'active';

            return [
                'id' => $r->id,
                'evaluation' => [ 'id' => $r->evaluation_id, 'name' => optional($r->evaluation)->name ],
                'evaluable_type' => $r->evaluable_type,
                'evaluate_label' => $label,
                'evaluation_period' => optional($r->evaluationPeriod)->evaluation_period_name,
                'is_editable' => $periodActive,
                'created_at' => $r->created_at?->toDateTimeString(),
            ];
        });

        return Inertia::render('my-evaluation/history', [
            'items' => $items,
        ]);
    }

    public function editResponse(EvaluationResponse $evaluationResponse)
    {
        $user = Auth::user();
        if ($evaluationResponse->evaluator_id !== $user->id) {
            abort(403);
        }

        if (optional($evaluationResponse->evaluationPeriod)->status !== 'active') {
            abort(403, 'Evaluation period is not active.');
        }

        $evaluation = $evaluationResponse->evaluation()->with(['evaluatesGroup.questionGroup'])->first();
        $questions = $evaluation && $evaluation->evaluatesGroup && $evaluation->evaluatesGroup->questionGroup
            ? $evaluation->evaluatesGroup->questionGroup->questions()->where('status', 'active')->get()
            : collect();

        $prefill = $evaluationResponse->questionResponses()->with('question')->get()->map(function ($qr) {
            return [ 'question_id' => $qr->question_id, 'score' => $qr->score, 'question_text' => $qr->question?->question_text ];
        });

        return Inertia::render('my-evaluation/edit', [
            'response' => [
                'id' => $evaluationResponse->id,
                'evaluation_id' => $evaluationResponse->evaluation_id,
                'evaluation_period_id' => $evaluationResponse->evaluation_period_id,
                'evaluable_type' => $evaluationResponse->evaluable_type,
                'evaluate_id' => $evaluationResponse->evaluate_id,
                'comment' => $evaluationResponse->comment,
            ],
            'questions' => $questions->map(fn ($q) => [ 'id' => $q->id, 'question_text' => $q->question_text ]),
            'questionResponses' => $prefill,
        ]);
    }

    public function updateResponse(Request $request, EvaluationResponse $evaluationResponse)
    {
        $user = Auth::user();
        if ($evaluationResponse->evaluator_id !== $user->id) {
            abort(403);
        }
        if (optional($evaluationResponse->evaluationPeriod)->status !== 'active') {
            abort(403, 'Evaluation period is not active.');
        }

        $validated = $request->validate([
            'comment' => 'nullable|string',
            'question_responses' => 'required|array|min:1',
            'question_responses.*.question_id' => 'required|exists:questions,id',
            'question_responses.*.score' => 'required|integer|min:1|max:5',
        ]);

        $evaluationResponse->update([
            'comment' => $validated['comment'] ?? null,
        ]);

        $evaluationResponse->questionResponses()->delete();
        foreach ($validated['question_responses'] as $qr) {
            $evaluationResponse->questionResponses()->create([
                'question_id' => $qr['question_id'],
                'score' => $qr['score'],
            ]);
        }

        return back()->with('message', 'Evaluation updated successfully!');
    }

    public function destroyResponse(EvaluationResponse $evaluationResponse)
    {
        $user = Auth::user();
        if ($evaluationResponse->evaluator_id !== $user->id) {
            abort(403);
        }
        if (optional($evaluationResponse->evaluationPeriod)->status !== 'active') {
            abort(403, 'Evaluation period is not active.');
        }

        $evaluationResponse->delete();

        return back()->with('message', 'Evaluation deleted successfully!');
    }
}


