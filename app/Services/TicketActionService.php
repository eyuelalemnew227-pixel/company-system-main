<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Models\Manager;
use App\Models\Ticket;
use App\Models\TicketActivityLog;
use App\Models\TicketAssignment;
use App\Models\TicketNotification;
use App\Models\TicketStatusHistory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TicketActionService
{
    public function __construct(
        private readonly TicketStatusService $statusService
    ) {
    }

    /**
     * Update status with validation, history, activity, timestamps, and notifications.
     */
    public function setStatus(Ticket $ticket, TicketStatus $to, User $actor, ?string $reason = null, array $meta = [], string $action = 'status_changed'): Ticket
    {
        $this->statusService->assertCanTransition($ticket, $to, $reason);

        return DB::transaction(function () use ($ticket, $to, $actor, $reason, $meta, $action) {
            $from = $ticket->status;

            // Update ticket core fields and milestone timestamps
            $ticket->status = $to;
            match ($to) {
                TicketStatus::NotStarted => $ticket->assigned_at = $ticket->assigned_at ?? now(),
                TicketStatus::InProgress => $ticket->in_progress_at = $ticket->in_progress_at ?? now(),
                TicketStatus::Done => $ticket->done_at = $ticket->done_at ?? now(),
                TicketStatus::Closed => $ticket->closed_at = now(),
                default => null,
            };

            if ($to === TicketStatus::Hold) {
                $ticket->hold_reason = $reason;
            }
            if ($to === TicketStatus::Escalated) {
                $ticket->escalation_reason = $reason;
            }
            if ($to === TicketStatus::Rejected) {
                $ticket->rejection_reason = $reason;
            }

            $ticket->save();

            $this->logStatusHistory($ticket, $actor, $from?->value, $to->value, $reason);
            $this->logActivity($ticket, $actor, $action, $from?->value, $to->value, $reason, $meta);
            $this->notifyStatusChange($ticket, $to, $actor, $reason, $action);

            return $ticket;
        });
    }

    /**
     * Assign or reassign a ticket to a staff user.
     */
    public function assign(Ticket $ticket, User $assignee, User $actor): Ticket
    {
        if ($ticket->status === TicketStatus::PendingApproval) {
            throw ValidationException::withMessages([
                'status' => 'Ticket must be approved before assignment.',
            ]);
        }

        return DB::transaction(function () use ($ticket, $assignee, $actor) {
            // Close previous assignments
            TicketAssignment::where('ticket_id', $ticket->id)
                ->where('is_current', true)
                ->update(['is_current' => false, 'unassigned_at' => Carbon::now()]);

            TicketAssignment::create([
                'ticket_id' => $ticket->id,
                'assigned_to' => $assignee->id,
                'assigned_by' => $actor->id,
                'assigned_at' => now(),
                'is_current' => true,
            ]);

            // Only move into NotStarted when currently Approved or Escalated
            if (in_array($ticket->status, [TicketStatus::Approved, TicketStatus::Escalated], true)) {
                $from = $ticket->status;
                $ticket->status = TicketStatus::NotStarted;
                $ticket->assigned_at = now();
                $ticket->save();
                $this->logStatusHistory($ticket, $actor, $from->value, TicketStatus::NotStarted->value, null);
            }
            $this->logActivity($ticket, $actor, 'assigned', $ticket->status->value, $ticket->status->value, null, [
                'assigned_to' => $assignee->only(['id', 'name', 'email']),
            ]);

            $this->notifyAssigned($ticket, $assignee, $actor);

            return $ticket;
        });
    }

    public function logStatusHistory(Ticket $ticket, User $actor, ?string $from, string $to, ?string $reason): void
    {
        TicketStatusHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $actor->id ?? null,
            'old_status' => $from,
            'new_status' => $to,
            'reason' => $reason,
        ]);
    }

    public function logActivity(Ticket $ticket, User $actor, string $action, ?string $oldStatus, ?string $newStatus, ?string $reason, array $meta = []): void
    {
        TicketActivityLog::create([
            'ticket_id' => $ticket->id,
            'user_id' => $actor->id ?? null,
            'action' => $action,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'reason' => $reason,
            'meta' => $meta ?: null,
        ]);
    }

    private function notifyStatusChange(Ticket $ticket, TicketStatus $to, User $actor, ?string $reason, string $action = 'status_changed'): void
    {
        $actorName = $actor->name;
        $title = "Ticket #{$ticket->id} status: " . str_replace('_', ' ', $to->value);
        $body = "{$actorName} updated the status to " . str_replace('_', ' ', $to->value) . ($reason ? ". Reason: {$reason}" : "");

        $recipients = [$ticket->user_id];

        if ($action === 'rejected') {
            if ($to === TicketStatus::Rejected) {
                // Initial approval rejection
                $title = "Ticket Rejected";
                $body = "Your ticket request #{$ticket->id} was rejected. Reason: {$reason}";
            } else {
                // Done -> In Progress rejection
                $title = "Ticket Completion Rejected";
                $body = "{$actorName} rejected the completion of ticket #{$ticket->id}. Ticket reopened. Reason: {$reason}";
                // Notify assignees and managers
                $recipients = array_merge($recipients, $this->currentAssigneeUserIds($ticket), $this->departmentManagerUserIds($ticket->department_id));
            }
        } elseif ($action === 'approved') {
            $title = "Ticket Approved";
            $body = "Your ticket #{$ticket->id} has been accepted and is now in the queue.";
            $recipients = array_merge($recipients, $this->departmentManagerUserIds($ticket->department_id));
        } elseif ($action === 'closed') {
            $title = "Ticket Closed";
            $body = "Ticket #{$ticket->id} has been closed correctly.";
        } else {
            // For all other status changes (InProgress, Hold, etc.), notify managers and requestor
            $recipients = array_merge($recipients, $this->departmentManagerUserIds($ticket->department_id));
        }

        $this->notifyUsers($ticket, array_unique($recipients), 'ticket.status', $title, $body);
    }

    public function notifyCreated(Ticket $ticket): void
    {
        $managerIds = $this->departmentManagerUserIds($ticket->department_id);
        $this->notifyUsers(
            $ticket,
            $managerIds,
            'ticket.created',
            "New Ticket: #{$ticket->id}",
            "A new request \"{$ticket->title}\" needs your approval."
        );
    }

    public function notifyAssigned(Ticket $ticket, User $assignee, User $actor): void
    {
        $this->notifyUsers(
            $ticket,
            [$assignee->id],
            'ticket.assigned',
            "New Case Assigned: #{$ticket->id}",
            "{$actor->name} assigned you to \"{$ticket->title}\""
        );

        // Also notify requestor
        $this->notifyUsers(
            $ticket,
            [$ticket->user_id],
            'ticket.status',
            "Staff Assigned",
            "Staff {$assignee->name} has been assigned to your ticket."
        );
    }

    public function notifyUsers(Ticket $ticket, array $userIds, string $type, string $title, ?string $body = null): void
    {
        $rows = collect($userIds)->filter()->unique()->map(fn($id) => [
            'user_id' => $id,
            'ticket_id' => $ticket->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'created_at' => now(),
            'updated_at' => now(),
            'read_at' => null,
        ])->all();

        if (!empty($rows)) {
            TicketNotification::insert($rows);
        }
    }

    public function departmentManagerUserIds(int $departmentId): array
    {
        // Path specified by USER:
        // 1. take the department id 
        // 2. managers table-> employee_id 
        // 3. Employee table ->employee_id -> department_id 
        // 4. users table employee_id -> id

        // In terms of SQL joins:
        // SELECT users.id FROM users
        // JOIN employees ON users.employee_id = employees.id
        // JOIN managers ON employees.id = managers.employee_id
        // WHERE employees.department_id = $departmentId

        return DB::table('users')
            ->join('employees', 'users.employee_id', '=', 'employees.id')
            ->join('managers', 'employees.id', '=', 'managers.employee_id')
            ->where('employees.department_id', $departmentId)
            ->pluck('users.id')
            ->all();
    }

    private function currentAssigneeUserIds(Ticket $ticket): array
    {
        return $ticket->assignments()
            ->where('is_current', true)
            ->pluck('assigned_to')
            ->all();
    }
}
