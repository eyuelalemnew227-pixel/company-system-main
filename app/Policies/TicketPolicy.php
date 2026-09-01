<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function view(User $user, Ticket $ticket): bool
    {
        // 1. Super Admin or users with global view permission
        if ($user->can('ticket.view.all') || $user->hasRole('Super Admin') || $user->hasRole('Ticket Super Admin')) {
            return true;
        }

        // 2. Department Managers can view all tickets in their department
        if ($user->isManagerOfDepartment($ticket->department_id)) {
            return true;
        }

        // 3. Department view permission for users in the target department
        $userDeptId = $user->employee?->department_id ?? $user->department_id;
        if ($user->can('ticket.view.department') && $userDeptId && (int) $userDeptId === (int) $ticket->department_id) {
            return true;
        }

        // 4. Requestor can view their own tickets or branch tickets
        if ((int) $ticket->user_id === (int) $user->id) {
            return true;
        }

        $userBranchId = $user->employee?->branch_id ?? $user->branch_id;
        if ($ticket->requestor_branch_id && $userBranchId && (int) $ticket->requestor_branch_id === (int) $userBranchId) {
            return true;
        }

        // 5. Staff can view if they are currently or previously assigned to the ticket
        return $ticket->assignments()->where('assigned_to', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->can('ticket.create')
            || $user->can('ticket.view.own')
            || $user->can('ticket.view.department')
            || $user->can('ticket.view.all');
    }

    public function updateStatus(User $user, Ticket $ticket): bool
    {
        if (in_array($ticket->status?->value, ['closed', 'rejected'], true)) {
            return false;
        }

        // 1. Current assignee can update status
        if ($ticket->assignments()->where('is_current', true)->where('assigned_to', $user->id)->exists()) {
            return true;
        }

        // 2. Granted status update/approval/close/done permissions or Department Managers
        if (
            $user->can('ticket.status.update')
            || $user->can('ticket.approve')
            || $user->can('ticket.close')
            || $user->can('ticket.done')
            || $user->can('ticket.escalate')
            || $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
        ) {
            return true;
        }

        // 3. Requestor can update status if it's 'done' (to approve/reject completion)
        return (int) $ticket->user_id === (int) $user->id && $ticket->status?->value === 'done';
    }

    public function assign(User $user, Ticket $ticket): bool
    {
        return $user->can('ticket.assign')
            || $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin');
    }

    public function approveCompletion(User $user, Ticket $ticket): bool
    {
        if (
            $user->can('ticket.approve')
            || $user->can('ticket.close')
            || $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
        ) {
            return true;
        }

        return (int) $ticket->user_id === (int) $user->id && in_array($ticket->status?->value, ['done', 'ticket_approved'], true);
    }

    public function rejectCompletion(User $user, Ticket $ticket): bool
    {
        if (
            $user->can('ticket.reject')
            || $user->can('ticket.status.update')
            || $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
        ) {
            return true;
        }

        return (int) $ticket->user_id === (int) $user->id && $ticket->status?->value === 'done';
    }

    private function isDepartmentManager(User $user, int $departmentId): bool
    {
        return $user->isManagerOfDepartment($departmentId);
    }

    public function updateAsset(User $user, Ticket $ticket): bool
    {
        if (in_array($ticket->status?->value, ['closed', 'rejected'], true)) {
            return false;
        }

        if (
            $user->can('ticket.status.update')
            || $user->can('ticket.assign')
            || $user->can('ticket.view.all')
            || $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
        ) {
            return true;
        }

        if (in_array($ticket->status?->value, ['done', 'ticket_approved'], true)) {
            return false;
        }

        return $ticket->assignments()->where('is_current', true)->where('assigned_to', $user->id)->exists();
    }

    public function rate(User $user, Ticket $ticket): bool
    {
        if (in_array($ticket->status?->value, ['done', 'ticket_approved', 'closed'], true)) {
            return (int) $ticket->user_id === (int) $user->id || $user->can('ticket.rate');
        }
        return false;
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->can('ticket.delete') || $user->hasRole('Super Admin') || $user->hasRole('Ticket Super Admin');
    }

    public function updateDeadline(User $user, Ticket $ticket): bool
    {
        return $user->can('ticket.assign')
            || $user->can('ticket.view.all')
            || $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin');
    }

    public function updatePriority(User $user, Ticket $ticket): bool
    {
        return $user->can('ticket.assign')
            || $user->can('ticket.view.all')
            || $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin');
    }
}
