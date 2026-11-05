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
        $statusVal = is_object($ticket->status) ? $ticket->status->value : (string) $ticket->status;

        if (in_array($statusVal, ['closed', 'rejected'], true)) {
            return [];
        }

        $allowedTransitions = $this->getAllowedTransitions($ticket->status);

        // Super Admin has unrestricted managerial access to all valid transitions for the current state
        if ($user->hasRole('Super Admin')) {
            return array_values($allowedTransitions);
        }

        $isRequestor = (int) $ticket->user_id === (int) $user->id
            || ($ticket->requestor_branch_id && $user->employee?->branch_id && (int) $ticket->requestor_branch_id === (int) $user->employee->branch_id);

        $available = [];

        // ticket.close: can transition to Closed
        if ($user->can('ticket.close') && in_array(TicketStatus::Closed->value, $allowedTransitions, true)) {
            $available[] = TicketStatus::Closed->value;
        }

        // ticket.done: can mark ticket as Done
        if ($user->can('ticket.done') && in_array(TicketStatus::Done->value, $allowedTransitions, true)) {
            $available[] = TicketStatus::Done->value;
        }

        // ticket.pending: can place ticket on Hold
        if ($user->can('ticket.pending') && in_array(TicketStatus::Hold->value, $allowedTransitions, true)) {
            $available[] = TicketStatus::Hold->value;
        }

        // ticket.escalate: can escalate ticket
        if ($user->can('ticket.escalate') && in_array(TicketStatus::Escalated->value, $allowedTransitions, true)) {
            $available[] = TicketStatus::Escalated->value;
        }

        // ticket.approve: can approve pending tickets or mark ticket_approved
        if ($user->can('ticket.approve')) {
            if (in_array(TicketStatus::Approved->value, $allowedTransitions, true)) {
                $available[] = TicketStatus::Approved->value;
            }
            if (in_array(TicketStatus::TicketApproved->value, $allowedTransitions, true)) {
                $available[] = TicketStatus::TicketApproved->value;
            }
        }

        // ticket.reject: can reject pending tickets or reject completion
        if ($user->can('ticket.reject') && in_array(TicketStatus::Rejected->value, $allowedTransitions, true)) {
            $available[] = TicketStatus::Rejected->value;
        }

        // ticket.status.update: can move to in_progress or not_started
        if ($user->can('ticket.status.update')) {
            if (in_array(TicketStatus::InProgress->value, $allowedTransitions, true)) {
                $available[] = TicketStatus::InProgress->value;
            }
            if (in_array(TicketStatus::NotStarted->value, $allowedTransitions, true)) {
                $available[] = TicketStatus::NotStarted->value;
            }
        }

        // Requestor completion actions on done tickets
        if ($isRequestor && $statusVal === 'done') {
            if (in_array(TicketStatus::TicketApproved->value, $allowedTransitions, true)) {
                $available[] = TicketStatus::TicketApproved->value;
            }
            if (in_array(TicketStatus::InProgress->value, $allowedTransitions, true)) {
                $available[] = TicketStatus::InProgress->value;
            }
        }

        return array_values(array_unique($available));
    }
}
