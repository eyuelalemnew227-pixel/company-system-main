<?php

namespace App\Http\Controllers;

use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AiQuizController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('permission', 'quiz.ai_generate');

        return Inertia::render('AiQuiz/Index', [
            'courses' => Course::orderBy('title')->get(['id', 'title']),
            'canCreateQuiz' => $request->user()->hasPermission('quiz.create'),
        ]);
    }

    public function generate(Request $request)
    {
        Gate::authorize('permission', 'quiz.ai_generate');

        $data = $request->validate([
            'topic' => ['required', 'string', 'min:2', 'max:200'],
            'difficulty' => ['required', Rule::in(['easy', 'medium', 'hard'])],
            'count' => ['required', 'integer', Rule::in([5, 10, 15])],
            'type' => ['required', Rule::in(['single', 'multiple', 'truefalse'])],
        ]);

        $apiKey = config('services.anthropic.key');
        if (! $apiKey) {
            return response()->json([
                'error' => 'AI generation is not configured. Set ANTHROPIC_API_KEY in the environment to enable this feature.',
            ], 503);
        }

        $prompt = $this->buildPrompt($data['topic'], $data['difficulty'], $data['count'], $data['type']);

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->timeout(60)->post('https://api.anthropic.com/v1/messages', [
            'model' => config('services.anthropic.model'),
            'max_tokens' => 4096,
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ]);

        if ($response->failed()) {
            return response()->json(['error' => 'AI generation failed: '.$response->json('error.message', $response->status())], 502);
        }

        $text = $response->json('content.0.text', '');
        $questions = $this->parseQuestions($text, $data['type']);

        if ($questions === null) {
            return response()->json(['error' => 'The AI returned an unexpected format. Please try again.'], 502);
        }

        return response()->json([
            'questions' => $questions,
            'meta' => ['topic' => $data['topic'], 'difficulty' => $data['difficulty'], 'type' => $data['type']],
        ]);
    }

    private function buildPrompt(string $topic, string $difficulty, int $count, string $type): string
    {
        $typeLabel = match ($type) {
            'multiple' => 'multiple-choice (2-4 correct answers each)',
            'truefalse' => 'true/false (exactly 2 answers: "True" and "False")',
            default => 'single-choice (exactly 1 correct answer)',
        };

        return <<<PROMPT
You are writing employee training quiz questions for Kaldi's Coffee PLC, a coffee shop company.
Generate {$count} {$typeLabel} quiz questions about: "{$topic}".
Difficulty level: {$difficulty}.

Respond with ONLY a JSON array (no markdown fences, no prose) where each item has this exact shape:
{"text": "question text", "type": "{$type}", "points": 1, "explanation": "short explanation of the correct answer", "answers": [{"text": "answer text", "isCorrect": true}, {"text": "answer text", "isCorrect": false}]}

Rules:
- "type" must always be "{$type}" for every question.
- For "single" and "truefalse": exactly one answer has isCorrect true.
- For "multiple": 2 to 4 answers have isCorrect true, at least one has isCorrect false.
- Provide 4 answers for single/multiple types, exactly 2 ("True", "False") for truefalse.
- Keep questions practical and specific to coffee shop operations where relevant.
PROMPT;
    }

    private function parseQuestions(string $text, string $type): ?array
    {
        $cleaned = trim($text);
        $cleaned = preg_replace('/^```(?:json)?/', '', $cleaned);
        $cleaned = preg_replace('/```$/', '', trim($cleaned));

        $decoded = json_decode(trim($cleaned), true);

        if (! is_array($decoded)) {
            if (preg_match('/\[.*\]/s', $cleaned, $m)) {
                $decoded = json_decode($m[0], true);
            }
        }

        if (! is_array($decoded)) {
            return null;
        }

        $questions = [];
        foreach ($decoded as $q) {
            if (! is_array($q) || empty($q['text']) || ! is_array($q['answers'] ?? null)) {
                continue;
            }
            $answers = [];
            foreach ($q['answers'] as $a) {
                if (! is_array($a) || empty($a['text'])) {
                    continue;
                }
                $answers[] = ['text' => (string) $a['text'], 'isCorrect' => (bool) ($a['isCorrect'] ?? false)];
            }
            if (count($answers) < 2 || ! collect($answers)->contains('isCorrect', true)) {
                continue;
            }
            $questions[] = [
                'id' => (string) Str::ulid(),
                'text' => (string) $q['text'],
                'type' => $type,
                'points' => max(1, (int) ($q['points'] ?? 1)),
                'explanation' => (string) ($q['explanation'] ?? ''),
                'answers' => $answers,
            ];
        }

        return $questions;
    }
}
