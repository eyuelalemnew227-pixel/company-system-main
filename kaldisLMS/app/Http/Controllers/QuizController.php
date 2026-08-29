<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Answer;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizResponse;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class QuizController extends Controller
{
    public function store(Request $request)
    {
        Gate::authorize('permission', 'quiz.create');

        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'title' => ['required', 'string', 'min:3'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'pass_mark' => ['nullable', 'integer', 'min:0', 'max:100'],
            'max_attempts' => ['nullable', 'integer', 'min:0'],
            'randomize_questions' => ['boolean'],
            'show_answers_after' => ['boolean'],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.text' => ['required', 'string'],
            'questions.*.type' => ['required', 'string'],
            'questions.*.points' => ['nullable', 'integer', 'min:1'],
            'questions.*.explanation' => ['nullable', 'string'],
            'questions.*.answers' => ['required', 'array'],
            'questions.*.answers.*.text' => ['required', 'string'],
            'questions.*.answers.*.isCorrect' => ['required', 'boolean'],
        ]);

        $quiz = DB::transaction(function () use ($data, $request) {
            $quiz = Quiz::create([
                'course_id' => $data['course_id'],
                'title' => trim($data['title']),
                'time_limit_minutes' => $data['time_limit_minutes'] ?? 30,
                'pass_mark' => $data['pass_mark'] ?? 70,
                'max_attempts' => $data['max_attempts'] ?? 3,
                'randomize_questions' => $data['randomize_questions'] ?? false,
                'show_answers_after' => $data['show_answers_after'] ?? true,
                'status' => 'active',
            ]);

            foreach ($data['questions'] as $qi => $q) {
                $question = Question::create([
                    'quiz_id' => $quiz->id,
                    'text' => trim($q['text']),
                    'type' => $q['type'],
                    'points' => $q['points'] ?? 1,
                    'explanation' => $q['explanation'] ?? null,
                    'sort_order' => $qi,
                ]);

                foreach ($q['answers'] as $ai => $a) {
                    Answer::create([
                        'question_id' => $question->id,
                        'text' => trim($a['text']),
                        'is_correct' => $a['isCorrect'],
                        'sort_order' => $ai,
                    ]);
                }
            }

            ActivityLog::create([
                'user_id' => $request->user()->id, 'action' => 'quiz.create', 'module' => 'quizzes',
                'entity_type' => 'Quiz', 'entity_id' => $quiz->id, 'new_value' => $quiz->title,
            ]);

            return $quiz;
        });

        return redirect()->route('quizzes.index')->with('success', "Quiz created with {$quiz->questions()->count()} questions!");
    }

    public function index(Request $request): Response
    {
        $user = $request->user();

        $quizzes = Quiz::where('status', 'active')
            ->with(['course:id,title,thumbnail', 'questions:id,quiz_id,points'])
            ->when($user->employee, fn ($q) => $q->with(['attempts' => fn ($a) => $a->where('employee_id', $user->employee->id)->orderByDesc('submitted_at')]))
            ->orderBy('title')
            ->get();

        $result = $quizzes->map(function (Quiz $q) {
            $attempts = $q->relationLoaded('attempts') ? $q->attempts : collect();
            $totalPoints = $q->questions->sum('points');

            return [
                'id' => $q->id,
                'title' => $q->title,
                'courseId' => $q->course_id,
                'course' => $q->course,
                'timeLimitMinutes' => $q->time_limit_minutes,
                'passMark' => $q->pass_mark,
                'maxAttempts' => $q->max_attempts,
                'status' => $q->status,
                'questionCount' => $q->questions->count(),
                'totalPoints' => $totalPoints,
                'attemptsUsed' => $attempts->count(),
                'attempts' => $attempts->map(fn (QuizAttempt $a) => [
                    'id' => $a->id, 'score' => $a->score, 'passed' => $a->passed,
                    'submittedAt' => $a->submitted_at, 'timeTakenSeconds' => $a->time_taken_seconds,
                ]),
                'bestScore' => $attempts->max('score'),
                'passed' => $attempts->contains('passed', true),
            ];
        });

        return Inertia::render('Quizzes/Index', [
            'quizzes' => $result,
            'canCreate' => $user->hasPermission('quiz.create'),
            'canAiGenerate' => $user->hasPermission('quiz.ai_generate'),
        ]);
    }

    public function take(Request $request, Quiz $quiz): Response
    {
        Gate::authorize('permission', 'quiz.take');

        $quiz->load(['course:id,title', 'questions' => fn ($q) => $q->orderBy('sort_order')->with(['answers' => fn ($a) => $a->orderBy('sort_order')])]);

        $attemptCount = $request->user()->employee
            ? QuizAttempt::where('quiz_id', $quiz->id)->where('employee_id', $request->user()->employee->id)->count()
            : 0;

        return Inertia::render('Quizzes/Take', [
            'quiz' => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'course' => $quiz->course,
                'timeLimitMinutes' => $quiz->time_limit_minutes,
                'passMark' => $quiz->pass_mark,
                'maxAttempts' => $quiz->max_attempts,
                'randomizeQuestions' => $quiz->randomize_questions,
                'showAnswersAfter' => $quiz->show_answers_after,
                'attemptCount' => $attemptCount,
                // isCorrect intentionally omitted here — only revealed via the graded submit response.
                'questions' => $quiz->questions->map(fn ($q) => [
                    'id' => $q->id, 'text' => $q->text, 'type' => $q->type, 'points' => $q->points,
                    'explanation' => $q->explanation, 'sortOrder' => $q->sort_order,
                    'answers' => $q->answers->map(fn ($a) => ['id' => $a->id, 'text' => $a->text, 'sortOrder' => $a->sort_order]),
                ]),
            ],
        ]);
    }

    public function submit(Request $request, Quiz $quiz)
    {
        Gate::authorize('permission', 'quiz.take');
        $user = $request->user();
        abort_unless($user->employee, 400, 'No employee record on session.');

        $data = $request->validate([
            'started_at' => ['nullable', 'date'],
            'responses' => ['array'],
            'responses.*.question_id' => ['required', 'string'],
            'responses.*.answer_id' => ['nullable', 'string'],
            'responses.*.text_response' => ['nullable', 'string'],
        ]);

        $quiz->load('questions.answers');
        $employee = $user->employee;

        $priorAttempts = QuizAttempt::where('quiz_id', $quiz->id)->where('employee_id', $employee->id)->count();
        abort_if($quiz->max_attempts > 0 && $priorAttempts >= $quiz->max_attempts, 403, "Maximum attempts ({$quiz->max_attempts}) reached for this quiz.");

        $enrollment = Enrollment::firstOrCreate(
            ['course_id' => $quiz->course_id, 'employee_id' => $employee->id],
            ['enrolled_by' => $user->id, 'deadline' => now()->addDays(30), 'status' => 'active']
        );

        $startedAt = ! empty($data['started_at']) ? \Carbon\Carbon::parse($data['started_at']) : now()->subMinute();
        $submittedAt = now();
        $timeTakenSeconds = max(0, $submittedAt->diffInSeconds($startedAt));

        $respMap = collect($data['responses'] ?? [])->keyBy('question_id');

        $earnedPoints = 0;
        $totalPoints = 0;
        $gradedResponses = [];

        foreach ($quiz->questions as $q) {
            $totalPoints += $q->points ?: 1;
            $userResp = $respMap->get($q->id, ['answer_id' => null, 'text_response' => null]);
            $isCorrect = false;
            $correctAnswers = $q->answers->where('is_correct', true);
            $correctAnswerId = $correctAnswers->first()?->id;

            if ($q->type === 'multiple') {
                $selected = array_filter(array_map('trim', explode(',', $userResp['answer_id'] ?? '')));
                $selectedSet = collect($selected);
                $allCorrectIds = $correctAnswers->pluck('id');
                $hasIncorrect = $selectedSet->contains(fn ($sid) => ! $allCorrectIds->contains($sid));
                $hasAllCorrect = $allCorrectIds->every(fn ($cid) => $selectedSet->contains($cid));
                $isCorrect = ! $hasIncorrect && $hasAllCorrect && count($selected) > 0;
            } elseif (in_array($q->type, ['single', 'truefalse'], true)) {
                $isCorrect = ! empty($userResp['answer_id']) && $correctAnswers->contains('id', $userResp['answer_id']);
            } elseif ($q->type === 'ordering') {
                $correctOrder = $q->answers->sortBy('sort_order')->pluck('id')->values()->all();
                $userOrder = array_filter(array_map('trim', explode(',', $userResp['answer_id'] ?? '')));
                $isCorrect = $correctOrder === array_values($userOrder);
            } elseif ($q->type === 'matching') {
                $selected = array_filter(array_map('trim', explode(',', $userResp['answer_id'] ?? '')));
                $selectedSet = collect($selected);
                $isCorrect = $correctAnswers->count() > 0
                    && $correctAnswers->every(fn ($a) => $selectedSet->contains($a->id))
                    && count($selected) === $correctAnswers->count();
            } elseif (in_array($q->type, ['fillblank', 'shortanswer'], true)) {
                $text = trim(strtolower($userResp['text_response'] ?? ''));
                $isCorrect = $text !== '' && $correctAnswers->contains(fn ($a) => trim(strtolower($a->text)) === $text);
            }

            if ($isCorrect) {
                $earnedPoints += $q->points ?: 1;
            }

            $gradedResponses[] = [
                'question_id' => $q->id,
                'answer_id' => $userResp['answer_id'] ?? null,
                'text_response' => $userResp['text_response'] ?? null,
                'is_correct' => $isCorrect,
                'correct_answer_id' => $correctAnswerId,
            ];
        }

        $score = $totalPoints > 0 ? (int) round($earnedPoints / $totalPoints * 100) : 0;
        $passed = $score >= $quiz->pass_mark;

        $pointsAwarded = DB::transaction(function () use ($quiz, $employee, $enrollment, $score, $passed, $startedAt, $submittedAt, $timeTakenSeconds, $gradedResponses, $user) {
            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id, 'employee_id' => $employee->id, 'enrollment_id' => $enrollment->id,
                'score' => $score, 'passed' => $passed, 'started_at' => $startedAt,
                'submitted_at' => $submittedAt, 'time_taken_seconds' => $timeTakenSeconds,
            ]);

            foreach ($gradedResponses as $gr) {
                QuizResponse::create([
                    'attempt_id' => $attempt->id, 'question_id' => $gr['question_id'], 'answer_id' => $gr['answer_id'],
                    'text_response' => $gr['text_response'], 'is_correct' => $gr['is_correct'],
                ]);
            }

            $pointsAwarded = 0;
            if ($passed) {
                $pointsAwarded += (int) (Setting::where('key', 'points_quiz_pass')->value('value') ?? 20);
                if ($score === 100) {
                    $pointsAwarded += (int) (Setting::where('key', 'points_perfect_score')->value('value') ?? 50);
                }
            }
            if ($pointsAwarded > 0) {
                $employee->increment('total_points', $pointsAwarded);
            }

            ActivityLog::create([
                'user_id' => $user->id, 'action' => $passed ? 'quiz.passed' : 'quiz.failed', 'module' => 'quizzes',
                'entity_type' => 'Quiz', 'entity_id' => $quiz->id, 'new_value' => "{$score}% on \"{$quiz->title}\"",
            ]);

            return $pointsAwarded;
        });

        $attempt = QuizAttempt::where('quiz_id', $quiz->id)->where('employee_id', $employee->id)->latest('submitted_at')->first();

        return response()->json([
            'attemptId' => $attempt->id,
            'score' => $score,
            'passed' => $passed,
            'pointsAwarded' => $pointsAwarded,
            'timeTakenSeconds' => $timeTakenSeconds,
            'responses' => collect($gradedResponses)->map(fn ($r) => [
                'questionId' => $r['question_id'], 'answerId' => $r['answer_id'], 'textResponse' => $r['text_response'],
                'isCorrect' => $r['is_correct'], 'correctAnswerId' => $r['correct_answer_id'],
            ]),
            'quiz' => ['id' => $quiz->id, 'title' => $quiz->title, 'passMark' => $quiz->pass_mark, 'showAnswersAfter' => $quiz->show_answers_after],
        ]);
    }
}
