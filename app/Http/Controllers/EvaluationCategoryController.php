<?php

namespace App\Http\Controllers;

use App\Models\EvaluationCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class EvaluationCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = EvaluationCategory::query();

        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $categories = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('EvaluationCategories/Index', [
            'categories' => $categories,
            'request' => $request->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('EvaluationCategories/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:evaluation_categories,name',
            'weight' => 'required|numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        EvaluationCategory::create($validated);

        return Redirect::route('evaluation-categories.index')->with('flash.message', 'Evaluation Category created successfully!');
    }

    public function edit(EvaluationCategory $evaluationCategory)
    {
        return Inertia::render('EvaluationCategories/Edit', [
            'category' => $evaluationCategory,
        ]);
    }

    public function update(Request $request, EvaluationCategory $evaluationCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:evaluation_categories,name,' . $evaluationCategory->id,
            'weight' => 'required|numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        $evaluationCategory->update($validated);

        return Redirect::route('evaluation-categories.index')->with('flash.message', 'Evaluation Category updated successfully!');
    }

    public function destroy(EvaluationCategory $evaluationCategory)
    {
        $evaluationCategory->delete();

        return Redirect::route('evaluation-categories.index')->with('flash.message', 'Evaluation Category deleted successfully!');
    }
}
