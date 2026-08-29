<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\CourseCategory;
use App\Models\Training\QuestionBank;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QuestionBankController extends Controller
{
    public function index(Request $request): Response
    {
        $query = QuestionBank::with(['category', 'creator']);

        if ($request->filled('search')) {
            $query->where('text', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('difficulty')) {
            $query->where('difficulty', $request->difficulty);
        }

        $questions = $query->latest()->paginate(15)->withQueryString();
        $categories = CourseCategory::orderBy('name')->get();

        return Inertia::render('training/question-banks/index', [
            'questions' => $questions,
            'categories' => $categories,
            'filters' => $request->only(['search', 'type', 'difficulty']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:training_course_categories,id',
            'text' => 'required|string',
            'type' => 'required|in:single,multiple,truefalse,fillblank,matching,shortanswer,ordering',
            'difficulty' => 'required|in:easy,medium,hard',
            'tags' => 'nullable|string',
            'answer_data' => 'nullable|string',
        ]);

        $validated['created_by'] = $request->user()->id;

        QuestionBank::create($validated);

        return back()->with('success', 'Question bank entry created successfully.');
    }

    public function update(Request $request, QuestionBank $questionBank): RedirectResponse
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:training_course_categories,id',
            'text' => 'required|string',
            'type' => 'required|in:single,multiple,truefalse,fillblank,matching,shortanswer,ordering',
            'difficulty' => 'required|in:easy,medium,hard',
            'tags' => 'nullable|string',
            'answer_data' => 'nullable|string',
        ]);

        $questionBank->update($validated);

        return back()->with('success', 'Question bank entry updated successfully.');
    }

    public function destroy(QuestionBank $questionBank): RedirectResponse
    {
        $questionBank->delete();

        return back()->with('success', 'Question deleted successfully.');
    }
}
