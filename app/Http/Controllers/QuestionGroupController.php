<?php

namespace App\Http\Controllers;

use App\Models\Question;
use App\Models\QuestionGroup;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuestionGroupController extends Controller
{
    public function index(Request $request)
    {
        $query = QuestionGroup::query()->withCount('questions');

        if ($search = $request->get('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return Inertia::render('question-groups/Index', [
            'groups' => $query->latest()->paginate(10)->withQueryString(),
            'request' => $request->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('question-groups/Create', [
            'questions' => Question::with('evaluationType:id,name')
                ->select('id', 'question_text', 'evaluation_type_id', 'status')
                ->where('status', 'active')
                ->orderBy('question_text')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'question_ids' => ['array'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
            'question_weights' => ['nullable', 'array'],
        ]);

        $group = QuestionGroup::create([
            'name' => $validated['name'],
        ]);

        if (!empty($validated['question_ids'])) {
            $syncData = [];
            foreach ($validated['question_ids'] as $id) {
                $syncData[$id] = ['weight' => $validated['question_weights'][$id] ?? 1.0];
            }
            $group->questions()->sync($syncData);
        }

        return to_route('question-groups.index')->with('message', 'Question Group created successfully!');
    }

    public function edit(QuestionGroup $question_group)
    {
        return Inertia::render('question-groups/Edit', [
            'group' => $question_group->load('questions:id,question_text'),
            'questions' => Question::with('evaluationType:id,name')
                ->select('id', 'question_text', 'evaluation_type_id', 'status')
                ->where('status', 'active')
                ->orderBy('question_text')
                ->get(),
            'current_weights' => $question_group->questions->pluck('pivot.weight', 'id'),
        ]);
    }

    public function update(Request $request, QuestionGroup $question_group)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'question_ids' => ['array'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
            'question_weights' => ['nullable', 'array'],
        ]);

        $question_group->update([
            'name' => $validated['name'],
        ]);

        $syncData = [];
        if (!empty($validated['question_ids'])) {
            foreach ($validated['question_ids'] as $id) {
                $syncData[$id] = ['weight' => $validated['question_weights'][$id] ?? 1.0];
            }
        }
        $question_group->questions()->sync($syncData);

        return to_route('question-groups.index')->with('message', 'Question Group updated successfully!');
    }

    public function destroy(QuestionGroup $question_group)
    {
        $question_group->delete();
        return to_route('question-groups.index')->with('message', 'Question Group deleted successfully!');
    }
}