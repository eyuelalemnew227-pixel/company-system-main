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
            TicketStatus::Rejected->value,
        ],
        TicketStatus::Approved->value => [
            TicketStatus::NotStarted->value,
            TicketStatus::Rejected->value,
        ],
        TicketStatus::NotStarted->value => [
            TicketStatus::InProgress->value,
            TicketStatus::Hold->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
        ],
        TicketStatus::InProgress->value => [
            TicketStatus::Hold->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
        ],
        TicketStatus::Hold->value => [
            TicketStatus::InProgress->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
        ],
        TicketStatus::Escalated->value => [
            TicketStatus::NotStarted->value,
            TicketStatus::InProgress->value,
            TicketStatus::Hold->value,
            TicketStatus::Done->value,
        ],
        TicketStatus::Done->value => [
            TicketStatus::Closed->value,
            TicketStatus::InProgress->value, // when requester rejects the completion
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
}
