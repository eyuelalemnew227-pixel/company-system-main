<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Models\Ticket;
use Illuminate\Validation\ValidationException;

class TicketStatusService
{
    /**
     * Map of allowed transitions.
     */
    private array $matrix = [
        TicketStatus::PendingApproval->value => [
            TicketStatus::Approved->value,
            TicketStatus::NotStarted->value,
            TicketStatus::InProgress->value,
            TicketStatus::Hold->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
            TicketStatus::Rejected->value,
            TicketStatus::Closed->value,
        ],
        TicketStatus::Approved->value => [
            TicketStatus::NotStarted->value,
            TicketStatus::InProgress->value,
            TicketStatus::Hold->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
            TicketStatus::Rejected->value,
            TicketStatus::Closed->value,
        ],
        TicketStatus::NotStarted->value => [
            TicketStatus::InProgress->value,
            TicketStatus::Hold->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
            TicketStatus::Rejected->value,
            TicketStatus::Closed->value,
        ],
        TicketStatus::InProgress->value => [
            TicketStatus::Hold->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
            TicketStatus::Rejected->value,
            TicketStatus::Closed->value,
        ],
        TicketStatus::Hold->value => [
            TicketStatus::InProgress->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
            TicketStatus::Rejected->value,
            TicketStatus::Closed->value,
        ],
        TicketStatus::Escalated->value => [
            TicketStatus::NotStarted->value,
            TicketStatus::InProgress->value,
            TicketStatus::Hold->value,
            TicketStatus::Done->value,
            TicketStatus::Rejected->value,
            TicketStatus::Closed->value,
        ],
        TicketStatus::Done->value => [
            TicketStatus::TicketApproved->value,
            TicketStatus::Closed->value,
            TicketStatus::InProgress->value,
            TicketStatus::Rejected->value,
        ],
        TicketStatus::TicketApproved->value => [
            TicketStatus::Closed->value,
        ],
    ];

    private array $reasonRequired = [
        TicketStatus::Rejected->value,
        TicketStatus::Hold->value,
        TicketStatus::Escalated->value,
    ];

    /**
     * Ensure a transition is permitted; throws ValidationException when invalid.
     */
    public function assertCanTransition(Ticket $ticket, TicketStatus $to, ?string $reason = null): void
    {
        $from = $ticket->status->value;

        if (!isset($this->matrix[$from]) || !in_array($to->value, $this->matrix[$from], true)) {
            throw ValidationException::withMessages([
                'status' => "Transition from {$from} to {$to->value} is not allowed.",
            ]);
        }

        if (in_array($to->value, $this->reasonRequired, true) && empty(trim($reason ?? ''))) {
            throw ValidationException::withMessages([
                'reason' => "A reason is required when setting status to {$to->value}.",
            ]);
        }
    }

    /**
     * Get list of statuses allowed from the current state.
     */
    public function getAllowedTransitions(TicketStatus $currentStatus): array
    {
        return $this->matrix[$currentStatus->value] ?? [];
    }

    /**
     * Get list of statuses available to a specific user for a ticket based on workflow state and granted permissions.
     */
    public function getAvailableStatusesForUser(\App\Models\User $user, Ticket $ticket): array
    {
        $managerUserIds = app(TicketActionService::class)->departmentManagerUserIds($ticket->department_id);

        $isManager = in_array((int) $user->id, $managerUserIds)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
            || $user->can('ticket.assign')
            || $user->can('ticket.approve')
            || $user->can('ticket.close');

        $statusVal = is_object($ticket->status) ? $ticket->status->value : (string) $ticket->status;

        if (in_array($statusVal, ['closed', 'rejected'], true)) {
            return [];
        }

        $isRequestor = (int) $ticket->user_id === (int) $user->id
            || ($ticket->requestor_branch_id && $user->employee?->branch_id && (int) $ticket->requestor_branch_id === (int) $user->employee->branch_id);

        if ($isRequestor && !$isManager) {
            if ($statusVal === 'done') {
                return [TicketStatus::TicketApproved->value, TicketStatus::InProgress->value];
            }
            return [];
        }

        $isAssignee = $ticket->assignments()->where('is_current', true)->where('assigned_to', $user->id)->exists();
        $isStaff = $isAssignee
            || $user->can('ticket.status.update')
            || $user->can('ticket.done')
            || $user->can('ticket.escalate')
            || $user->can('ticket.view.department');

        if ($isStaff && !$isManager) {
            switch ($statusVal) {
                case 'approved':
                case 'not_started':
                    return [TicketStatus::InProgress->value, TicketStatus::Hold->value];

                case 'in_progress':
                    return [TicketStatus::Hold->value, TicketStatus::Escalated->value, TicketStatus::Done->value];

                case 'hold':
                    return [TicketStatus::InProgress->value, TicketStatus::Escalated->value, TicketStatus::Done->value];

                case 'escalated':
                    return [TicketStatus::InProgress->value, TicketStatus::Done->value];

                case 'done':
                    return [];

                default:
                    return [];
            }
        }

        if ($isManager) {
            switch ($statusVal) {
                case 'pending_approval':
                    return [TicketStatus::Approved->value, TicketStatus::Rejected->value];

                case 'approved':
                case 'not_started':
                    return [TicketStatus::InProgress->value, TicketStatus::Hold->value, TicketStatus::Escalated->value];

                case 'in_progress':
                    return [TicketStatus::Hold->value, TicketStatus::Escalated->value, TicketStatus::Done->value, TicketStatus::Closed->value, TicketStatus::Rejected->value];

                case 'hold':
                    return [TicketStatus::InProgress->value, TicketStatus::Escalated->value, TicketStatus::Done->value, TicketStatus::Closed->value, TicketStatus::Rejected->value];

                case 'escalated':
                    return [TicketStatus::InProgress->value, TicketStatus::Done->value, TicketStatus::Hold->value, TicketStatus::Closed->value, TicketStatus::Rejected->value];

                case 'done':
                    return [TicketStatus::Closed->value, TicketStatus::InProgress->value, TicketStatus::Rejected->value];

                case 'ticket_approved':
                    return [TicketStatus::Closed->value];

                default:
                    return [];
            }
        }

        return [];
    }
}
