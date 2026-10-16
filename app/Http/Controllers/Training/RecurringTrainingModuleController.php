<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Training\RecurringTrainingModule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class RecurringTrainingModuleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = RecurringTrainingModule::query()
            ->with([
                'conductingDepartment:id,name',
                'trainerEmployee:id,first_name,last_name,employee_code',
                'targetedDepartment:id,name',
            ])
            ->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('training_name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhereHas('conductingDepartment', fn ($d) => $d->where('name', 'like', '%' . $search . '%'))
                    ->orWhereHas('trainerEmployee', function ($e) use ($search) {
                        $e->where('first_name', 'like', '%' . $search . '%')
                            ->orWhere('last_name', 'like', '%' . $search . '%')
                            ->orWhere('employee_code', 'like', '%' . $search . '%')
                            ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
                    })
                    ->orWhereHas('targetedDepartment', fn ($d) => $d->where('name', 'like', '%' . $search . '%'));
            });
        }

        return Inertia::render('training/TdKpi/RecurringModules/Index', [
            'modules' => $query->paginate(15)->withQueryString()->through(function (RecurringTrainingModule $module) {
                $trainer = $module->trainerEmployee;

                return [
                    'id' => $module->id,
                    'training_name' => $module->training_name,
                    'description' => $module->description,
                    'conducting_department' => $module->conductingDepartment?->name,
                    'trainer_employee' => $trainer
                        ? trim(($trainer->first_name ?? '') . ' ' . ($trainer->last_name ?? '')) . ' (' . $trainer->employee_code . ')'
                        : null,
                    'targeted_department' => $module->targetedDepartment?->name ?? 'All',
                ];
            }),
            'request' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('training/TdKpi/RecurringModules/Create', $this->formOptions());
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateModule($request);

        RecurringTrainingModule::create($validated);

        return Redirect::route('training.td-kpi.recurring-modules.index')
            ->with('message', 'Recurring training module created successfully!');
    }

    public function edit(RecurringTrainingModule $recurringTrainingModule): Response
    {
        return Inertia::render('training/TdKpi/RecurringModules/Edit', [
            'module' => [
                'id' => $recurringTrainingModule->id,
                'training_name' => $recurringTrainingModule->training_name,
                'description' => $recurringTrainingModule->description ?? '',
                'conducting_department_id' => $recurringTrainingModule->conducting_department_id,
                'trainer_employee_id' => $recurringTrainingModule->trainer_employee_id,
                'targeted_department_id' => $recurringTrainingModule->targeted_department_id,
            ],
            ...$this->formOptions(),
        ]);
    }

    public function update(Request $request, RecurringTrainingModule $recurringTrainingModule): RedirectResponse
    {
        $validated = $this->validateModule($request);

        $recurringTrainingModule->update($validated);

        return Redirect::route('training.td-kpi.recurring-modules.index')
            ->with('message', 'Recurring training module updated successfully!');
    }

    public function destroy(RecurringTrainingModule $recurringTrainingModule): RedirectResponse
    {
        $recurringTrainingModule->delete();

        return Redirect::route('training.td-kpi.recurring-modules.index')
            ->with('message', 'Recurring training module deleted successfully!');
    }

    private function validateModule(Request $request): array
    {
        if ($request->input('targeted_department_id') === '' || $request->input('targeted_department_id') === 'all') {
            $request->merge(['targeted_department_id' => null]);
        }

        return $request->validate([
            'training_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'conducting_department_id' => ['required', 'exists:departments,id'],
            'trainer_employee_id' => ['required', 'exists:employees,id'],
            'targeted_department_id' => ['nullable', 'exists:departments,id'],
        ]);
    }

    private function formOptions(): array
    {
        return [
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'employees' => Employee::query()
                ->select('id', 'first_name', 'last_name', 'employee_code')
                ->orderBy('first_name')
                ->get()
                ->map(fn (Employee $employee) => [
                    'id' => $employee->id,
                    'name' => trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')) . ' (' . $employee->employee_code . ')',
                ]),
        ];
    }
}
