<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Answer;
use App\Models\Training\Certificate;
use App\Models\Training\Course;
use App\Models\Training\Enrollment;
use App\Models\Training\Question;
use App\Models\Training\Quiz;
use App\Models\Training\QuizAttempt;
use App\Models\Training\QuizResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QuizController extends Controller
{
    public function index(Request $request): Response
    {
        $quizzes = Quiz::with(['course', 'questions'])
            ->latest()
            ->paginate(15);

        $courses = Course::where('status', 'published')->orderBy('title')->get();

        return Inertia::render('training/quizzes/index', [
            'quizzes' => $quizzes,
            'courses' => $courses,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:training_courses,id',
            'title' => 'required|string|max:255',
            'time_limit_minutes' => 'integer|min:1',
            'pass_mark' => 'integer|min:0|max:100',
            'max_attempts' => 'integer|min:1',
            'randomize_questions' => 'boolean',
            'show_answers_after' => 'boolean',
            'status' => 'required|in:active,inactive',
            'questions' => 'nullable|array',
            'questions.*.text' => 'required|string',
            'questions.*.type' => 'required|in:single,multiple,truefalse,fillblank',
            'questions.*.points' => 'integer|min:1',
            'questions.*.answers' => 'nullable|array',
            'questions.*.answers.*.text' => 'required|string',
            'questions.*.answers.*.is_correct' => 'boolean',
        ]);

        $quiz = Quiz::create([
            'course_id' => $validated['course_id'],
            'title' => $validated['title'],
            'time_limit_minutes' => $validated['time_limit_minutes'] ?? 30,
            'pass_mark' => $validated['pass_mark'] ?? 70,
            'max_attempts' => $validated['max_attempts'] ?? 3,
            'randomize_questions' => $validated['randomize_questions'] ?? false,
            'show_answers_after' => $validated['show_answers_after'] ?? true,
            'status' => $validated['status'] ?? 'active',
        ]);

        if (!empty($validated['questions'])) {
            foreach ($validated['questions'] as $qIndex => $qData) {
                $question = $quiz->questions()->create([
                    'text' => $qData['text'],
                    'type' => $qData['type'],
                    'points' => $qData['points'] ?? 1,
                    'sort_order' => $qIndex,
                ]);

                if (!empty($qData['answers'])) {
                    foreach ($qData['answers'] as $aIndex => $aData) {
                        $question->answers()->create([
                            'text' => $aData['text'],
                            'is_correct' => $aData['is_correct'] ?? false,
                            'sort_order' => $aIndex,
                        ]);
                    }
                }
            }
        }

        return back()->with('success', 'Quiz created successfully.');
    }

    public function take(Quiz $quiz, Request $request): Response
    {
        $quiz->load(['course', 'questions.answers']);
        $employee = $request->user()->employee;

        $previousAttemptsCount = 0;
        if ($employee) {
            $previousAttemptsCount = QuizAttempt::where('quiz_id', $quiz->id)
                ->where('employee_id', $employee->id)
                ->count();
        }

        return Inertia::render('training/quizzes/take', [
            'quiz' => $quiz,
            'previousAttemptsCount' => $previousAttemptsCount,
        ]);
    }

    public function submit(Quiz $quiz, Request $request): RedirectResponse
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return back()->with('error', 'Employee profile required.');
        }

        $responses = $request->input('responses', []); // [question_id => answer_id or text]
        $timeTaken = $request->input('time_taken_seconds', 0);

        $totalPoints = 0;
        $earnedPoints = 0;

        $quiz->load(['questions.answers']);

        $attempt = QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'employee_id' => $employee->id,
            'enrollment_id' => Enrollment::where('course_id', $quiz->course_id)
                ->where('employee_id', $employee->id)->value('id'),
            'score' => 0,
            'passed' => false,
            'started_at' => now()->subSeconds($timeTaken),
            'submitted_at' => now(),
            'time_taken_seconds' => $timeTaken,
        ]);

        foreach ($quiz->questions as $question) {
            $totalPoints += $question->points;
            $userAnswer = $responses[$question->id] ?? null;
            $isCorrect = false;

            if ($question->type === 'single' || $question->type === 'truefalse') {
                $correctAnswer = $question->answers->where('is_correct', true)->first();
                if ($correctAnswer && (string)$correctAnswer->id === (string)$userAnswer) {
                    $isCorrect = true;
                    $earnedPoints += $question->points;
                }

                QuizResponse::create([
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                    'answer_id' => is_numeric($userAnswer) ? $userAnswer : null,
                    'is_correct' => $isCorrect,
                ]);
            } else {
                // Short answer or fill blank text check
                $correctText = $question->answers->where('is_correct', true)->pluck('text')->map(fn($t) => strtolower(trim($t)));
                if (is_string($userAnswer) && $correctText->contains(strtolower(trim($userAnswer)))) {
                    $isCorrect = true;
                    $earnedPoints += $question->points;
                }

                QuizResponse::create([
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                    'text_response' => is_string($userAnswer) ? $userAnswer : null,
                    'is_correct' => $isCorrect,
                ]);
            }
        }

        $percentageScore = $totalPoints > 0 ? (int) round(($earnedPoints / $totalPoints) * 100) : 0;
        $passed = $percentageScore >= $quiz->pass_mark;

        $attempt->update([
            'score' => $percentageScore,
            'passed' => $passed,
        ]);

        // Auto issue certificate if course completed & passed
        if ($passed && $quiz->course) {
            Certificate::firstOrCreate([
                'employee_id' => $employee->id,
                'course_id' => $quiz->course_id,
            ], [
                'enrollment_id' => $attempt->enrollment_id,
                'certificate_number' => 'CERT-' . strtoupper(substr(md5(uniqid()), 0, 8)),
                'issue_date' => now(),
                'qr_code_data' => route('training.certificates.verify'),
            ]);
        }

        return redirect()->route('training.my-learning.index')
            ->with('success', "Quiz submitted! Score: {$percentageScore}%. " . ($passed ? "Passed!" : "Try again."));
    }
}
