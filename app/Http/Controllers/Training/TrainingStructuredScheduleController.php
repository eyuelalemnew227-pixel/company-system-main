<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Training\TrainerEvaluation;
use App\Models\Training\TrainingAgenda;
use App\Models\Training\TrainingSchedule;
use App\Models\Training\TrainingScheduleItem;
use App\Services\TelegramTrainingNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrainingStructuredScheduleController extends Controller
{
    public function __construct(
        private readonly TelegramTrainingNotificationService $telegramService
    ) {}

    /**
     * Agendas Overview & List
     */
    public function agendasIndex(Request $request): Response
    {
        $user = $request->user();
        $query = TrainingAgenda::with(['department', 'submittedBy']);

        $isManager = $user->hasAnyRole(['Admin', 'Super Admin', 'Training Admin', 'Manager']) || $user->can('training.agendas.manage');

        if (!$isManager && $user->department_id) {
            $query->where('department_id', $user->department_id);
        }

        $agendas = $query->orderBy('created_at', 'desc')->get();

        return Inertia::render('training/agendas/index', [
            'agendas' => $agendas,
            'userDepartment' => $user->department,
        ]);
    }

    /**
     * Render Structured Training Agenda Form (Image 1 Format)
     */
    public function createAgenda(Request $request): Response
    {
        $user = $request->user();
        $departments = Department::orderBy('name')->get();

        return Inertia::render('training/agendas/StructuredAgendaSubmit', [
            'departments' => $departments,
            'userDepartment' => $user->department,
        ]);
    }

    /**
     * Store Structured Training Agenda (Image 1 Format)
     */
    public function storeAgenda(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'title' => 'required|string|max:255',
            'proposed_date' => 'nullable|date',
            'allocated_minutes' => 'required|integer|min:5|max:480',
            'description' => 'nullable|string',
            'objectives' => 'nullable|array',
            'content_outline' => 'nullable|array',
            'target_trainees' => 'nullable|array',
            'delivery_method' => 'required|string',
            'required_resources' => 'nullable|array',
        ]);

        $validated['submitted_by_user_id'] = $user->id;
        $validated['proposed_date'] = $validated['proposed_date'] ?? now()->toDateString();
        $validated['status'] = 'submitted';

        $agenda = TrainingAgenda::create($validated);

        // Telegram Notification to Training Department
        $this->telegramService->notifyAgendaSubmitted($agenda);

        return redirect()->route('training.agendas.index')
            ->with('success', 'Structured Training Agenda submitted successfully! Training Department has been notified via Telegram.');
    }

    /**
     * Display Structured Training Agenda Details (Image 1 Printable Format)
     */
    public function showAgenda(TrainingAgenda $agenda): Response
    {
        $agenda->load(['department', 'submittedBy']);

        return Inertia::render('training/agendas/StructuredAgendaShow', [
            'agenda' => $agenda,
        ]);
    }

    /**
     * Master Training Schedules Overview (Image 2 Format)
     */
    public function schedulesIndex(Request $request): Response
    {
        $schedules = TrainingSchedule::with(['createdBy', 'items.department', 'items.agenda', 'items.evaluations'])
            ->orderBy('schedule_date', 'desc')
            ->get();

        $submittedAgendas = TrainingAgenda::with('department')
            ->whereIn('status', ['submitted', 'reviewed'])
            ->get();

        return Inertia::render('training/schedules/Index', [
            'schedules' => $schedules,
            'submittedAgendas' => $submittedAgendas,
        ]);
    }

    /**
     * Render Master Schedule Builder Page
     */
    public function createSchedule(Request $request): Response
    {
        $departments = Department::orderBy('name')->get();
        $agendas = TrainingAgenda::with('department')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('training/schedules/MasterScheduleBuilder', [
            'departments' => $departments,
            'agendas' => $agendas,
        ]);
    }

    /**
     * Store Master Schedule Header & Grid Items (Image 2 Format)
     */
    public function storeSchedule(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'schedule_date' => 'required|date',
            'venue' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.training_agenda_id' => 'nullable|exists:training_agendas,id',
            'items.*.department_id' => 'nullable|exists:departments,id',
            'items.*.topic_title' => 'required|string|max:255',
            'items.*.allocated_minutes' => 'required|integer|min:5',
            'items.*.start_time' => 'required|string',
            'items.*.end_time' => 'required|string',
            'items.*.is_break' => 'boolean',
        ]);

        $schedule = TrainingSchedule::create([
            'title' => $validated['title'],
            'schedule_date' => $validated['schedule_date'],
            'venue' => $validated['venue'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by_user_id' => $user->id,
            'status' => 'draft',
        ]);

        $affectedDeptIds = [];

        foreach ($validated['items'] as $index => $itemData) {
            $scheduleItem = TrainingScheduleItem::create([
                'training_schedule_id' => $schedule->id,
                'training_agenda_id' => $itemData['training_agenda_id'] ?? null,
                'department_id' => $itemData['department_id'] ?? null,
                'topic_title' => $itemData['topic_title'],
                'order_no' => $index + 1,
                'allocated_minutes' => $itemData['allocated_minutes'],
                'start_time' => $itemData['start_time'],
                'end_time' => $itemData['end_time'],
                'is_break' => $itemData['is_break'] ?? false,
            ]);

            if ($scheduleItem->training_agenda_id) {
                TrainingAgenda::where('id', $scheduleItem->training_agenda_id)
                    ->update(['status' => 'scheduled']);
            }

            if ($scheduleItem->department_id) {
                $affectedDeptIds[] = $scheduleItem->department_id;
            }
        }

        // Notify affected Departments via Telegram
        $uniqueDeptIds = array_unique($affectedDeptIds);
        foreach ($uniqueDeptIds as $deptId) {
            $dept = Department::find($deptId);
            if ($dept) {
                $this->telegramService->notifyDepartmentScheduleSet($schedule, $dept);
            }
        }

        return redirect()->route('training.schedules.index')
            ->with('success', 'Master Training Schedule created & Department slot notifications sent!');
    }

    /**
     * Publish & Announce Master Schedule to all Departments & Branches via Telegram
     */
    public function publishSchedule(TrainingSchedule $schedule): RedirectResponse
    {
        $schedule->update(['status' => 'published']);

        // Update connected agendas status
        foreach ($schedule->items as $item) {
            if ($item->training_agenda_id) {
                TrainingAgenda::where('id', $item->training_agenda_id)
                    ->update(['status' => 'approved']);
            }
        }

        // Broadcast Telegram Notification to all departments & branch managers
        $this->telegramService->notifyMasterSchedulePublished($schedule);

        return back()->with('success', 'Master Training Schedule published and announced to all Departments and Branch Managers via Telegram!');
    }

    /**
     * Department Schedule Item Approval
     */
    public function approveScheduleItem(TrainingScheduleItem $item, Request $request): RedirectResponse
    {
        $user = $request->user();

        $item->update([
            'department_approved' => true,
            'department_approved_at' => now(),
            'department_approved_by' => $user->id,
        ]);

        return back()->with('success', 'Department schedule slot approved!');
    }

    /**
     * Render Branch Manager / Admin Trainer Department Evaluation Form
     */
    public function createEvaluation(Request $request, $item = null): Response
    {
        $user = $request->user();
        
        $scheduleItem = null;
        if ($item && $item !== 'new' && $item !== '0') {
            $scheduleItem = TrainingScheduleItem::with(['schedule', 'department', 'agenda'])->find($item);
        }

        $branches = Branch::orderBy('name')->get();
        $submittedDepartmentIds = TrainingAgenda::pluck('department_id')->unique()->filter()->toArray();
        $departments = Department::whereIn('id', $submittedDepartmentIds)->orderBy('name')->get();
        if ($departments->isEmpty()) {
            $departments = Department::orderBy('name')->get();
        }

        $scheduleItems = TrainingScheduleItem::with(['schedule', 'department'])->orderBy('created_at', 'desc')->take(40)->get();

        return Inertia::render('training/evaluations/TrainerEvaluationForm', [
            'scheduleItem' => $scheduleItem,
            'scheduleItems' => $scheduleItems,
            'userBranch' => $user->employee ? $user->employee->branch : null,
            'branches' => $branches,
            'departments' => $departments,
        ]);
    }

    /**
     * Store Trainer Department Evaluation Feedback
     */
    public function storeEvaluation(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'training_schedule_item_id' => 'nullable',
            'trainer_department_id' => 'required|exists:departments,id',
            'evaluator_branch_id' => 'nullable|exists:branches,id',
            'content_clarity_rating' => 'required|integer|min:1|max:5',
            'preparation_rating' => 'required|integer|min:1|max:5',
            'time_management_rating' => 'required|integer|min:1|max:5',
            'applicability_rating' => 'required|integer|min:1|max:5',
            'strengths' => 'nullable|string',
            'areas_for_improvement' => 'nullable|string',
            'feedback_notes' => 'nullable|string',
            'attendance_confirmed' => 'boolean',
        ]);

        $scheduleItemId = null;
        if (!empty($validated['training_schedule_item_id']) && is_numeric($validated['training_schedule_item_id'])) {
            $scheduleItemId = (int) $validated['training_schedule_item_id'];
        }

        $overall = ($validated['content_clarity_rating'] + $validated['preparation_rating'] + $validated['time_management_rating'] + $validated['applicability_rating']) / 4.0;

        TrainerEvaluation::create([
            'training_schedule_item_id' => $scheduleItemId,
            'evaluator_user_id' => $user->id,
            'evaluator_branch_id' => $validated['evaluator_branch_id'] ?: ($user->employee ? $user->employee->branch_id : Branch::first()?->id),
            'trainer_department_id' => $validated['trainer_department_id'],
            'content_clarity_rating' => $validated['content_clarity_rating'],
            'preparation_rating' => $validated['preparation_rating'],
            'time_management_rating' => $validated['time_management_rating'],
            'applicability_rating' => $validated['applicability_rating'],
            'overall_rating' => round($overall, 1),
            'strengths' => $validated['strengths'] ?? null,
            'areas_for_improvement' => $validated['areas_for_improvement'] ?? null,
            'feedback_notes' => $validated['feedback_notes'] ?? null,
            'attendance_confirmed' => $validated['attendance_confirmed'] ?? true,
        ]);

        return redirect()->route('training.evaluations.index')
            ->with('success', 'Trainer Department Evaluation submitted successfully! Thank you for your feedback.');
    }

    /**
     * List Branch Manager Trainer Department Evaluations & Ratings
     */
    public function evaluationsIndex(Request $request): Response
    {
        $evaluations = TrainerEvaluation::with([
            'scheduleItem.schedule',
            'evaluatorUser',
            'evaluatorBranch',
            'trainerDepartment',
        ])
        ->orderBy('created_at', 'desc')
        ->get();

        return Inertia::render('training/evaluations/Index', [
            'evaluations' => $evaluations,
        ]);
    }
}
