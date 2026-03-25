<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\EvaluationCategory;
use App\Models\EvaluatorGroup;
use App\Models\EvaluatesGroup;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class EvaluationController extends Controller
{
    public function index(Request $request)
    {
        $query = Evaluation::with(['evaluatorGroup', 'evaluatesGroup']);

        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhereHas('evaluatorGroup', function ($sq) use ($request) {
                        $sq->where('name', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereHas('evaluatesGroup', function ($sq) use ($request) {
                        $sq->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->has('evaluation_name') && $request->evaluation_name !== 'all') {
            $query->where('name', $request->evaluation_name);
        }



        if ($request->has('evaluator_group_id') && $request->evaluator_group_id !== 'all') {
            $query->where('evaluator_group_id', $request->evaluator_group_id);
        }

        if ($request->has('evaluates_group_id') && $request->evaluates_group_id !== 'all') {
            $query->where('evaluates_group_id', $request->evaluates_group_id);
        }

        $evaluations = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('Evaluations/Index', [
            'evaluations' => $evaluations,
            'request' => $request->only('evaluation_name', 'evaluator_group_id', 'evaluates_group_id'),
            'evaluatorGroups' => EvaluatorGroup::select('id', 'name')->orderBy('name')->get(),
            'evaluatesGroups' => EvaluatesGroup::select('id', 'name')->orderBy('name')->get(),
            'evaluationCategories' => EvaluationCategory::where('is_active', true)->select('id', 'name')->get(),
        ]);
    }

    public function create()
    {
        $evaluatorGroups = EvaluatorGroup::with('questionGroup:id,name')
            ->select('id', 'name', 'question_group_id')
            ->orderBy('name')
            ->get();

        $evaluatesGroups = EvaluatesGroup::with('questionGroup:id,name')
            ->select('id', 'name', 'question_group_id', 'evaluable_type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Evaluations/Create', [
            'evaluatorGroups' => $evaluatorGroups,
            'evaluatesGroups' => $evaluatesGroups,
            'evaluationCategories' => EvaluationCategory::where('is_active', true)->select('id', 'name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'evaluator_group_id' => 'required|exists:evaluator_groups,id',
            'evaluates_group_id' => 'required|exists:evaluates_groups,id',
        ]);

        Evaluation::create($validated);

        return Redirect::route('evaluations.index')->with('flash.message', 'Evaluation created successfully!');
    }

    public function edit(Evaluation $evaluation)
    {
        $evaluatorGroups = EvaluatorGroup::with('questionGroup:id,name')
            ->select('id', 'name', 'question_group_id')
            ->orderBy('name')
            ->get();

        $evaluatesGroups = EvaluatesGroup::with('questionGroup:id,name')
            ->select('id', 'name', 'question_group_id', 'evaluable_type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Evaluations/Edit', [
            'evaluation' => $evaluation->load(['evaluatorGroup', 'evaluatesGroup']),
            'evaluatorGroups' => $evaluatorGroups,
            'evaluatesGroups' => $evaluatesGroups,
            'evaluationCategories' => EvaluationCategory::where('is_active', true)->select('id', 'name')->get(),
        ]);
    }

    public function update(Request $request, Evaluation $evaluation)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'evaluator_group_id' => 'required|exists:evaluator_groups,id',
            'evaluates_group_id' => 'required|exists:evaluates_groups,id',
        ]);

        $evaluation->update($validated);

        return Redirect::route('evaluations.index')->with('flash.message', 'Evaluation updated successfully!');
    }

    public function destroy(Evaluation $evaluation)
    {
        $evaluation->delete();

        return Redirect::route('evaluations.index')->with('flash.message', 'Evaluation deleted successfully!');
    }
}
