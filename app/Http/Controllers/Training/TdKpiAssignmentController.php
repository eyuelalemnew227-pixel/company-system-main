<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\Training\EvaluationResultOverride;
use App\Models\Training\ProposedDatetimeChangeRequest;
use App\Models\Training\RecurringTrainingModule;
use App\Models\Training\TdKpiAssessment;
use App\Models\Training\TdKpiAssignment;
use App\Models\Training\TdKpiAssignmentQuestion;
use App\Models\Training\TdKpiQuestion;
use App\Models\Training\TrainingRequest;
use App\Models\Training\TrainingType;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TdKpiAssignmentController extends Controller
{
    public function index(Request $request): Response
    {
        $overrideQuery = EvaluationResultOverride::query()->where('next_action', 'training');
        $this->applyTraineeFilters($overrideQuery, $request);
        if ($trainingTypeId = $request->input('training_type_id')) {
            $overrideQuery->where('training_type_id', $trainingTypeId);
        }

        $requestQuery = TrainingRequest::query();
        $this->applyTraineeFilters($requestQuery, $request);
        if ($trainingTypeId) {
            $requestQuery->where('training_type_id', $trainingTypeId);
        }

        $overrideQuery->selectRaw("'evaluation_result' as source, evaluation_result_overrides.id as id, evaluation_result_overrides.created_at as created_at");
        $requestQuery->selectRaw("'training_request' as source, training_requests.id as id, training_requests.created_at as created_at");

        $union = $overrideQuery->toBase()->unionAll($requestQuery->toBase());

        $perPage = 15;
        $page = max(1, (int) $request->input('page', 1));
        $sourceQuery = DB::query()
            ->fromSub($union, 'assignment_sources')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $total = (clone $sourceQuery)->count();
        $sourceRows = $sourceQuery
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        $overrideIds = $sourceRows->where('source', 'evaluation_result')->pluck('id');
        $requestIds = $sourceRows->where('source', 'training_request')->pluck('id');

        $overrides = EvaluationResultOverride::query()
            ->with($this->overrideIndexRelations())
            ->whereIn('id', $overrideIds)
            ->get()
            ->keyBy('id');

        $trainingRequests = TrainingRequest::query()
            ->with($this->trainingRequestIndexRelations())
            ->whereIn('id', $requestIds)
            ->get()
            ->keyBy('id');

        $rows = $sourceRows->flatMap(function ($source) use ($overrides, $trainingRequests) {
            if ($source->source === 'evaluation_result') {
                $override = $overrides->get($source->id);
                if (! $override) {
                    return collect();
                }

                $assignments = $override->assignments;
                if ($assignments->isEmpty()) {
                    return collect([$this->mapOverrideRow($override, null)]);
                }

                return $assignments->map(fn (TdKpiAssignment $assignment) => $this->mapOverrideRow($override, $assignment));
            }

            $trainingRequest = $trainingRequests->get($source->id);
            if (! $trainingRequest) {
                return collect();
            }

            $assignments = $trainingRequest->assignments;
            if ($assignments->isEmpty()) {
                return collect([$this->mapRequestRow($trainingRequest, null)]);
            }

            return $assignments->map(fn (TdKpiAssignment $assignment) => $this->mapRequestRow($trainingRequest, $assignment));
        })->values();

        $pendingOverrideIds = ProposedDatetimeChangeRequest::query()
            ->where('status', ProposedDatetimeChangeRequest::STATUS_PENDING)
            ->whereIn('evaluation_result_override_id', $overrideIds)
            ->pluck('evaluation_result_override_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $groupContentLockByRequestId = $this->groupContentLockMap($trainingRequests);
        $pendingRequestIds = $this->groupPendingProposedDateMap($trainingRequests, $requestIds);

        $rows = $rows->map(function (array $row) use ($pendingOverrideIds, $pendingRequestIds, $groupContentLockByRequestId) {
            if ($row['override_id']) {
                $row['proposed_date_change_pending'] = in_array((int) $row['override_id'], $pendingOverrideIds, true);
            } else {
                $row['proposed_date_change_pending'] = in_array((int) $row['training_request_id'], $pendingRequestIds, true);
                if (! empty($groupContentLockByRequestId[(int) $row['training_request_id']])) {
                    $row['content_locked'] = true;
                }
            }
            $row['proposed_date_change_open'] = $this->proposedDateChangeOpen($row['proposed_training_start_at_input'] ?? null);

            return $row;
        })->values();

        $paginator = new LengthAwarePaginator(
            $rows,
            $total,
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

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
        if ($request->input('evaluation_result_override_id') === '') {
            $request->merge(['evaluation_result_override_id' => null]);
        }
        if ($request->input('training_request_id') === '') {
            $request->merge(['training_request_id' => null]);
        }
        if ($request->input('proposed_training_start_at') === '') {
            $request->merge(['proposed_training_start_at' => null]);
        }
        if ($request->input('proposed_training_end_at') === '') {
            $request->merge(['proposed_training_end_at' => null]);
        }
        if ($request->input('actual_training_start_at') === '') {
            $request->merge(['actual_training_start_at' => null]);
        }
        if ($request->input('actual_training_end_at') === '') {
            $request->merge(['actual_training_end_at' => null]);
        }
        if ($request->input('actual_source') === '') {
            $request->merge(['actual_source' => null]);
        }

        $validated = $request->validate([
            'evaluation_result_override_id' => [
                'nullable',
                'required_without:training_request_id',
                'prohibits:training_request_id',
                Rule::exists('evaluation_result_overrides', 'id')->where(fn ($q) => $q->where('next_action', 'training')),
            ],
            'training_request_id' => [
                'nullable',
                'required_without:evaluation_result_override_id',
                'prohibits:evaluation_result_override_id',
                'exists:training_requests,id',
            ],
            'training_type_id' => ['nullable', 'exists:training_types,id'],
            'assigned_training_content_id' => ['nullable', 'exists:recurring_training_modules,id'],
            'proposed_training_start_at' => ['required', 'date'],
            'proposed_training_end_at' => ['required', 'date', 'after_or_equal:proposed_training_start_at'],
            'is_training_held' => ['required', 'boolean'],
            'attendance' => ['required', 'boolean'],
            'actual_source' => ['nullable', Rule::in(['same', 'different'])],
            'actual_training_start_at' => [
                'nullable',
                'date',
                Rule::requiredIf(
                    $request->boolean('is_training_held') && $request->input('actual_source') === 'different'
                ),
            ],
            'actual_training_end_at' => [
                'nullable',
                'date',
                'after_or_equal:actual_training_start_at',
                Rule::requiredIf(
                    $request->boolean('is_training_held') && $request->input('actual_source') === 'different'
                ),
            ],
        ], [], [
            'proposed_training_start_at' => 'training start time',
            'proposed_training_end_at' => 'training end time',
            'actual_training_start_at' => 'actual training start time',
            'actual_training_end_at' => 'actual training end time',
        ]);

        $override = null;
        $trainingRequest = null;
        if (! empty($validated['evaluation_result_override_id'])) {
            $override = EvaluationResultOverride::query()
                ->with('employee:id,branch_id,department_id')
                ->findOrFail($validated['evaluation_result_override_id']);
        } else {
            $trainingRequest = TrainingRequest::query()
                ->with('employee:id,branch_id,department_id')
                ->findOrFail($validated['training_request_id']);
        }

        $existing = TdKpiAssignment::query()
            ->when(
                $override,
                fn ($q) => $q->where('evaluation_result_override_id', $override->id),
                fn ($q) => $q->where('training_request_id', $trainingRequest->id)
            )
            ->orderBy('id')
            ->get();

        $groupAssignments = $trainingRequest
            ? TdKpiAssignment::query()
                ->whereIn('training_request_id', $trainingRequest->groupMemberIds())
                ->orderBy('id')
                ->get()
            : $existing;

        $assessmentsGenerated = $existing->contains(fn (TdKpiAssignment $a) => $a->assessment_id !== null);
        $groupContentLocked = $groupAssignments->contains(fn (TdKpiAssignment $a) => $a->assessment_id !== null);
        $lockedContentId = $groupContentLocked
            ? ($groupAssignments->first(fn (TdKpiAssignment $a) => $a->assigned_training_content_id !== null)?->assigned_training_content_id
                ?? $existing->first()?->assigned_training_content_id)
            : null;

        $contentId = $validated['assigned_training_content_id'] ?? null;
        $isHeld = $request->boolean('is_training_held');
        $attendance = $request->boolean('attendance');
        $proposedStart = $validated['proposed_training_start_at'];
        $proposedEnd = $validated['proposed_training_end_at'];
        $savedProposed = $groupAssignments->first(
            fn (TdKpiAssignment $assignment) => $assignment->proposed_training_start_at !== null
        );
        if ($savedProposed?->proposed_training_start_at) {
            $savedStartKey = Carbon::parse($savedProposed->proposed_training_start_at)->format('Y-m-d H:i');
            $savedEndKey = Carbon::parse($savedProposed->proposed_training_end_at)->format('Y-m-d H:i');
            $incomingStartKey = Carbon::parse($proposedStart)->format('Y-m-d H:i');
            $incomingEndKey = Carbon::parse($proposedEnd)->format('Y-m-d H:i');
            if ($savedStartKey !== $incomingStartKey || $savedEndKey !== $incomingEndKey) {
                return Redirect::back()->withErrors([
                    'proposed_training_start_at' => 'The proposed training times are locked. Submit a change request to update them.',
                ])->withInput();
            }

            $proposedStart = $savedProposed->proposed_training_start_at;
            $proposedEnd = $savedProposed->proposed_training_end_at;
        }

        if ($groupContentLocked) {
            if ((int) $contentId !== (int) $lockedContentId) {
                return Redirect::back()->withErrors([
                    'assigned_training_content_id' => 'Training content cannot be changed after training is held and attendance is recorded.',
                ])->withInput();
            }

            $contentId = $lockedContentId;
            $isHeld = true;
        }

        if ($assessmentsGenerated) {
            $attendance = true;
        }

        if (($isHeld || $attendance) && ! $contentId) {
            return Redirect::back()->withErrors([
                'assigned_training_content_id' => 'Assign training content before marking training held or attendance.',
            ])->withInput();
        }

        if (($isHeld || $attendance) && (! $proposedStart || ! $proposedEnd)) {
            return Redirect::back()->withErrors([
                'proposed_training_start_at' => 'Set training start and end times before marking training held or attendance.',
            ])->withInput();
        }

        if (! $contentId) {
            $isHeld = false;
            $attendance = false;
        }

        $actualTrainingStartAt = null;
        $actualTrainingEndAt = null;
        if ($isHeld) {
            $actualSource = $validated['actual_source'] ?? null;
            if ($actualSource === 'same') {
                $actualTrainingStartAt = $proposedStart;
                $actualTrainingEndAt = $proposedEnd;
            } elseif ($actualSource === 'different') {
                $actualTrainingStartAt = $validated['actual_training_start_at'] ?? null;
                $actualTrainingEndAt = $validated['actual_training_end_at'] ?? null;
            } elseif ($existing->first()?->actual_training_start_at) {
                $actualTrainingStartAt = $existing->first()->actual_training_start_at;
                $actualTrainingEndAt = $existing->first()->actual_training_end_at;
            } else {
                return Redirect::back()->withErrors([
                    'actual_source' => 'Choose whether the actual times are the same as proposed or different.',
                ])->withInput();
            }

            if (! $actualTrainingStartAt || ! $actualTrainingEndAt) {
                return Redirect::back()->withErrors([
                    'actual_training_start_at' => 'Set the actual training start and end times.',
                ])->withInput();
            }
        }

        $employee = $override?->employee ?? $trainingRequest?->employee;
        $fiscal = $this->resolveFiscalPeriod($override, $trainingRequest, $existing);
        if ($fiscal instanceof RedirectResponse) {
            return $fiscal;
        }

        [$fiscalYearId, $fiscalMonthId] = $fiscal;

        $shared = [
            'evaluation_result_override_id' => $override?->id,
            'training_request_id' => $trainingRequest?->id,
            'employee_id' => $override?->employee_id ?? $trainingRequest?->employee_id,
            'fiscal_year_id' => $fiscalYearId,
            'fiscal_month_id' => $fiscalMonthId,
            'branch_id' => $employee?->branch_id,
            'department_id' => $employee?->department_id,
            'training_type_id' => $validated['training_type_id']
                ?? $override?->training_type_id
                ?? $trainingRequest?->training_type_id,
            'assigned_training_content_id' => $contentId,
            'proposed_training_start_at' => $proposedStart,
            'proposed_training_end_at' => $proposedEnd,
            'actual_training_start_at' => $actualTrainingStartAt,
            'actual_training_end_at' => $actualTrainingEndAt,
            'is_training_held' => $isHeld,
            'attendance' => $attendance,
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
                $this->syncDraftAssignment($existing, [
                    ...$shared,
                    'assessment_id' => null,
                    'post_assessment_score' => null,
                ]);
                $this->syncTrainingRequestFromAssignment($trainingRequest, $shared);
                $this->syncSharedAssignmentFieldsToGroup($trainingRequest, $shared);

                return Redirect::back()->withErrors([
                    'assigned_training_content_id' => 'Add an active assessment for this module',
                ])->withInput();
            }

            DB::transaction(function () use ($existing, $shared, $activeAssessments, $trainingRequest) {
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
                        'assessment_id' => $assessment->id,
                    ];

                    if ($row) {
                        if ($row->isSubmitted()) {
                            unset($payload['is_training_held'], $payload['attendance'], $payload['assigned_training_content_id']);
                        }
                        $usedIds[] = $row->id;
                        $row->update($payload);
                    } else {
                        $created = TdKpiAssignment::create([
                            ...$payload,
                            'post_assessment_score' => null,
                        ]);
                        $usedIds[] = $created->id;
                    }
                }

                $existing
                    ->filter(fn (TdKpiAssignment $a) => ! in_array($a->id, $usedIds, true))
                    ->each(fn (TdKpiAssignment $a) => $a->delete());

                $this->syncTrainingRequestFromAssignment($trainingRequest, $shared);
                $this->syncSharedAssignmentFieldsToGroup($trainingRequest, $shared);
            });

            return Redirect::back()->with('message', 'Assignment updated successfully!');
        }

        $this->syncDraftAssignment($existing, [
            ...$shared,
            'assessment_id' => null,
            'post_assessment_score' => null,
        ]);
        $this->syncTrainingRequestFromAssignment($trainingRequest, $shared);
        $this->syncSharedAssignmentFieldsToGroup($trainingRequest, $shared);

        return Redirect::back()->with('message', 'Assignment updated successfully!');
    }

    public function take(TdKpiAssignment $assignment): Response
    {
        abort_unless($assignment->assessment_id, 404);

        $assignment->load([
            'employee:id,employee_code,first_name,last_name,branch_id,department_id',
            'employee.branch:id,name',
            'employee.department:id,name',
            'trainingType:id,name',
            'assignedTrainingContent:id,training_name',
            'assessment:id,assessment_name,randomization_questions_number',
            'fiscalYear:id,name',
            'fiscalMonth:id,name',
            'assignmentQuestions.question.inputType:id,type_identifier,name',
            'assignmentQuestions.question.choices',
        ]);

        if (! $assignment->isSubmitted() && $assignment->assignmentQuestions->isEmpty()) {
            $this->assignRandomQuestions($assignment);
            $assignment->load([
                'assignmentQuestions.question.inputType:id,type_identifier,name',
                'assignmentQuestions.question.choices',
            ]);
        }

        $submitted = $assignment->isSubmitted();

        return Inertia::render('training/TdKpi/Assignments/Take', [
            'assignment' => [
                'id' => $assignment->id,
                'submitted' => $submitted,
                'submitted_at' => $assignment->submitted_at?->toDateTimeString(),
                'post_assessment_score' => $assignment->post_assessment_score !== null
                    ? (float) $assignment->post_assessment_score
                    : null,
                'employee_name' => trim(($assignment->employee?->first_name ?? '') . ' ' . ($assignment->employee?->last_name ?? '')),
                'employee_code' => $assignment->employee?->employee_code,
                'branch' => $assignment->employee?->branch?->name,
                'department' => $assignment->employee?->department?->name,
                'training_type' => $assignment->trainingType?->name,
                'assigned_training_content' => $assignment->assignedTrainingContent?->training_name,
                'proposed_training_start_at' => $this->formatDateTime($assignment->proposed_training_start_at),
                'proposed_training_end_at' => $this->formatDateTime($assignment->proposed_training_end_at),
                'is_training_held' => (bool) $assignment->is_training_held,
                'attendance' => (bool) $assignment->attendance,
                'assessment_name' => $assignment->assessment?->assessment_name,
                'fiscal_year_name' => $assignment->fiscalYear?->name,
                'fiscal_month_name' => $assignment->fiscalMonth?->name,
            ],
            'questions' => $assignment->assignmentQuestions->map(function (TdKpiAssignmentQuestion $pivot) use ($submitted) {
                $question = $pivot->question;
                $type = $question?->inputType?->type_identifier ?? 'text';
                $payload = [
                    'id' => $pivot->id,
                    'question_id' => $question?->id,
                    'label' => $question?->label,
                    'type_identifier' => $type,
                    'choices' => ($question?->choices ?? collect())->map(fn ($c) => [
                        'label' => $c->label,
                        'value' => $c->value,
                    ])->values()->all(),
                    'response' => $this->decodeResponse($pivot->response, $type),
                ];

                if ($submitted) {
                    $bankAnswer = $question?->answer;
                    $payload['is_correct'] = $bankAnswer !== null && $bankAnswer !== ''
                        ? $this->responsesMatch($pivot->response, $bankAnswer, $type)
                        : null;
                }

                return $payload;
            })->values()->all(),
        ]);
    }

    public function submit(Request $request, TdKpiAssignment $assignment): RedirectResponse
    {
        abort_unless($assignment->assessment_id, 404);

        if ($assignment->isSubmitted()) {
            return Redirect::route('training.td-kpi.assignments.take', $assignment)
                ->withErrors(['submit' => 'This assessment has already been submitted.']);
        }

        $assignment->load([
            'assignmentQuestions.question.inputType:id,type_identifier',
            'assignmentQuestions.question',
        ]);

        if ($assignment->assignmentQuestions->isEmpty()) {
            return Redirect::route('training.td-kpi.assignments.take', $assignment)
                ->withErrors(['submit' => 'No questions are assigned for this assessment.']);
        }

        $validated = $request->validate([
            'responses' => ['required', 'array'],
            'responses.*.id' => ['required', 'integer'],
            'responses.*.value' => ['nullable'],
        ]);

        $responseMap = collect($validated['responses'])->keyBy('id');
        $assignedIds = $assignment->assignmentQuestions->pluck('id')->all();

        foreach ($responseMap->keys() as $pivotId) {
            if (! in_array((int) $pivotId, $assignedIds, true)) {
                return Redirect::back()->withErrors(['responses' => 'Invalid question response.'])->withInput();
            }
        }

        DB::transaction(function () use ($assignment, $responseMap) {
            $correct = 0;
            $scorable = 0;

            foreach ($assignment->assignmentQuestions as $pivot) {
                $question = $pivot->question;
                $type = $question?->inputType?->type_identifier ?? 'text';
                $rawValue = $responseMap->get($pivot->id)['value'] ?? null;
                $encoded = $this->encodeResponse($rawValue, $type);

                $pivot->update(['response' => $encoded]);

                $bankAnswer = $question?->answer;
                if ($bankAnswer !== null && $bankAnswer !== '') {
                    $scorable++;
                    if ($this->responsesMatch($encoded, $bankAnswer, $type)) {
                        $correct++;
                    }
                }
            }

            $score = $scorable > 0
                ? round(($correct / $scorable) * 100, 2)
                : ($assignment->assignmentQuestions->isNotEmpty() ? 0.0 : 0.0);

            $assignment->update([
                'post_assessment_score' => $score,
                'submitted_at' => now(),
                'submitted_by' => auth()->id(),
            ]);
        });

        return Redirect::route('training.td-kpi.assignments.take', $assignment)
            ->with('message', 'Assessment submitted successfully!');
    }

    private function assignRandomQuestions(TdKpiAssignment $assignment): void
    {
        $assessment = $assignment->assessment
            ?? TdKpiAssessment::query()->find($assignment->assessment_id);

        if (! $assessment) {
            return;
        }

        $limit = max(1, (int) $assessment->randomization_questions_number);

        $questions = TdKpiQuestion::query()
            ->where('assessment_id', $assessment->id)
            ->where('status', 'active')
            ->inRandomOrder()
            ->limit($limit)
            ->get();

        DB::transaction(function () use ($assignment, $questions) {
            foreach ($questions as $index => $question) {
                TdKpiAssignmentQuestion::create([
                    'td_kpi_assignment_id' => $assignment->id,
                    'td_kpi_question_id' => $question->id,
                    'order_index' => $index,
                    'response' => null,
                ]);
            }
        });
    }

    private function encodeResponse(mixed $value, string $type): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($this->isMultiValueType($type)) {
            $values = is_array($value)
                ? $value
                : (preg_split('/\s*,\s*/', (string) $value) ?: []);
            $values = array_values(array_filter(array_map(fn ($v) => trim((string) $v), $values), fn ($v) => $v !== ''));

            return $values === [] ? null : json_encode($values);
        }

        return trim((string) $value);
    }

    private function decodeResponse(?string $response, string $type): string|array|null
    {
        if ($response === null || $response === '') {
            return $this->isMultiValueType($type) ? [] : '';
        }

        if ($this->isMultiValueType($type)) {
            $decoded = json_decode($response, true);
            if (is_array($decoded)) {
                return $decoded;
            }

            return array_values(array_filter(array_map('trim', preg_split('/\s*,\s*/', $response) ?: [])));
        }

        return $response;
    }

    private function responsesMatch(?string $encodedResponse, string $bankAnswer, string $type): bool
    {
        if ($encodedResponse === null || $encodedResponse === '') {
            return false;
        }

        if ($this->isMultiValueType($type)) {
            $given = $this->normalizeValueSet($this->decodeResponse($encodedResponse, $type));
            $expected = $this->normalizeValueSet(
                preg_split('/\s*,\s*/', $bankAnswer) ?: []
            );

            return $given === $expected;
        }

        return mb_strtolower(trim($encodedResponse)) === mb_strtolower(trim($bankAnswer));
    }

    /**
     * @param  array<int, mixed>|string|null  $values
     * @return array<int, string>
     */
    private function normalizeValueSet(array|string|null $values): array
    {
        if ($values === null) {
            return [];
        }

        if (! is_array($values)) {
            $values = preg_split('/\s*,\s*/', (string) $values) ?: [];
        }

        $normalized = array_map(fn ($v) => mb_strtolower(trim((string) $v)), $values);
        $normalized = array_values(array_filter($normalized, fn ($v) => $v !== ''));
        sort($normalized);

        return $normalized;
    }

    private function isMultiValueType(string $type): bool
    {
        return $type === 'select_multiple' || $type === 'checkbox';
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TdKpiAssignment>  $existing
     * @param  array<string, mixed>  $payload
     */
    private function syncDraftAssignment($existing, array $payload): void
    {
        DB::transaction(function () use ($existing, $payload) {
            $first = $existing->first();

            $data = [
                ...$payload,
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

    /**
     * @param  array<string, mixed>  $shared
     */
    private function syncTrainingRequestFromAssignment(?TrainingRequest $trainingRequest, array $shared): void
    {
        if (! $trainingRequest) {
            return;
        }

        $proposedStart = $shared['proposed_training_start_at'] ?? null;
        $proposedEnd = $shared['proposed_training_end_at'] ?? null;
        $isHeld = (bool) ($shared['is_training_held'] ?? false);
        $actualStart = $isHeld ? ($shared['actual_training_start_at'] ?? null) : null;
        $actualEnd = $isHeld ? ($shared['actual_training_end_at'] ?? null) : null;

        $status = TrainingRequest::STATUS_SUBMITTED;
        if ($isHeld) {
            $status = TrainingRequest::STATUS_HELD;
        } elseif ($proposedStart) {
            $status = TrainingRequest::STATUS_ASSIGNED;
        }

        $memberIds = $trainingRequest->groupMemberIds();

        TrainingRequest::query()
            ->whereIn('id', $memberIds)
            ->update([
                'current_proposed_start_at' => $proposedStart,
                'current_proposed_end_at' => $proposedEnd,
                'coordinator_actual_start_at' => $actualStart,
                'coordinator_actual_end_at' => $actualEnd,
                'status' => $status,
            ]);

        if ($proposedStart) {
            TrainingRequest::query()
                ->whereIn('id', $memberIds)
                ->whereNull('first_proposed_start_at')
                ->update([
                    'first_proposed_start_at' => $proposedStart,
                    'first_proposed_end_at' => $proposedEnd,
                ]);
        }
    }

    /**
     * Copy shared assignment fields to the other employees in the same training request group.
     * Attendance and assessments stay per employee.
     *
     * @param  array<string, mixed>  $shared
     */
    private function syncSharedAssignmentFieldsToGroup(?TrainingRequest $trainingRequest, array $shared): void
    {
        if (! $trainingRequest?->request_group_id) {
            return;
        }

        $members = $trainingRequest->groupMembers()
            ->load('employee:id,branch_id,department_id');

        if ($members->count() <= 1) {
            return;
        }

        foreach ($members as $member) {
            if ((int) $member->id === (int) $trainingRequest->id) {
                continue;
            }

            $existing = TdKpiAssignment::query()
                ->where('training_request_id', $member->id)
                ->orderBy('id')
                ->get();

            $hasAssessments = $existing->contains(fn (TdKpiAssignment $a) => $a->assessment_id !== null);
            $currentAttendance = (bool) ($existing->first()?->attendance ?? false);
            $employee = $member->employee;

            $siblingShared = [
                'evaluation_result_override_id' => null,
                'training_request_id' => $member->id,
                'employee_id' => $member->employee_id,
                'fiscal_year_id' => $shared['fiscal_year_id'] ?? null,
                'fiscal_month_id' => $shared['fiscal_month_id'] ?? null,
                'branch_id' => $employee?->branch_id,
                'department_id' => $employee?->department_id,
                'training_type_id' => $shared['training_type_id'] ?? null,
                'assigned_training_content_id' => $shared['assigned_training_content_id'] ?? null,
                'proposed_training_start_at' => $shared['proposed_training_start_at'] ?? null,
                'proposed_training_end_at' => $shared['proposed_training_end_at'] ?? null,
                'actual_training_start_at' => $shared['actual_training_start_at'] ?? null,
                'actual_training_end_at' => $shared['actual_training_end_at'] ?? null,
                'is_training_held' => (bool) ($shared['is_training_held'] ?? false),
                'attendance' => $hasAssessments ? true : $currentAttendance,
                'assigned_by' => $shared['assigned_by'] ?? auth()->id(),
            ];

            if ($hasAssessments) {
                foreach ($existing as $row) {
                    $payload = [
                        'training_type_id' => $siblingShared['training_type_id'],
                        'proposed_training_start_at' => $siblingShared['proposed_training_start_at'],
                        'proposed_training_end_at' => $siblingShared['proposed_training_end_at'],
                        'actual_training_start_at' => $siblingShared['actual_training_start_at'],
                        'actual_training_end_at' => $siblingShared['actual_training_end_at'],
                        'is_training_held' => true,
                        'attendance' => true,
                        'fiscal_year_id' => $siblingShared['fiscal_year_id'],
                        'fiscal_month_id' => $siblingShared['fiscal_month_id'],
                    ];

                    if ($row->isSubmitted()) {
                        unset($payload['is_training_held'], $payload['attendance']);
                    }

                    $row->update($payload);
                }

                continue;
            }

            $this->syncDraftAssignment($existing, [
                ...$siblingShared,
                'assessment_id' => null,
                'post_assessment_score' => null,
            ]);
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TdKpiAssignment>  $existing
     * @return array{0: int, 1: int}|RedirectResponse
     */
    private function resolveFiscalPeriod(
        ?EvaluationResultOverride $override,
        ?TrainingRequest $trainingRequest,
        $existing
    ): array|RedirectResponse {
        if ($override) {
            return [$override->fiscal_year_id, $override->fiscal_month_id];
        }

        $first = $existing->first();
        if ($first?->fiscal_year_id && $first?->fiscal_month_id) {
            return [$first->fiscal_year_id, $first->fiscal_month_id];
        }

        [, $currentFiscalYear, $currentFiscalMonth] = $this->currentFiscalPeriod();
        if (! $currentFiscalYear || ! $currentFiscalMonth) {
            return Redirect::back()->withErrors([
                'proposed_training_start_at' => 'No fiscal period covers today. Add the current fiscal year and month before assigning training.',
            ])->withInput();
        }

        return [$currentFiscalYear->id, $currentFiscalMonth->id];
    }

    /**
     * @return array{0: string, 1: ?FiscalYear, 2: ?FiscalMonth}
     */
    private function currentFiscalPeriod(): array
    {
        $today = now()->toDateString();
        $currentFiscalYear = FiscalYear::query()
            ->where('gregorian_start_date', '<=', $today)
            ->where('gregorian_end_date', '>=', $today)
            ->first();

        $currentFiscalMonth = $currentFiscalYear
            ? FiscalMonth::query()
                ->where('fiscal_year_id', $currentFiscalYear->id)
                ->where('gregorian_start_date', '<=', $today)
                ->where('gregorian_end_date', '>=', $today)
                ->first()
            : null;

        return [$today, $currentFiscalYear, $currentFiscalMonth];
    }

    private function applyTraineeFilters($query, Request $request): void
    {
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
    }

    /**
     * @return array<int, string>
     */
    private function overrideIndexRelations(): array
    {
        return [
            'employee:id,employee_code,first_name,last_name,branch_id,department_id',
            'employee.branch:id,name',
            'employee.department:id,name',
            'trainingType:id,name',
            'requestedModule:id,training_name',
            'fiscalYear:id,name',
            'fiscalMonth:id,name',
            'assignments.assignedTrainingContent:id,training_name',
            'assignments.assessment:id,assessment_name',
            'assignments.trainingType:id,name',
        ];
    }

    /**
     * @return array<int, string>
     */
    private function trainingRequestIndexRelations(): array
    {
        return [
            'employee:id,employee_code,first_name,last_name,branch_id,department_id',
            'employee.branch:id,name',
            'employee.department:id,name',
            'trainingType:id,name',
            'recurringModule:id,training_name',
            'requesterDepartment:id,name',
            'assignments.assignedTrainingContent:id,training_name',
            'assignments.assessment:id,assessment_name',
            'assignments.trainingType:id,name',
            'assignments.fiscalYear:id,name',
            'assignments.fiscalMonth:id,name',
        ];
    }

    private function mapOverrideRow(EvaluationResultOverride $override, ?TdKpiAssignment $assignment): array
    {
        $employee = $override->employee;
        $contentLocked = $override->assignments->contains(
            fn (TdKpiAssignment $a) => $a->assessment_id !== null
        );

        return $this->mapAssignmentDisplay([
            'source' => 'evaluation_result',
            'override_id' => $override->id,
            'training_request_id' => null,
            'row_key' => 'override-' . $override->id . '-' . ($assignment?->id ?? 'draft'),
            'assignment_id' => $assignment?->id,
            'employee_id' => $employee?->id,
            'employee_name' => trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? '')),
            'employee_code' => $employee?->employee_code,
            'branch' => $employee?->branch?->name,
            'department' => $employee?->department?->name,
            'training_type' => $override->trainingType?->name ?? $assignment?->trainingType?->name,
            'assigned_training_content' => $assignment?->assignedTrainingContent?->training_name,
            'proposed_training_start_at' => $this->formatDateTime($assignment?->proposed_training_start_at),
            'proposed_training_start_at_input' => $this->toDateTimeLocal($assignment?->proposed_training_start_at),
            'proposed_training_end_at' => $this->formatDateTime($assignment?->proposed_training_end_at),
            'proposed_training_end_at_input' => $this->toDateTimeLocal($assignment?->proposed_training_end_at),
            'actual_training_start_at' => $this->formatDateTime($assignment?->actual_training_start_at),
            'actual_training_start_at_input' => $this->toDateTimeLocal($assignment?->actual_training_start_at),
            'actual_training_end_at' => $this->formatDateTime($assignment?->actual_training_end_at),
            'actual_training_end_at_input' => $this->toDateTimeLocal($assignment?->actual_training_end_at),
            'actual_date_differs' => false,
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
            'attendance_locked' => $contentLocked,
            'note' => [
                'from' => 'Checklist inspection',
                'proposed_date' => $override->requested_training_date?->format('Y-m-d'),
                'module' => $override->requestedModule?->training_name,
                'extra_info' => $override->request_extra_info,
            ],
        ]);
    }

    private function mapRequestRow(TrainingRequest $trainingRequest, ?TdKpiAssignment $assignment): array
    {
        $employee = $trainingRequest->employee;
        $attendanceLocked = $trainingRequest->assignments->contains(
            fn (TdKpiAssignment $a) => $a->assessment_id !== null
        );
        $contentLocked = $attendanceLocked;
        $coordinatorActualStart = $assignment?->actual_training_start_at ?? $trainingRequest->coordinator_actual_start_at;
        $coordinatorActualEnd = $assignment?->actual_training_end_at ?? $trainingRequest->coordinator_actual_end_at;
        $actualDateDiffers = $trainingRequest->actual_date_verdict === TrainingRequest::VERDICT_INCORRECT
            && (
                $this->datetimesDiffer($trainingRequest->requester_actual_start_at, $coordinatorActualStart)
                || $this->datetimesDiffer($trainingRequest->requester_actual_end_at, $coordinatorActualEnd)
            );

        return $this->mapAssignmentDisplay([
            'source' => 'training_request',
            'override_id' => null,
            'training_request_id' => $trainingRequest->id,
            'row_key' => 'request-' . $trainingRequest->id . '-' . ($assignment?->id ?? 'draft'),
            'assignment_id' => $assignment?->id,
            'employee_id' => $employee?->id,
            'employee_name' => trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? '')),
            'employee_code' => $employee?->employee_code,
            'branch' => $employee?->branch?->name,
            'department' => $employee?->department?->name,
            'training_type' => $trainingRequest->trainingType?->name ?? $assignment?->trainingType?->name,
            'assigned_training_content' => $assignment?->assignedTrainingContent?->training_name,
            'proposed_training_start_at' => $this->formatDateTime($assignment?->proposed_training_start_at),
            'proposed_training_start_at_input' => $this->toDateTimeLocal($assignment?->proposed_training_start_at),
            'proposed_training_end_at' => $this->formatDateTime($assignment?->proposed_training_end_at),
            'proposed_training_end_at_input' => $this->toDateTimeLocal($assignment?->proposed_training_end_at),
            'actual_training_start_at' => $this->formatDateTime($coordinatorActualStart),
            'actual_training_start_at_input' => $this->toDateTimeLocal($assignment?->actual_training_start_at),
            'actual_training_end_at' => $this->formatDateTime($coordinatorActualEnd),
            'actual_training_end_at_input' => $this->toDateTimeLocal($assignment?->actual_training_end_at),
            'actual_date_differs' => $actualDateDiffers,
            'is_training_held' => (bool) ($assignment?->is_training_held ?? ($trainingRequest->status === TrainingRequest::STATUS_HELD)),
            'attendance' => (bool) ($assignment?->attendance ?? false),
            'assessment_name' => $assignment?->assessment?->assessment_name,
            'post_assessment_score' => $assignment?->post_assessment_score !== null
                ? (float) $assignment->post_assessment_score
                : null,
            'fiscal_year_name' => $assignment?->fiscalYear?->name,
            'fiscal_month_name' => $assignment?->fiscalMonth?->name,
            'training_type_id' => $assignment?->training_type_id ?? $trainingRequest->training_type_id,
            'assigned_training_content_id' => $assignment?->assigned_training_content_id,
            'assessment_id' => $assignment?->assessment_id,
            'content_locked' => $contentLocked,
            'attendance_locked' => $attendanceLocked,
            'note' => [
                'from' => $trainingRequest->requesterDepartment?->name ?: '—',
                'proposed_date' => $trainingRequest->requested_on?->format('Y-m-d'),
                'module' => $trainingRequest->recurringModule?->training_name,
                'extra_info' => $trainingRequest->extra_info,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function mapAssignmentDisplay(array $row): array
    {
        return $row;
    }

    private function proposedDateChangeOpen(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        return now()->lt(Carbon::parse($value)->subHours(24));
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TrainingRequest>  $trainingRequests
     * @return array<int, bool>
     */
    private function groupContentLockMap($trainingRequests): array
    {
        $groupIds = $trainingRequests->pluck('request_group_id')->filter()->unique()->values();
        if ($groupIds->isEmpty()) {
            return [];
        }

        $members = TrainingRequest::query()
            ->whereIn('request_group_id', $groupIds)
            ->get(['id', 'request_group_id']);

        $lockedRequestIds = TdKpiAssignment::query()
            ->whereIn('training_request_id', $members->pluck('id'))
            ->whereNotNull('assessment_id')
            ->pluck('training_request_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->all();

        $lockedGroups = $members
            ->filter(fn (TrainingRequest $member) => in_array((int) $member->id, $lockedRequestIds, true))
            ->pluck('request_group_id')
            ->unique()
            ->all();

        $map = [];
        foreach ($members as $member) {
            $map[(int) $member->id] = in_array($member->request_group_id, $lockedGroups, true);
        }

        return $map;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TrainingRequest>  $trainingRequests
     * @param  \Illuminate\Support\Collection<int, mixed>  $requestIds
     * @return array<int, int>
     */
    private function groupPendingProposedDateMap($trainingRequests, $requestIds): array
    {
        $groupIds = $trainingRequests->pluck('request_group_id')->filter()->unique()->values();
        $memberIds = $requestIds->map(fn ($id) => (int) $id)->all();

        if ($groupIds->isNotEmpty()) {
            $memberIds = TrainingRequest::query()
                ->whereIn('request_group_id', $groupIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->merge($memberIds)
                ->unique()
                ->values()
                ->all();
        }

        $pendingMemberIds = ProposedDatetimeChangeRequest::query()
            ->where('status', ProposedDatetimeChangeRequest::STATUS_PENDING)
            ->whereIn('training_request_id', $memberIds)
            ->pluck('training_request_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->all();

        if ($pendingMemberIds === []) {
            return [];
        }

        $pendingGroups = TrainingRequest::query()
            ->whereIn('id', $pendingMemberIds)
            ->pluck('request_group_id')
            ->filter()
            ->unique()
            ->all();

        $affectedIds = TrainingRequest::query()
            ->whereIn('request_group_id', $pendingGroups)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->merge($pendingMemberIds)
            ->unique()
            ->values()
            ->all();

        return $affectedIds;
    }

    private function formatDateTime(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $dt = Carbon::parse($value);
        $time = (int) $dt->format('i') === 0
            ? $dt->format('g A')
            : $dt->format('g:i A');

        return $dt->format('M j, Y') . ', ' . $time;
    }

    private function toDateTimeLocal(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return Carbon::parse($value)->format('Y-m-d\TH:i');
    }

    private function datetimesDiffer(mixed $left, mixed $right): bool
    {
        if ($left === null || $right === null) {
            return false;
        }

        return Carbon::parse($left)->format('Y-m-d H:i') !== Carbon::parse($right)->format('Y-m-d H:i');
    }
}
