<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\CourseCategory;
use App\Models\QuestionBank;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QuestionBankController extends Controller
{
    private const TYPES = ['single', 'multiple', 'truefalse', 'fillblank', 'matching', 'shortanswer', 'ordering'];

    private const TEXT_TYPES = ['fillblank', 'shortanswer'];

    private const DIFFICULTIES = ['easy', 'medium', 'hard'];

    public function index(Request $request): Response
    {
        Gate::authorize('permission', 'quiz.view');

        $query = QuestionBank::query()->with('category:id,name')->latest('created_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('text', 'like', "%{$search}%")
                    ->orWhere('tags', 'like', "%{$search}%");
            });
        }
        if ($categoryId = $request->query('categoryId')) {
            $query->where('category_id', $categoryId);
        }
        if ($difficulty = $request->query('difficulty')) {
            $query->where('difficulty', $difficulty);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $paginated = $query->paginate(20)->withQueryString();
        $paginated->getCollection()->transform(fn (QuestionBank $q) => $this->present($q));

        return Inertia::render('QuestionBank/Index', [
            'questions' => $paginated,
            'categories' => CourseCategory::orderBy('name')->get(['id', 'name', 'slug']),
            'filters' => $request->only(['search', 'categoryId', 'difficulty', 'type']),
            'canManage' => $request->user()->hasPermission('quiz.create'),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'quiz.create');

        $data = $this->validated($request);

        $item = QuestionBank::create([
            'category_id' => $data['category_id'],
            'created_by' => $request->user()->id,
            'text' => $data['text'],
            'type' => $data['type'],
            'difficulty' => $data['difficulty'],
            'tags' => $data['tags'],
            'answer_data' => json_encode($data['answers']),
        ])->load('category:id,name');

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'question_bank.create',
            'module' => 'quizzes',
            'entity_type' => 'QuestionBank',
            'entity_id' => $item->id,
            'new_value' => str($item->text)->limit(80),
        ]);

        return back()->with('success', 'Question added to bank.');
    }

    public function update(Request $request, QuestionBank $questionBank)
    {
        Gate::authorize('permission', 'quiz.create');

        $data = $this->validated($request);

        $questionBank->update([
            'category_id' => $data['category_id'],
            'text' => $data['text'],
            'type' => $data['type'],
            'difficulty' => $data['difficulty'],
            'tags' => $data['tags'],
            'answer_data' => json_encode($data['answers']),
        ]);

        return back()->with('success', 'Question updated.');
    }

    public function destroy(Request $request, QuestionBank $questionBank)
    {
        Gate::authorize('permission', 'quiz.create');

        $questionBank->delete();

        return back()->with('success', 'Question deleted.');
    }

    private function validated(Request $request): array
    {
        $type = $request->input('type');
        $isText = in_array($type, self::TEXT_TYPES, true);

        $validated = $request->validate([
            'category_id' => ['nullable', 'exists:course_categories,id'],
            'text' => ['required', 'string', 'min:3'],
            'type' => ['required', Rule::in(self::TYPES)],
            'difficulty' => ['required', Rule::in(self::DIFFICULTIES)],
            'tags' => ['nullable', 'string'],
            'answers' => ['required', 'array', $isText ? 'min:1' : 'min:2'],
            'answers.*.text' => ['required', 'string'],
            'answers.*.isCorrect' => ['required', 'boolean'],
        ]);

        if (! $isText && ! collect($validated['answers'])->contains('isCorrect', true)) {
            abort(422, 'At least one correct answer is required.');
        }

        $validated['tags'] = $validated['tags'] ?? '';
        $validated['category_id'] = $validated['category_id'] ?? null;

        return $validated;
    }

    private function present(QuestionBank $q): array
    {
        return [
            'id' => $q->id,
            'categoryId' => $q->category_id,
            'category' => $q->category ? ['id' => $q->category->id, 'name' => $q->category->name] : null,
            'text' => $q->text,
            'type' => $q->type,
            'difficulty' => $q->difficulty,
            'tags' => $q->tags ?? '',
            'answers' => $q->answers,
            'createdAt' => $q->created_at,
        ];
    }
}
