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

        $categories = EvaluationCategory::where('is_active', true)->select('id', 'name')->get();
        $existingNames = Evaluation::distinct()->pluck('name')->toArray();

        $allCategories = $categories->toArray();
        $existingCategoryNames = $categories->pluck('name')->toArray();

        foreach ($existingNames as $index => $name) {
            if (!in_array($name, $existingCategoryNames)) {
                $allCategories[] = [
                    'id' => -1 - $index, // Temporary fake ID
                    'name' => $name
                ];
            }
        }

        return Inertia::render('Evaluations/Create', [
            'evaluatorGroups' => $evaluatorGroups,
            'evaluatesGroups' => $evaluatesGroups,
            'evaluationCategories' => $allCategories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'evaluator_group_id' => 'required|exists:evaluator_groups,id',
            'evaluates_group_id' => 'required|exists:evaluates_groups,id',
        ]);

        // Ensure the evaluation name exists in evaluation_categories
        EvaluationCategory::firstOrCreate(
            ['name' => $validated['name']],
            ['weight' => 1, 'is_active' => true]
        );

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

        $categories = EvaluationCategory::where('is_active', true)->select('id', 'name')->get();
        $existingNames = Evaluation::distinct()->pluck('name')->toArray();

        $allCategories = $categories->toArray();
        $existingCategoryNames = $categories->pluck('name')->toArray();

        foreach ($existingNames as $index => $name) {
            if (!in_array($name, $existingCategoryNames)) {
                $allCategories[] = [
                    'id' => -1 - $index, // Temporary fake ID
                    'name' => $name
                ];
            }
        }

        return Inertia::render('Evaluations/Edit', [
            'evaluation' => $evaluation->load(['evaluatorGroup', 'evaluatesGroup']),
            'evaluatorGroups' => $evaluatorGroups,
            'evaluatesGroups' => $evaluatesGroups,
            'evaluationCategories' => $allCategories,
            'allEmployees' => \App\Models\Employee::select('id', 'first_name', 'last_name')->get(),
        ]);
    }

    public function update(Request $request, Evaluation $evaluation)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'evaluator_group_id' => 'required|exists:evaluator_groups,id',
            'evaluates_group_id' => 'required|exists:evaluates_groups,id',
            'add_evaluator_ids'  => 'nullable|array',
            'add_evaluator_ids.*'=> 'exists:employees,id',
            'add_evaluatee_ids'  => 'nullable|array',
            'add_evaluatee_ids.*'=> 'exists:employees,id', // Assuming employees for evaluable_type employee
        ]);

        // Ensure the evaluation name exists in evaluation_categories
        EvaluationCategory::firstOrCreate(
            ['name' => $validated['name']],
            ['weight' => 1, 'is_active' => true]
        );

        $evaluation->update([
            'name' => $validated['name'],
            'evaluator_group_id' => $validated['evaluator_group_id'],
            'evaluates_group_id' => $validated['evaluates_group_id']
        ]);

        // Inline appending missing members
        if (!empty($validated['add_evaluator_ids'])) {
            $evaluatorGroup = \App\Models\EvaluatorGroup::find($validated['evaluator_group_id']);
            if ($evaluatorGroup) {
                $evaluatorGroup->employees()->syncWithoutDetaching($validated['add_evaluator_ids']);
            }
        }

        if (!empty($validated['add_evaluatee_ids'])) {
            $evaluatesGroup = \App\Models\EvaluatesGroup::find($validated['evaluates_group_id']);
            if ($evaluatesGroup && strtolower($evaluatesGroup->evaluable_type) === 'employee') {
                $evaluatesGroup->employees()->syncWithoutDetaching($validated['add_evaluatee_ids']);
            }
        }

        return Redirect::route('evaluations.index')->with('flash.message', 'Evaluation updated successfully!');
    }

    public function destroy(Evaluation $evaluation)
    {
        $evaluation->delete();

        return Redirect::route('evaluations.index')->with('flash.message', 'Evaluation deleted successfully!');
    }
}
