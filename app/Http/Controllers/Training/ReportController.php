<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Training\TrainingAgenda;
use App\Models\Training\TrainingAttendance;
use App\Models\Training\TrainingFeedbackResponse;
use App\Models\Training\TrainingSchedule;
use App\Models\Training\TrainerEvaluation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $period = $request->input('period', 'all');
        $departmentId = $request->input('department_id', 'all');
        $startDate = $request->input('start_date', '');
        $endDate = $request->input('end_date', '');

        // 1. Attendance Data
        $attQuery = TrainingAttendance::query();
        if ($startDate) $attQuery->whereDate('session_date', '>=', $startDate);
        if ($endDate) $attQuery->whereDate('session_date', '<=', $endDate);

        $attendances = $attQuery->get();
        $attendanceStats = [
            'total' => $attendances->count(),
            'branch_managers' => [
                'on_time' => $attendances->where('user_type', 'branch_manager')->where('status', 'on_time')->count(),
                'late' => $attendances->where('user_type', 'branch_manager')->where('status', 'late')->count(),
                'absent' => $attendances->where('user_type', 'branch_manager')->where('status', 'absent')->count(),
            ],
            'trainers' => [
                'on_time' => $attendances->where('user_type', 'trainer')->where('status', 'on_time')->count(),
                'late' => $attendances->where('user_type', 'trainer')->where('status', 'late')->count(),
                'absent' => $attendances->where('user_type', 'trainer')->where('status', 'absent')->count(),
            ]
        ];

        // 2. Agendas Data
        $agendaQuery = TrainingAgenda::with('department');
        if ($departmentId !== 'all') $agendaQuery->where('department_id', $departmentId);
        if ($startDate) $agendaQuery->whereDate('proposed_date', '>=', $startDate);
        if ($endDate) $agendaQuery->whereDate('proposed_date', '<=', $endDate);
        $agendas = $agendaQuery->orderBy('created_at', 'desc')->get();

        // 3. Feedback Questionnaires Data (11 Amharic questions)
        $feedbackQuery = TrainingFeedbackResponse::with(['schedule', 'branch']);
        if ($startDate) $feedbackQuery->whereDate('created_at', '>=', $startDate);
        if ($endDate) $feedbackQuery->whereDate('created_at', '<=', $endDate);
        $feedbacks = $feedbackQuery->orderBy('created_at', 'desc')->get();

        $feedbackSummary = [
            'total_responses' => $feedbacks->count(),
            'avg_relevance' => round($feedbacks->avg('q1_relevance') ?? 0, 1),
            'avg_response_quality' => round($feedbacks->avg('q3_response_quality') ?? 0, 1),
            'avg_participatory' => round($feedbacks->avg('q4_participatory') ?? 0, 1),
            'avg_motivating' => round($feedbacks->avg('q5_motivating') ?? 0, 1),
            'gained_knowledge_yes' => $feedbacks->where('q6_gained_new_knowledge', 'Yes')->count(),
        ];

        // 4. Schedules Data
        $schedQuery = TrainingSchedule::with(['items.department', 'createdBy']);
        if ($startDate) $schedQuery->whereDate('schedule_date', '>=', $startDate);
        if ($endDate) $schedQuery->whereDate('schedule_date', '<=', $endDate);
        $schedules = $schedQuery->orderBy('schedule_date', 'desc')->get();

        // 5. Trainer Evaluations Data
        $evalQuery = TrainerEvaluation::with(['trainerDepartment', 'evaluatorBranch']);
        if ($startDate) $evalQuery->whereDate('created_at', '>=', $startDate);
        if ($endDate) $evalQuery->whereDate('created_at', '<=', $endDate);
        $evaluations = $evalQuery->orderBy('created_at', 'desc')->get();

        $departments = Department::orderBy('name')->get();

        return Inertia::render('training/reports/index', [
            'attendanceStats' => $attendanceStats,
            'attendances' => $attendances,
            'agendas' => $agendas,
            'feedbacks' => $feedbacks,
            'feedbackSummary' => $feedbackSummary,
            'schedules' => $schedules,
            'evaluations' => $evaluations,
            'departments' => $departments,
            'filters' => [
                'period' => $period,
                'department_id' => $departmentId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }
}
