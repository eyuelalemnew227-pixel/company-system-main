<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Training\RecurringTrainingModule;
use App\Models\Training\TrainingRequest;
use App\Models\Training\TrainingType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TrainingRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TrainingRequest::query()
            ->where('requested_by', auth()->id())
            ->with([
                'employee:id,employee_code,first_name,last_name',
                'trainingType:id,name',
                'recurringModule:id,training_name',
            ])
            ->latest('id');

        if ($search = $request->input('search')) {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
            });
        }

        $requests = $query->paginate(15)->withQueryString()->through(function (TrainingRequest $trainingRequest) {
            $employee = $trainingRequest->employee;
            $canVerdict = $trainingRequest->status === TrainingRequest::STATUS_HELD
                && $trainingRequest->coordinator_actual_start_at !== null
                && $trainingRequest->coordinator_actual_end_at !== null;

            return [
                'id' => $trainingRequest->id,
                'employee_name' => trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? '')),
                'employee_code' => $employee?->employee_code,
                'training_type' => $trainingRequest->trainingType?->name,
                'module' => $trainingRequest->recurringModule?->training_name,
                'requested_on' => $trainingRequest->requested_on?->format('Y-m-d'),
                'status' => $trainingRequest->status,
                'status_label' => $this->statusLabel($trainingRequest->status),
                'first_proposed_start_at' => $this->formatDateTime($trainingRequest->first_proposed_start_at),
                'first_proposed_end_at' => $this->formatDateTime($trainingRequest->first_proposed_end_at),
                'current_proposed_start_at' => $this->formatDateTime($trainingRequest->current_proposed_start_at),
                'current_proposed_end_at' => $this->formatDateTime($trainingRequest->current_proposed_end_at),
                'coordinator_actual_start_at' => $this->formatDateTime($trainingRequest->coordinator_actual_start_at),
                'coordinator_actual_end_at' => $this->formatDateTime($trainingRequest->coordinator_actual_end_at),
                'coordinator_actual_start_at_input' => $this->toDateTimeLocal($trainingRequest->coordinator_actual_start_at),
                'coordinator_actual_end_at_input' => $this->toDateTimeLocal($trainingRequest->coordinator_actual_end_at),
                'actual_date_verdict' => $trainingRequest->actual_date_verdict,
                'requester_actual_start_at' => $this->formatDateTime($trainingRequest->requester_actual_start_at),
                'requester_actual_end_at' => $this->formatDateTime($trainingRequest->requester_actual_end_at),
                'requester_actual_start_at_input' => $this->toDateTimeLocal($trainingRequest->requester_actual_start_at),
                'requester_actual_end_at_input' => $this->toDateTimeLocal($trainingRequest->requester_actual_end_at),
                'can_submit_verdict' => $canVerdict,
            ];
        });

        return Inertia::render('training/Requests/Index', [
            'requests' => $requests,
            'request' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        $branches = Branch::query()
            ->with(['departments' => function ($query) {
                $query->where('is_active', true)->orderBy('name');
            }])
            ->where(function ($query) {
                $query->where('status', 'active')
                    ->orWhere('name', 'like', '%Head Office%')
                    ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
            })
            ->orderByRaw("CASE WHEN name LIKE '%Head Office%' OR UPPER(branch_code) = 'HO' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $employeeDepartmentIds = Employee::query()
            ->where('status', 'active')
            ->whereNotNull('branch_id')
            ->whereNotNull('department_id')
            ->select('branch_id', 'department_id')
            ->distinct()
            ->get()
            ->groupBy(fn ($row) => (int) $row->branch_id)
            ->map(fn ($rows) => $rows->pluck('department_id')->map(fn ($id) => (int) $id)->unique()->values()->all());

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->keyBy('id');

        $branches = $branches->map(function (Branch $branch) use ($departments, $employeeDepartmentIds) {
            $ids = $branch->departments
                ->pluck('id')
                ->merge($employeeDepartmentIds->get($branch->id, []))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->filter(fn (int $id) => $departments->has($id));

            return [
                'id' => $branch->id,
                'name' => $branch->name,
                'branch_code' => $branch->branch_code,
                'departments' => $departments
                    ->only($ids->all())
                    ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                    ->map(fn (Department $department) => [
                        'id' => $department->id,
                        'name' => $department->name,
                    ])
                    ->values(),
            ];
        })->values();

        $employees = Employee::query()
            ->select('id', 'first_name', 'last_name', 'employee_code', 'branch_id', 'department_id')
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'name' => trim($employee->first_name . ' ' . $employee->last_name)
                    . ($employee->employee_code ? ' (' . $employee->employee_code . ')' : ''),
                'branch_id' => $employee->branch_id,
                'department_id' => $employee->department_id,
            ]);

        return Inertia::render('training/Requests/Create', [
            'branches' => $branches,
            'employees' => $employees,
            'trainingTypes' => TrainingType::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'trainingModules' => RecurringTrainingModule::query()
                ->orderBy('training_name')
                ->get(['id', 'training_name'])
                ->map(fn ($module) => ['id' => $module->id, 'name' => $module->training_name]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['required', 'exists:departments,id'],
            'employee_ids' => ['required', 'array', 'min:1'],
            'employee_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('employees', 'id')->where(fn ($query) => $query
                    ->where('status', 'active')
                    ->where('branch_id', $request->input('branch_id'))
                    ->where('department_id', $request->input('department_id'))),
            ],
            'training_type_id' => ['required', 'exists:training_types,id'],
            'requested_on' => ['required', 'date'],
            'recurring_module_id' => ['required', 'exists:recurring_training_modules,id'],
            'extra_info' => ['nullable', 'string'],
        ], [
            'employee_ids.required' => 'Select at least one employee.',
            'employee_ids.min' => 'Select at least one employee.',
            'employee_ids.*.exists' => 'One or more selected employees are not in the chosen branch and department.',
            'employee_ids.*.distinct' => 'Each employee can only be selected once.',
        ], [
            'branch_id' => 'branch',
            'department_id' => 'department',
            'employee_ids' => 'employees',
            'employee_ids.*' => 'employee',
            'training_type_id' => 'training type',
            'requested_on' => 'proposed date',
            'recurring_module_id' => 'module',
        ]);

        $user = $request->user();
        $requestGroupId = (string) Str::uuid();

        DB::transaction(function () use ($validated, $user, $requestGroupId) {
            foreach ($validated['employee_ids'] as $employeeId) {
                TrainingRequest::create([
                    'request_group_id' => $requestGroupId,
                    'employee_id' => $employeeId,
                    'training_type_id' => $validated['training_type_id'],
                    'requested_on' => $validated['requested_on'],
                    'recurring_module_id' => $validated['recurring_module_id'],
                    'extra_info' => $validated['extra_info'] ?? null,
                    'requested_by' => $user?->id,
                    'requester_department_id' => $validated['department_id'],
                    'status' => TrainingRequest::STATUS_SUBMITTED,
                ]);
            }
        });

        $count = count($validated['employee_ids']);

        return Redirect::route('training.requests.index')
            ->with('message', $count === 1
                ? 'Training request submitted successfully!'
                : $count.' training requests submitted successfully!');
    }

    public function verdict(Request $request, TrainingRequest $trainingRequest): RedirectResponse
    {
        abort_unless((int) $trainingRequest->requested_by === (int) $request->user()?->id, 403);

        if (
            $trainingRequest->status !== TrainingRequest::STATUS_HELD
            || $trainingRequest->coordinator_actual_start_at === null
            || $trainingRequest->coordinator_actual_end_at === null
        ) {
            return Redirect::back()->withErrors([
                'actual_date_verdict' => 'You can confirm the actual training times only after the training is held.',
            ])->withInput();
        }

        if ($request->input('requester_actual_start_at') === '') {
            $request->merge(['requester_actual_start_at' => null]);
        }
        if ($request->input('requester_actual_end_at') === '') {
            $request->merge(['requester_actual_end_at' => null]);
        }

        $validated = $request->validate([
            'actual_date_verdict' => ['required', Rule::in([
                TrainingRequest::VERDICT_CORRECT,
                TrainingRequest::VERDICT_INCORRECT,
            ])],
            'requester_actual_start_at' => [
                Rule::requiredIf($request->input('actual_date_verdict') === TrainingRequest::VERDICT_INCORRECT),
                'nullable',
                'date',
            ],
            'requester_actual_end_at' => [
                Rule::requiredIf($request->input('actual_date_verdict') === TrainingRequest::VERDICT_INCORRECT),
                'nullable',
                'date',
                'after_or_equal:requester_actual_start_at',
            ],
        ], [], [
            'requester_actual_start_at' => 'corrected training start time',
            'requester_actual_end_at' => 'corrected training end time',
        ]);

        $incorrect = $validated['actual_date_verdict'] === TrainingRequest::VERDICT_INCORRECT;

        $updates = [
            'actual_date_verdict' => $validated['actual_date_verdict'],
            'requester_actual_start_at' => $incorrect ? $validated['requester_actual_start_at'] : null,
            'requester_actual_end_at' => $incorrect ? $validated['requester_actual_end_at'] : null,
        ];

        if ($trainingRequest->request_group_id) {
            TrainingRequest::query()
                ->where('request_group_id', $trainingRequest->request_group_id)
                ->update($updates);
        } else {
            $trainingRequest->update($updates);
        }

        return Redirect::back()->with('message', 'Actual training times recorded.');
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            TrainingRequest::STATUS_ASSIGNED => 'Assigned',
            TrainingRequest::STATUS_HELD => 'Held',
            default => 'Submitted',
        };
    }

    private function formatDateTime(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $time = (int) $value->format('i') === 0
            ? $value->format('g A')
            : $value->format('g:i A');

        return $value->format('M j, Y') . ', ' . $time;
    }

    private function toDateTimeLocal(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return $value->format('Y-m-d\TH:i');
    }
}
