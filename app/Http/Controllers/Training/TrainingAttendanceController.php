<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use App\Models\Training\TrainingAttendance;
use App\Models\Training\TrainingSchedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrainingAttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin') && !$user->hasAnyPermission(['training.attendance.view', 'training.attendance.create', 'training.attendance.manage', 'training.branch_manager.view'])) {
            abort(403, 'Access denied. You do not have permission to access Branch Manager Training Attendance.');
        }

        $selectedDate = $request->input('session_date', date('Y-m-d'));

        // Query existing attendance entries for the date
        $existingAttendances = TrainingAttendance::whereDate('session_date', $selectedDate)
            ->get()
            ->keyBy(function ($a) {
                return $a->user_id ? "user_{$a->user_id}" : "raw_{$a->user_type}_{$a->name}_{$a->branch_or_department}";
            });

        // 1. Branch Roster List (ONLY Branch Managers)
        $branches = Branch::orderBy('name')->get();

        $managerUserIds = User::whereHas('employee', function ($q) {
            $q->whereNotNull('branch_id')
              ->where(function ($sub) {
                  $sub->whereHas('position', function ($posQ) {
                      $posQ->where('title', 'like', '%Branch Manager%')
                           ->orWhere('title', 'like', '%BM%')
                           ->orWhere('title', 'like', '%Manager%');
                  })
                  ->orWhereHas('user.roles', function ($rq) {
                      $rq->where('name', 'like', '%Branch Manager%')
                         ->orWhere('name', 'like', '%Manager%');
                  })
                  ->orWhereHas('manager');
              });
        })->pluck('id')->toArray();

        $branchUsers = User::with(['employee.branch', 'employee.position'])
            ->whereIn('id', $managerUserIds)
            ->get();

        $branchRoster = collect();
        $coveredBranchIds = [];

        if ($branchUsers->isNotEmpty()) {
            foreach ($branchUsers as $u) {
                $b = $u->employee?->branch;
                if ($b) {
                    $coveredBranchIds[] = $b->id;
                }
                $bName = $b->name ?? 'Branch';
                $key = "user_{$u->id}";
                $att = $existingAttendances->get($key);
                $posTitle = $u->employee?->position?->title ?? $u->employee?->position?->name ?? 'Branch Manager';

                $branchRoster->push([
                    'id' => $att ? $att->id : null,
                    'user_id' => $u->id,
                    'branch_id' => $b?->id,
                    'user_type' => 'branch_manager',
                    'name' => $u->name . ($posTitle ? " ({$posTitle})" : ''),
                    'branch_or_department' => $bName,
                    'session_date' => $selectedDate,
                    'is_attended' => $att ? in_array($att->status, ['on_time', 'late', 'attended'], true) : false,
                    'status' => $att ? $att->status : 'absent',
                    'notes' => $att ? $att->notes : null,
                ]);
            }
        }

        foreach ($branches as $b) {
            if (!in_array($b->id, $coveredBranchIds)) {
                $key = "raw_branch_manager_{$b->name} Branch Manager_{$b->name}";
                $att = $existingAttendances->get($key);

                $branchRoster->push([
                    'id' => $att ? $att->id : null,
                    'user_id' => null,
                    'branch_id' => $b->id,
                    'user_type' => 'branch_manager',
                    'name' => "{$b->name} Branch Manager",
                    'branch_or_department' => $b->name,
                    'session_date' => $selectedDate,
                    'is_attended' => $att ? in_array($att->status, ['on_time', 'late', 'attended'], true) : false,
                    'status' => $att ? $att->status : 'absent',
                    'notes' => $att ? $att->notes : null,
                ]);
            }
        }

        // 2. Department Roster List (ONLY Head Office Department Users)
        $departments = Department::orderBy('name')->get();
        $deptUsers = User::with(['employee.department', 'employee.position'])
            ->whereHas('employee', fn($q) => $q->whereNotNull('department_id'))
            ->get();

        $deptRoster = collect();
        $coveredDeptIds = [];

        if ($deptUsers->isNotEmpty()) {
            foreach ($deptUsers as $u) {
                $d = $u->employee?->department;
                if ($d) {
                    $coveredDeptIds[] = $d->id;
                }
                $dName = $d->name ?? 'Head Office Dept';
                $key = "user_{$u->id}";
                $att = $existingAttendances->get($key);
                $posTitle = $u->employee?->position?->title ?? $u->employee?->position?->name;

                $deptRoster->push([
                    'id' => $att ? $att->id : null,
                    'user_id' => $u->id,
                    'department_id' => $d?->id,
                    'user_type' => 'trainer',
                    'name' => $u->name . ($posTitle ? " ({$posTitle})" : ''),
                    'branch_or_department' => $dName,
                    'session_date' => $selectedDate,
                    'is_attended' => $att ? in_array($att->status, ['on_time', 'late', 'attended'], true) : false,
                    'status' => $att ? $att->status : 'absent',
                    'notes' => $att ? $att->notes : null,
                ]);
            }
        }

        foreach ($departments as $d) {
            if (!in_array($d->id, $coveredDeptIds)) {
                $key = "raw_trainer_{$d->name} HQ Dept User_{$d->name}";
                $att = $existingAttendances->get($key);

                $deptRoster->push([
                    'id' => $att ? $att->id : null,
                    'user_id' => null,
                    'department_id' => $d->id,
                    'user_type' => 'trainer',
                    'name' => "{$d->name} HQ Dept User",
                    'branch_or_department' => $d->name,
                    'session_date' => $selectedDate,
                    'is_attended' => $att ? in_array($att->status, ['on_time', 'late', 'attended'], true) : false,
                    'status' => $att ? $att->status : 'absent',
                    'notes' => $att ? $att->notes : null,
                ]);
            }
        }

        $stats = [
            'total' => $branchRoster->count() + $deptRoster->count(),
            'branch_managers' => [
                'on_time' => $branchRoster->where('is_attended', true)->count(),
                'late' => 0,
                'absent' => $branchRoster->where('is_attended', false)->count(),
            ],
            'trainers' => [
                'on_time' => $deptRoster->where('is_attended', true)->count(),
                'late' => 0,
                'absent' => $deptRoster->where('is_attended', false)->count(),
            ]
        ];

        $schedules = TrainingSchedule::orderBy('schedule_date', 'desc')->get();

        return Inertia::render('training/attendance/Index', [
            'branchRoster' => $branchRoster,
            'deptRoster' => $deptRoster,
            'stats' => $stats,
            'schedules' => $schedules,
            'branches' => $branches,
            'departments' => $departments,
            'selectedDate' => $selectedDate,
            'filters' => [
                'search' => $request->input('search', ''),
                'session_date' => $selectedDate,
            ],
        ]);
    }

    public function toggleAttendance(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'user_type' => 'required|string|in:branch_manager,trainer',
            'name' => 'required|string|max:255',
            'branch_or_department' => 'nullable|string|max:255',
            'session_date' => 'required|date',
            'is_attended' => 'required|boolean',
        ]);

        $status = $validated['is_attended'] ? 'on_time' : 'absent';

        $record = TrainingAttendance::whereDate('session_date', $validated['session_date'])
            ->where(function ($q) use ($validated) {
                if (!empty($validated['user_id'])) {
                    $q->where('user_id', $validated['user_id']);
                } else {
                    $q->where('name', $validated['name'])
                      ->where('branch_or_department', $validated['branch_or_department']);
                }
            })->first();

        if ($record) {
            $record->update(['status' => $status]);
        } else {
            TrainingAttendance::create([
                'user_id' => $validated['user_id'] ?? null,
                'user_type' => $validated['user_type'],
                'name' => $validated['name'],
                'branch_or_department' => $validated['branch_or_department'],
                'session_date' => $validated['session_date'],
                'status' => $status,
                'recorded_by_user_id' => $request->user()->id,
            ]);
        }

        return back()->with('success', 'Attendance updated successfully.');
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'training_schedule_id' => 'nullable|exists:training_schedules,id',
            'user_type' => 'required|string|in:branch_manager,trainer',
            'name' => 'required|string|max:255',
            'branch_or_department' => 'nullable|string|max:255',
            'session_date' => 'required|date',
            'status' => 'required|string|in:on_time,late,absent',
            'notes' => 'nullable|string',
        ]);

        $validated['recorded_by_user_id'] = $user->id;

        TrainingAttendance::create($validated);

        return back()->with('success', 'Attendance record saved successfully.');
    }

    public function updateStatus(Request $request, TrainingAttendance $attendance): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:on_time,late,absent',
        ]);

        $attendance->update(['status' => $validated['status']]);

        return back()->with('success', 'Attendance status updated.');
    }
}
