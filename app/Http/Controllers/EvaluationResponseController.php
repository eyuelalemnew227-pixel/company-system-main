<?php

namespace App\Http\Controllers;

use App\Models\EvaluationResponse;
use App\Models\EvaluationPeriod;
use App\Models\Evaluation;
use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EvaluationResponseController extends Controller
{
    public function index(Request $request)
    {
        $evaluationResponses = EvaluationResponse::query()
            ->with(['evaluator', 'evaluationPeriod', 'evaluation', 'creator', 'updater'])
            ->when($request->search, function ($query, $search) {
                $query->whereHas('evaluator', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                });
            })
            ->when($request->period_id, function ($query, $id) {
                $query->where('evaluation_period_id', $id);
            })
            ->when($request->evaluable_type, function ($query, $type) {
                $query->where('evaluable_type', $type);
            })
            ->when($request->branch_id, function ($query, $id) {
                $query->where(function($q) use ($id) {
                    $q->where(function($sub) use ($id) {
                        $sub->where('evaluable_type', 'branch')->where('evaluate_id', $id);
                    })->orWhere(function($sub) use ($id) {
                        $sub->where('evaluable_type', 'employee')
                            ->whereIn('evaluate_id', function($q2) use ($id) {
                                $q2->select('id')->from('employees')->where('branch_id', $id);
                            });
                    });
                });
            })
            ->when($request->department_id, function ($query, $id) {
                $query->where(function($q) use ($id) {
                    $q->where(function($sub) use ($id) {
                        $sub->where('evaluable_type', 'department')->where('evaluate_id', $id);
                    })->orWhere(function($sub) use ($id) {
                        $sub->where('evaluable_type', 'employee')
                            ->whereIn('evaluate_id', function($q2) use ($id) {
                                $q2->select('id')->from('employees')->where('department_id', $id);
                            });
                    });
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        // Transform results to include evaluate label
        $evaluationResponses->getCollection()->transform(function ($r) {
            $label = 'N/A';
            if ($r->evaluable_type === 'employee') {
                $emp = \App\Models\Employee::find($r->evaluate_id);
                $label = $emp ? trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) : "Employee #{$r->evaluate_id}";
            } elseif ($r->evaluable_type === 'department') {
                $dept = \App\Models\Department::find($r->evaluate_id);
                $label = $dept ? $dept->name : "Department #{$r->evaluate_id}";
            } elseif ($r->evaluable_type === 'branch') {
                $branch = \App\Models\Branch::find($r->evaluate_id);
                $label = $branch ? $branch->name : "Branch #{$r->evaluate_id}";
            } elseif ($r->evaluable_type === 'other') {
                $other = \App\Models\OtherEvaluable::find($r->evaluate_id);
                $label = $other ? $other->name : "Other #{$r->evaluate_id}";
            }

            return array_merge($r->toArray(), [
                'evaluate_label' => $label,
                'evaluator_name' => $r->evaluator->name ?? 'N/A',
                'evaluation_name' => $r->evaluation->name ?? 'N/A',
                'period_name' => $r->evaluationPeriod->evaluation_period_name ?? 'N/A',
                'creator_name' => $r->creator->name ?? 'System',
                'updater_name' => $r->updater->name ?? 'N/A',
            ]);
        });

        return Inertia::render('evaluation-records/index', [
            'evaluationResponses' => $evaluationResponses,
            'filters' => $request->only(['search', 'period_id', 'evaluable_type', 'branch_id', 'department_id']),
            'periods' => EvaluationPeriod::select('id', 'evaluation_period_name')->get(),
            'branches' => Branch::select('id', 'name')->get(),
            'departments' => Department::select('id', 'name')->get(),
        ]);
    }

    public function create()
    {
        $evaluationPeriods = EvaluationPeriod::where('status', 'active')->get();
        $evaluationTypes = EvaluationType::all();
        $users = User::with('employee')->get();
        $questions = Question::where('status', 'active')->get();

        return Inertia::render('evaluation-responses/create', [
            'evaluationPeriods' => $evaluationPeriods,
            'evaluationTypes' => $evaluationTypes,
            'users' => $users,
            'questions' => $questions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'evaluator_id' => 'required|exists:users,id',
            'evaluate_id' => 'required|exists:users,id',
            'evaluation_period_id' => 'required|exists:evaluation_periods,id',
            'evaluation_type_id' => 'required|exists:evaluation_types,id',
            'comment' => 'nullable|string',
            'question_responses' => 'required|array|min:1',
            'question_responses.*.question_id' => 'required|exists:questions,id',
            'question_responses.*.score' => 'required|integer|min:1|max:5',
        ]);

        $evaluationResponse = EvaluationResponse::create([
            'evaluator_id' => $validated['evaluator_id'],
            'evaluate_id' => $validated['evaluate_id'],
            'evaluation_period_id' => $validated['evaluation_period_id'],
            'evaluation_type_id' => $validated['evaluation_type_id'],
            'comment' => $validated['comment'],
        ]);

        foreach ($validated['question_responses'] as $questionResponse) {
            $evaluationResponse->questionResponses()->create([
                'question_id' => $questionResponse['question_id'],
                'score' => $questionResponse['score'],
            ]);
        }

        return redirect()->route('evaluation-responses.index')
            ->with('message', 'Evaluation Response created successfully!');
    }

    public function edit(EvaluationResponse $evaluation_record)
    {
        $evaluation_record->load(['questionResponses.question', 'evaluator', 'evaluation.evaluatesGroup.questionGroup.questions']);
        
        $label = 'N/A';
        if ($evaluation_record->evaluable_type === 'employee') {
            $emp = \App\Models\Employee::find($evaluation_record->evaluate_id);
            $label = $emp ? trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) : "Employee #{$evaluation_record->evaluate_id}";
        } elseif ($evaluation_record->evaluable_type === 'department') {
            $dept = \App\Models\Department::find($evaluation_record->evaluate_id);
            $label = $dept ? $dept->name : "Department #{$evaluation_record->evaluate_id}";
        } elseif ($evaluation_record->evaluable_type === 'branch') {
            $branch = \App\Models\Branch::find($evaluation_record->evaluate_id);
            $label = $branch ? $branch->name : "Branch #{$evaluation_record->evaluate_id}";
        } elseif ($evaluation_record->evaluable_type === 'other') {
            $other = \App\Models\OtherEvaluable::find($evaluation_record->evaluate_id);
            $label = $other ? $other->name : "Other #{$evaluation_record->evaluate_id}";
        }

        $questions = collect();
        if ($evaluation_record->evaluation && $evaluation_record->evaluation->evaluatesGroup && $evaluation_record->evaluation->evaluatesGroup->questionGroup) {
            $questions = $evaluation_record->evaluation->evaluatesGroup->questionGroup->questions;
        }

        return Inertia::render('evaluation-records/edit', [
            'evaluationResponse' => $evaluation_record,
            'evaluateLabel' => $label,
            'questions' => $questions,
        ]);
    }

    public function update(Request $request, EvaluationResponse $evaluation_record)
    {
        $validated = $request->validate([
            'comment' => 'nullable|string',
            'question_responses' => 'required|array|min:1',
            'question_responses.*.question_id' => 'required|exists:questions,id',
            'question_responses.*.score' => 'required|integer|min:1|max:5',
        ]);

        DB::transaction(function () use ($validated, $evaluation_record) {
            $evaluation_record->update([
                'comment' => $validated['comment'],
                'updated_by' => auth()->id(),
            ]);

            // Sync question responses
            $evaluation_record->questionResponses()->delete();
            foreach ($validated['question_responses'] as $qr) {
                $evaluation_record->questionResponses()->create([
                    'question_id' => $qr['question_id'],
                    'score' => $qr['score'],
                ]);
            }
        });

        return redirect()->route('evaluation-records.index')
            ->with('message', 'Evaluation Record updated successfully!');
    }

    public function destroy(EvaluationResponse $evaluation_record)
    {
        DB::transaction(function () use ($evaluation_record) {
            $evaluation_record->questionResponses()->delete();
            $evaluation_record->delete();
        });

        return redirect()->route('evaluation-records.index')
            ->with('message', 'Evaluation Record deleted successfully!');
    }
}
