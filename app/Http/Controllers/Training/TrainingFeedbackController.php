<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Training\TrainingFeedbackResponse;
use App\Models\Training\TrainingSchedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrainingFeedbackController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TrainingFeedbackResponse::with(['schedule', 'user', 'branch']);

        $user = $request->user();
        if ($user && !$user->can('training.feedback.view') && !$user->can('training.feedback.manage') && $user->can('training.feedback.view_own')) {
            $userBranchId = $user->employee?->branch_id;
            $query->where(function ($q) use ($user, $userBranchId) {
                $q->where('user_id', $user->id);
                if ($userBranchId) {
                    $q->orWhere('branch_id', $userBranchId);
                }
            });
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('trainee_name', 'like', "%{$search}%")
                  ->orWhere('q9_one_word_summary', 'like', "%{$search}%")
                  ->orWhere('q10_most_liked_aspects', 'like', "%{$search}%")
                  ->orWhere('q11_additional_comments', 'like', "%{$search}%");
            });
        }

        if ($request->filled('q6_gained_new_knowledge') && $request->input('q6_gained_new_knowledge') !== 'all') {
            $query->where('q6_gained_new_knowledge', $request->input('q6_gained_new_knowledge'));
        }

        $responses = $query->orderBy('created_at', 'desc')->get();

        $allResponses = TrainingFeedbackResponse::all();
        $summary = [
            'total' => $allResponses->count(),
            'avg_q1_relevance' => round($allResponses->avg('q1_relevance') ?? 0, 1),
            'avg_q3_response_quality' => round($allResponses->avg('q3_response_quality') ?? 0, 1),
            'avg_q4_participatory' => round($allResponses->avg('q4_participatory') ?? 0, 1),
            'avg_q5_motivating' => round($allResponses->avg('q5_motivating') ?? 0, 1),
            'gained_knowledge_yes_count' => $allResponses->where('q6_gained_new_knowledge', 'Yes')->count(),
        ];

        $schedules = TrainingSchedule::orderBy('schedule_date', 'desc')->get();
        $branches = Branch::orderBy('name')->get();

        return Inertia::render('training/feedback/Index', [
            'responses' => $responses,
            'summary' => $summary,
            'schedules' => $schedules,
            'branches' => $branches,
            'filters' => [
                'search' => $request->input('search', ''),
                'q6_gained_new_knowledge' => $request->input('q6_gained_new_knowledge', 'all'),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        $schedules = TrainingSchedule::orderBy('schedule_date', 'desc')->get();
        $branches = Branch::orderBy('name')->get();

        return Inertia::render('training/feedback/QuestionnaireForm', [
            'schedules' => $schedules,
            'branches' => $branches,
            'userBranch' => $user->employee ? $user->employee->branch : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'training_schedule_id' => 'nullable|exists:training_schedules,id',
            'branch_id' => 'nullable|exists:branches,id',
            'trainee_name' => 'nullable|string|max:255',
            'q1_relevance' => 'required|integer|min:1|max:5',
            'q2_objective_clarity' => 'required|string',
            'q3_response_quality' => 'required|integer|min:1|max:5',
            'q4_participatory' => 'required|integer|min:1|max:5',
            'q5_motivating' => 'required|integer|min:1|max:5',
            'q6_gained_new_knowledge' => 'required|string',
            'q7_motivation_diff' => 'nullable|string',
            'q8_knowledge_increase' => 'nullable|string',
            'q9_one_word_summary' => 'nullable|string|max:255',
            'q10_most_liked_aspects' => 'nullable|string',
            'q11_additional_comments' => 'nullable|string',
        ]);

        $validated['user_id'] = $user->id;
        $validated['trainee_name'] = $validated['trainee_name'] ?: $user->name;
        $validated['branch_id'] = $validated['branch_id'] ?: ($user->employee ? $user->employee->branch_id : null);

        TrainingFeedbackResponse::create($validated);

        return redirect()->route('training.feedback.index')
            ->with('success', 'አስተያየትዎ እና ግብረ-መልስዎ በተሳካ ሁኔታ ተመዝግቧል። እናመሰግናለን! (Feedback submitted successfully!)');
    }
}
