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

            // Trigger Telegram Notifications according to workflow steps (background dispatch)
            dispatch(function () use ($ticket, $actor, $from, $to, $reason, $action) {
                try {
                    $telegramNotif = app(TelegramTicketNotificationService::class);
                    if ($action === 'rejected' || $to === TicketStatus::Rejected || ($to === TicketStatus::InProgress && $from === TicketStatus::Done)) {
                        $isActorRequestor = (int) $actor->id === (int) $ticket->user_id
                            || ($ticket->requestor_branch_id && $actor->employee?->branch_id && (int) $ticket->requestor_branch_id === (int) $actor->employee->branch_id);

                        if ($isActorRequestor) {
                            $telegramNotif->notifyCompletionRejectedByBranch($ticket, $actor, $reason);
                        } else {
                            $telegramNotif->notifyTicketRejectedByManager($ticket, $actor, $reason);
                        }
                    } elseif ($to === TicketStatus::Approved) {
                        // Manager approves ticket -> Do NOT send notification per workflow rule
                    } elseif ($to === TicketStatus::Done) {
                        if ($from === TicketStatus::Escalated) {
                            // Manager Fixes Escalated Case to Done
                            $telegramNotif->notifyEscalationResolvedByManager($ticket, $actor);
                        } else {
                            // Technical Marks Status as Done
                            $telegramNotif->notifyStatusDoneByTechnical($ticket, $actor);
                        }
                    } elseif ($to === TicketStatus::Escalated) {
                        $telegramNotif->notifyStatusEscalated($ticket, $actor, $reason);
                    } elseif ($to === TicketStatus::Hold) {
                        $telegramNotif->notifyStatusHold($ticket, $actor, $reason);
                    } elseif ($to === TicketStatus::Closed) {
                        $telegramNotif->notifyTicketClosed($ticket, $actor);
                    } elseif ($to === TicketStatus::InProgress) {
                        $telegramNotif->notifyStatusInProgress($ticket, $actor);
                    } elseif ($to === TicketStatus::TicketApproved) {
                        // Branch approved ticket -> Do NOT send notification on status change.
                        // Notification will be sent when Branch submits the Feedback & Rating modal.
                    } else {
                        $telegramNotif->notifyGenericStatusChange($ticket, $to, $actor, $reason);
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Telegram notification error in setStatus: " . $e->getMessage());
                }
            })->afterResponse();

            return $ticket;
        });
    }

    /**
     * Assign or reassign a ticket to a staff user.
     */
    public function assign(Ticket $ticket, User $assignee, User $actor): Ticket
    {
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

            // Move into NotStarted when currently PendingApproval, Approved, or Escalated
            if (in_array($ticket->status, [TicketStatus::PendingApproval, TicketStatus::Approved, TicketStatus::Escalated], true)) {
                $from = $ticket->status;
                $ticket->status = TicketStatus::NotStarted;
                $ticket->assigned_at = now();
                $ticket->save();
                $this->logStatusHistory($ticket, $actor, $from->value, TicketStatus::NotStarted->value, 'Assigned to staff');
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
        if ($action === 'approved' || $to === TicketStatus::Approved) {
            // Manager approved ticket -> Do NOT send notification per workflow requirement
            return;
        }

        $actorName = $actor->name;
        $title = "Ticket #{$ticket->id} status: " . str_replace('_', ' ', $to->value);
        $body = "{$actorName} updated the status to " . str_replace('_', ' ', $to->value) . ($reason ? ". Reason: {$reason}" : "");

        if ($action === 'rejected' || $to === TicketStatus::Rejected) {
            if ($to === TicketStatus::Rejected) {
                // Initial approval rejection by Manager -> notify requestor / branch
                $title = "Ticket Rejected";
                $body = "Your ticket request #{$ticket->id} was rejected by Department Manager. Reason: {$reason}";
                $recipients = [$ticket->user_id];
            } else {
                // Done -> In Progress completion rejection by Branch -> notify assigned technician & department managers
                $title = "Ticket Completion Rejected";
                $body = "{$actorName} (Branch) rejected the completion of ticket #{$ticket->id}. Reason: {$reason}";
                $recipients = array_merge($this->currentAssigneeUserIds($ticket), $this->departmentManagerUserIds($ticket->department_id));
            }
        } elseif ($action === 'closed' || $to === TicketStatus::Closed) {
            // Manager closed ticket -> notify requestor and assigned technician
            $title = "Ticket Closed";
            $body = "Ticket #{$ticket->id} has been closed by manager {$actorName}.";
            $recipients = array_merge([$ticket->user_id], $this->currentAssigneeUserIds($ticket));
        } elseif ($action === 'ticket_approved' || $to === TicketStatus::TicketApproved) {
            // Branch approved ticket completion -> notify department manager only
            $title = "Ticket Completion Approved";
            $body = "Branch user {$actorName} approved ticket #{$ticket->id}.";
            $recipients = $this->departmentManagerUserIds($ticket->department_id);
        } elseif ($to === TicketStatus::Done) {
            // Technical marked status to Done -> notify requestor and department managers
            $title = "Ticket Marked Done";
            $body = "Technical {$actorName} marked ticket #{$ticket->id} as Done.";
            $recipients = array_merge([$ticket->user_id], $this->departmentManagerUserIds($ticket->department_id));
        } elseif (in_array($to, [TicketStatus::Hold, TicketStatus::Escalated, TicketStatus::InProgress], true)) {
            // Hold / Escalated / InProgress -> notify requestor and department managers
            $recipients = array_merge([$ticket->user_id], $this->departmentManagerUserIds($ticket->department_id));
        } else {
            $recipients = array_merge([$ticket->user_id], $this->departmentManagerUserIds($ticket->department_id));
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

        // Step 1: Telegram Notification to Department Manager (Background dispatch)
        dispatch(function () use ($ticket) {
            try {
                app(TelegramTicketNotificationService::class)->notifyRequestSubmitted($ticket);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Telegram notifyCreated error: " . $e->getMessage());
            }
        })->afterResponse();
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

        // Step 2: Telegram Notification to Assigned Technical & Request Branch (Background dispatch)
        dispatch(function () use ($ticket, $assignee, $actor) {
            try {
                app(TelegramTicketNotificationService::class)->notifyTicketAssigned($ticket, $assignee, $actor);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Telegram notifyAssigned error: " . $e->getMessage());
            }
        })->afterResponse();
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
        // 1. Direct Managers from the `managers` table for this department
        $idsFromManagers = DB::table('users')
            ->join('employees', 'users.employee_id', '=', 'employees.id')
            ->join('managers', 'employees.id', '=', 'managers.employee_id')
            ->where('employees.department_id', $departmentId)
            ->pluck('users.id')
            ->map(fn($id) => (int) $id)
            ->all();

        // 2. Department Manager / Head roles for this specific department
        $idsFromDeptRoles = DB::table('users')
            ->join('employees', 'users.employee_id', '=', 'employees.id')
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('employees.department_id', $departmentId)
            ->whereIn('roles.name', ['department head', 'Department Manager', 'Ticket Department Manager'])
            ->pluck('users.id')
            ->map(fn($id) => (int) $id)
            ->all();

        $managerIds = array_values(array_unique(array_merge($idsFromManagers, $idsFromDeptRoles)));

        // 3. Fallback: If no manager found for this specific department, query global Ticket Department Manager role
        if (empty($managerIds)) {
            $managerIds = DB::table('users')
                ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                ->whereIn('roles.name', ['Ticket Department Manager'])
                ->pluck('users.id')
                ->map(fn($id) => (int) $id)
                ->all();
        }

        return array_values(array_unique($managerIds));
    }

    private function currentAssigneeUserIds(Ticket $ticket): array
    {
        return $ticket->assignments()
            ->where('is_current', true)
            ->pluck('assigned_to')
            ->all();
    }
}
