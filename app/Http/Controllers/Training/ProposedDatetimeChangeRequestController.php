<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\EvaluationResultOverride;
use App\Models\Training\ProposedDatetimeChangeRequest;
use App\Models\Training\TdKpiAssignment;
use App\Models\Training\TrainingRequest;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProposedDatetimeChangeRequestController extends Controller
{
    public function index(): Response
    {
        $requests = ProposedDatetimeChangeRequest::query()
            ->with('requester:id,name')
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ProposedDatetimeChangeRequest $change) => [
                'id' => $change->id,
                'employee_name' => $change->employee_name,
                'branch_name' => $change->branch_name,
                'department_name' => $change->department_name,
                'training_type_name' => $change->training_type_name,
                'assigned_training_content' => $change->assigned_training_content,
                'current_proposed_start_at' => $this->formatDateTime($change->current_proposed_start_at),
                'current_proposed_end_at' => $this->formatDateTime($change->current_proposed_end_at),
                'requested_proposed_start_at' => $this->formatDateTime($change->requested_proposed_start_at),
                'requested_proposed_end_at' => $this->formatDateTime($change->requested_proposed_end_at),
                'reason' => $change->reason,
                'status' => $change->status,
                'status_label' => match ($change->status) {
                    ProposedDatetimeChangeRequest::STATUS_ACCEPTED => 'Accepted',
                    ProposedDatetimeChangeRequest::STATUS_REJECTED => 'Rejected',
                    default => 'Pending',
                },
                'requested_by' => $change->requester?->name,
                'requested_at' => $this->formatDateTime($change->created_at),
            ]);

        return Inertia::render('training/TdKpi/ProposedDateRequests/Index', [
            'requests' => $requests,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if ($request->input('evaluation_result_override_id') === '') {
            $request->merge(['evaluation_result_override_id' => null]);
        }
        if ($request->input('training_request_id') === '') {
            $request->merge(['training_request_id' => null]);
        }
        if ($request->input('requested_proposed_start_at') === '') {
            $request->merge(['requested_proposed_start_at' => null]);
        }
        if ($request->input('requested_proposed_end_at') === '') {
            $request->merge(['requested_proposed_end_at' => null]);
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
            'requested_proposed_start_at' => ['required', 'date'],
            'requested_proposed_end_at' => ['required', 'date', 'after_or_equal:requested_proposed_start_at'],
            'reason' => ['required', 'string', 'max:2000'],
        ], [], [
            'requested_proposed_start_at' => 'new training start time',
            'requested_proposed_end_at' => 'new training end time',
            'reason' => 'reason',
        ]);

        $override = null;
        $trainingRequest = null;
        if (! empty($validated['evaluation_result_override_id'])) {
            $override = EvaluationResultOverride::query()
                ->with([
                    'employee:id,first_name,last_name,branch_id,department_id',
                    'employee.branch:id,name',
                    'employee.department:id,name',
                    'trainingType:id,name',
                ])
                ->findOrFail($validated['evaluation_result_override_id']);
        } else {
            $trainingRequest = TrainingRequest::query()
                ->with([
                    'employee:id,first_name,last_name,branch_id,department_id',
                    'employee.branch:id,name',
                    'employee.department:id,name',
                    'trainingType:id,name',
                ])
                ->findOrFail($validated['training_request_id']);
        }

        $groupRequestIds = $trainingRequest?->groupMemberIds() ?? [];

        $assignments = TdKpiAssignment::query()
            ->with('assignedTrainingContent:id,training_name')
            ->when(
                $override,
                fn ($q) => $q->where('evaluation_result_override_id', $override->id),
                fn ($q) => $q->whereIn('training_request_id', $groupRequestIds)
            )
            ->orderBy('id')
            ->get();

        $current = $assignments->first(fn (TdKpiAssignment $assignment) => $assignment->proposed_training_start_at !== null);
        if (! $current?->proposed_training_start_at || ! $current?->proposed_training_end_at) {
            return Redirect::back()->withErrors([
                'requested_proposed_start_at' => 'Save training start and end times before requesting a change.',
            ])->withInput();
        }

        if ($assignments->contains(fn (TdKpiAssignment $assignment) => (bool) $assignment->is_training_held)) {
            return Redirect::back()->withErrors([
                'requested_proposed_start_at' => 'Training times cannot be changed after training is held.',
            ])->withInput();
        }

        if (now()->greaterThanOrEqualTo($current->proposed_training_start_at->copy()->subHours(24))) {
            return Redirect::back()->withErrors([
                'requested_proposed_start_at' => 'A change can only be requested more than 24 hours before the training start time.',
            ])->withInput();
        }

        $requestedStart = Carbon::parse($validated['requested_proposed_start_at']);
        $requestedEnd = Carbon::parse($validated['requested_proposed_end_at']);
        $sameAsCurrent = $requestedStart->format('Y-m-d H:i') === $current->proposed_training_start_at->format('Y-m-d H:i')
            && $requestedEnd->format('Y-m-d H:i') === $current->proposed_training_end_at->format('Y-m-d H:i');
        if ($sameAsCurrent) {
            return Redirect::back()->withErrors([
                'requested_proposed_start_at' => 'Choose different training start and end times.',
            ])->withInput();
        }

        $pendingExists = ProposedDatetimeChangeRequest::query()
            ->where('status', ProposedDatetimeChangeRequest::STATUS_PENDING)
            ->when(
                $override,
                fn ($q) => $q->where('evaluation_result_override_id', $override->id),
                fn ($q) => $q->whereIn('training_request_id', $groupRequestIds)
            )
            ->exists();

        if ($pendingExists) {
            return Redirect::back()->withErrors([
                'requested_proposed_start_at' => 'A change request for this assignment is already waiting for review.',
            ])->withInput();
        }

        $employee = $override?->employee ?? $trainingRequest?->employee;

        ProposedDatetimeChangeRequest::create([
            'evaluation_result_override_id' => $override?->id,
            'training_request_id' => $trainingRequest?->id,
            'employee_name' => trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? '')) ?: '—',
            'branch_name' => $employee?->branch?->name,
            'department_name' => $employee?->department?->name,
            'training_type_name' => $override?->trainingType?->name ?? $trainingRequest?->trainingType?->name,
            'assigned_training_content' => $current->assignedTrainingContent?->training_name,
            'current_proposed_start_at' => $current->proposed_training_start_at,
            'current_proposed_end_at' => $current->proposed_training_end_at,
            'requested_proposed_start_at' => $requestedStart,
            'requested_proposed_end_at' => $requestedEnd,
            'reason' => $validated['reason'],
            'status' => ProposedDatetimeChangeRequest::STATUS_PENDING,
            'requested_by' => $request->user()?->id,
        ]);

        return Redirect::back()->with('message', 'Proposed training time change request submitted.');
    }

    public function accept(ProposedDatetimeChangeRequest $proposedDatetimeChangeRequest): RedirectResponse
    {
        if ($proposedDatetimeChangeRequest->status !== ProposedDatetimeChangeRequest::STATUS_PENDING) {
            return Redirect::back()->with('error', 'This request has already been decided.');
        }

        $updated = false;
        DB::transaction(function () use ($proposedDatetimeChangeRequest, &$updated) {
            $change = ProposedDatetimeChangeRequest::query()
                ->lockForUpdate()
                ->findOrFail($proposedDatetimeChangeRequest->id);

            if ($change->status !== ProposedDatetimeChangeRequest::STATUS_PENDING) {
                return;
            }

            $trainingRequestIds = [];
            if ($change->training_request_id) {
                $trainingRequest = TrainingRequest::query()->find($change->training_request_id);
                $trainingRequestIds = $trainingRequest?->groupMemberIds() ?? [(int) $change->training_request_id];
            }

            TdKpiAssignment::query()
                ->when(
                    $change->evaluation_result_override_id,
                    fn ($q) => $q->where('evaluation_result_override_id', $change->evaluation_result_override_id),
                    fn ($q) => $q->whereIn('training_request_id', $trainingRequestIds)
                )
                ->update([
                    'proposed_training_start_at' => $change->requested_proposed_start_at,
                    'proposed_training_end_at' => $change->requested_proposed_end_at,
                ]);

            if ($trainingRequestIds !== []) {
                TrainingRequest::query()
                    ->whereIn('id', $trainingRequestIds)
                    ->update([
                        'current_proposed_start_at' => $change->requested_proposed_start_at,
                        'current_proposed_end_at' => $change->requested_proposed_end_at,
                    ]);
            }

            $change->update([
                'status' => ProposedDatetimeChangeRequest::STATUS_ACCEPTED,
                'decided_by' => auth()->id(),
                'decided_at' => now(),
            ]);
            $updated = true;
        });

        if (! $updated) {
            return Redirect::back()->with('error', 'This request has already been decided.');
        }

        return Redirect::back()->with('message', 'Proposed training times updated.');
    }

    public function reject(ProposedDatetimeChangeRequest $proposedDatetimeChangeRequest): RedirectResponse
    {
        if ($proposedDatetimeChangeRequest->status !== ProposedDatetimeChangeRequest::STATUS_PENDING) {
            return Redirect::back()->with('error', 'This request has already been decided.');
        }

        $updated = false;
        DB::transaction(function () use ($proposedDatetimeChangeRequest, &$updated) {
            $change = ProposedDatetimeChangeRequest::query()
                ->lockForUpdate()
                ->findOrFail($proposedDatetimeChangeRequest->id);

            if ($change->status !== ProposedDatetimeChangeRequest::STATUS_PENDING) {
                return;
            }

            $change->update([
                'status' => ProposedDatetimeChangeRequest::STATUS_REJECTED,
                'decided_by' => auth()->id(),
                'decided_at' => now(),
            ]);
            $updated = true;
        });

        if (! $updated) {
            return Redirect::back()->with('error', 'This request has already been decided.');
        }

        return Redirect::back()->with('message', 'Proposed training time change rejected.');
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
}
