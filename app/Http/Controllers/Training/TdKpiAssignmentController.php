<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\EvaluationResultOverride;
use App\Models\Training\RecurringTrainingModule;
use App\Models\Training\TdKpiAssessment;
use App\Models\Training\TdKpiAssignment;
use App\Models\Training\TrainingType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TdKpiAssignmentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = EvaluationResultOverride::query()
            ->where('next_action', 'training')
            ->with([
                'employee:id,employee_code,first_name,last_name,branch_id,department_id',
                'employee.branch:id,name',
                'employee.department:id,name',
                'trainingType:id,name',
                'fiscalYear:id,name',
                'fiscalMonth:id,name',
                'assignments.assignedTrainingContent:id,training_name',
                'assignments.assessment:id,assessment_name',
                'assignments.trainingType:id,name',
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

        if ($branchId = $request->input('branch_id')) {
            $query->whereHas('employee', fn ($q) => $q->where('branch_id', $branchId));
        }

        if ($departmentId = $request->input('department_id')) {
            $query->whereHas('employee', fn ($q) => $q->where('department_id', $departmentId));
        }

        if ($trainingTypeId = $request->input('training_type_id')) {
            $query->where('training_type_id', $trainingTypeId);
        }

        $paginator = $query->paginate(15)->withQueryString();

        $rows = $paginator->getCollection()->flatMap(function (EvaluationResultOverride $override) {
            $assignments = $override->assignments;

            if ($assignments->isEmpty()) {
                return collect([$this->mapRow($override, null)]);
            }

            return $assignments->map(fn (TdKpiAssignment $assignment) => $this->mapRow($override, $assignment));
        })->values();

        $paginator->setCollection($rows);

        return Inertia::render('training/TdKpi/Assignments/Index', [
            'rows' => $paginator,
            'trainingTypes' => TrainingType::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'trainingModules' => RecurringTrainingModule::query()
                ->orderBy('training_name')
                ->get(['id', 'training_name'])
                ->map(fn ($m) => ['id' => $m->id, 'name' => $m->training_name]),
            'request' => $request->only(['search', 'branch_id', 'department_id', 'training_type_id']),
        ]);
    }

    public function upsert(Request $request): RedirectResponse
    {
        if ($request->input('assigned_training_content_id') === '' || $request->input('assigned_training_content_id') === 'none') {
            $request->merge(['assigned_training_content_id' => null]);
        }
        if ($request->input('training_type_id') === '' || $request->input('training_type_id') === 'none') {
            $request->merge(['training_type_id' => null]);
        }
        if ($request->input('proposed_training_date') === '') {
            $request->merge(['proposed_training_date' => null]);
        }

        $validated = $request->validate([
            'evaluation_result_override_id' => [
                'required',
                'exists:evaluation_result_overrides,id',
                Rule::exists('evaluation_result_overrides', 'id')->where(fn ($q) => $q->where('next_action', 'training')),
            ],
            'training_type_id' => ['nullable', 'exists:training_types,id'],
            'assigned_training_content_id' => ['nullable', 'exists:recurring_training_modules,id'],
            'proposed_training_date' => ['nullable', 'date'],
            'is_training_held' => ['required', 'boolean'],
            'attendance' => ['required', 'boolean'],
        ]);

        $override = EvaluationResultOverride::query()
            ->with('employee:id,branch_id,department_id')
            ->findOrFail($validated['evaluation_result_override_id']);

        $existing = TdKpiAssignment::query()
            ->where('evaluation_result_override_id', $override->id)
            ->orderBy('id')
            ->get();

        $assessmentsGenerated = $existing->contains(fn (TdKpiAssignment $a) => $a->assessment_id !== null);
        $lockedContentId = $assessmentsGenerated
            ? $existing->first()?->assigned_training_content_id
            : null;

        $contentId = $validated['assigned_training_content_id'] ?? null;
        $isHeld = $request->boolean('is_training_held');
        $attendance = $request->boolean('attendance');

        if ($assessmentsGenerated) {
            if ((int) $contentId !== (int) $lockedContentId) {
                return Redirect::back()->withErrors([
                    'assigned_training_content_id' => 'Training content cannot be changed after training is held and attendance is recorded.',
                ])->withInput();
            }

            $contentId = $lockedContentId;
            $isHeld = true;
            $attendance = true;
        }

        if (($isHeld || $attendance) && ! $contentId) {
            return Redirect::back()->withErrors([
                'assigned_training_content_id' => 'Assign training content before marking training held or attendance.',
            ])->withInput();
        }

        if (! $contentId) {
            $isHeld = false;
            $attendance = false;
        }

        $employee = $override->employee;
        $shared = [
            'employee_id' => $override->employee_id,
            'fiscal_year_id' => $override->fiscal_year_id,
            'fiscal_month_id' => $override->fiscal_month_id,
            'branch_id' => $employee?->branch_id,
            'department_id' => $employee?->department_id,
            'training_type_id' => $validated['training_type_id'] ?? $override->training_type_id,
            'assigned_training_content_id' => $contentId,
            'proposed_training_date' => $validated['proposed_training_date'] ?? null,
            'is_training_held' => $isHeld,
            'attendance' => $attendance,
            'post_assessment_score' => null,
            'assigned_by' => auth()->id(),
        ];

        $shouldGenerateAssessments = $contentId && $isHeld && $attendance;

        if ($shouldGenerateAssessments) {
            $activeAssessments = TdKpiAssessment::query()
                ->where('training_module_id', $contentId)
                ->where('status', 'active')
                ->orderBy('id')
                ->get();

            if ($activeAssessments->isEmpty()) {
                $this->syncDraftAssignment($override, $existing, [
                    ...$shared,
                    'assessment_id' => null,
                ]);

                return Redirect::back()->withErrors([
                    'assigned_training_content_id' => 'Add an active assessment for this module',
                ])->withInput();
            }

            DB::transaction(function () use ($override, $existing, $shared, $activeAssessments) {
                $usedIds = [];

                foreach ($activeAssessments as $assessment) {
                    $row = $existing->first(
                        fn (TdKpiAssignment $a) => $a->assessment_id === $assessment->id && ! in_array($a->id, $usedIds, true)
                    );

                    if (! $row) {
                        $row = $existing->first(
                            fn (TdKpiAssignment $a) => $a->assessment_id === null && ! in_array($a->id, $usedIds, true)
                        );
                    }

                    $payload = [
                        ...$shared,
                        'evaluation_result_override_id' => $override->id,
                        'assessment_id' => $assessment->id,
                        'post_assessment_score' => null,
                    ];

                    if ($row) {
                        $usedIds[] = $row->id;
                        $row->update($payload);
                    } else {
                        $created = TdKpiAssignment::create($payload);
                        $usedIds[] = $created->id;
                    }
                }

                $existing
                    ->filter(fn (TdKpiAssignment $a) => ! in_array($a->id, $usedIds, true))
                    ->each(fn (TdKpiAssignment $a) => $a->delete());
            });

            return Redirect::back()->with('message', 'Assignment updated successfully!');
        }

        $this->syncDraftAssignment($override, $existing, [
            ...$shared,
            'assessment_id' => null,
        ]);

        return Redirect::back()->with('message', 'Assignment updated successfully!');
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TdKpiAssignment>  $existing
     * @param  array<string, mixed>  $payload
     */
    private function syncDraftAssignment(
        EvaluationResultOverride $override,
        $existing,
        array $payload
    ): void {
        DB::transaction(function () use ($override, $existing, $payload) {
            $first = $existing->first();

            $data = [
                ...$payload,
                'evaluation_result_override_id' => $override->id,
                'assessment_id' => null,
                'post_assessment_score' => null,
            ];

            if ($first) {
                $first->update($data);
                $existing
                    ->skip(1)
                    ->each(fn (TdKpiAssignment $a) => $a->delete());
            } else {
                TdKpiAssignment::create($data);
            }
        });
    }

    private function mapRow(EvaluationResultOverride $override, ?TdKpiAssignment $assignment): array
    {
        $employee = $override->employee;
        $contentLocked = $override->assignments->contains(
            fn (TdKpiAssignment $a) => $a->assessment_id !== null
        );

        return [
            'override_id' => $override->id,
            'assignment_id' => $assignment?->id,
            'employee_id' => $employee?->id,
            'employee_name' => trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? '')),
            'employee_code' => $employee?->employee_code,
            'branch' => $employee?->branch?->name,
            'department' => $employee?->department?->name,
            'training_type' => $override->trainingType?->name
                ?? $assignment?->trainingType?->name,
            'assigned_training_content' => $assignment?->assignedTrainingContent?->training_name,
            'proposed_training_date' => $assignment?->proposed_training_date?->format('Y-m-d'),
            'is_training_held' => (bool) ($assignment?->is_training_held ?? false),
            'attendance' => (bool) ($assignment?->attendance ?? false),
            'assessment_name' => $assignment?->assessment?->assessment_name,
            'post_assessment_score' => $assignment?->post_assessment_score !== null
                ? (float) $assignment->post_assessment_score
                : null,
            'fiscal_year_name' => $override->fiscalYear?->name,
            'fiscal_month_name' => $override->fiscalMonth?->name,
            'training_type_id' => $assignment?->training_type_id ?? $override->training_type_id,
            'assigned_training_content_id' => $assignment?->assigned_training_content_id,
            'assessment_id' => $assignment?->assessment_id,
            'content_locked' => $contentLocked,
        ];
    }
}
