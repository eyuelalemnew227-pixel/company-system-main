<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiQuizController extends Controller
{
    public function index(): Response
    {
        $courses = Course::where('status', 'published')->orderBy('title')->get();

        return Inertia::render('training/ai-quiz/index', [
            'courses' => $courses,
        ]);
    }

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'topic' => 'required|string|max:255',
            'count' => 'integer|min:1|max:10',
            'difficulty' => 'required|in:easy,medium,hard',
        ]);

        $topic = $request->topic;
        $count = $request->input('count', 3);

        // Smart mock AI question generator template
        $questions = [];
        for ($i = 1; $i <= $count; $i++) {
            $questions[] = [
                'text' => "What is a key principle of {$topic} (Question #{$i})?",
                'type' => 'single',
                'points' => 1,
                'answers' => [
                    ['text' => "Correct approach to {$topic} workflow", 'is_correct' => true],
                    ['text' => "Incorrect legacy method", 'is_correct' => false],
                    ['text' => "Unrelated operational procedure", 'is_correct' => false],
                    ['text' => "Outdated compliance standard", 'is_correct' => false],
                ],
            ];
        }

        return response()->json([
            'success' => true,
            'topic' => $topic,
            'questions' => $questions,
        ]);
    }
}
