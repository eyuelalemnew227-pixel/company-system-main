<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function view(User $user, Ticket $ticket): bool
    {
        // 1. Super Admin or users with global view permission
        if ($user->can('ticket.view.all')) {
            return true;
        }

        // 2. Department Managers can view all tickets in their department
        if ($user->isManagerOfDepartment($ticket->department_id)) {
            return true;
        }

        // 3. Requestor can view their own tickets
        if ((int) $ticket->user_id === (int) $user->id) {
            return true;
        }

        // 4. Staff can view if they are currently assigned to the ticket
        return $ticket->assignments()->where('assigned_to', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->can('ticket.create');
    }

    public function updateStatus(User $user, Ticket $ticket): bool
    {
        // 1. Current assignee can update status
        // Using (string) comparison for safety if needed, but Eloquent's where usually handles it.
        // However, we want to match the broadening in getAbilities.
        if ($ticket->assignments()->where('is_current', true)->where('assigned_to', $user->id)->exists()) {
            return true;
        }

        // 2. Department Managers or Super Admins
        if ($this->isDepartmentManager($user, $ticket->department_id) || $user->hasRole('Ticket Super Admin')) {
            return true;
        }

        // 3. Requestor can only update status if it's 'done' (to approve it indirectly, though we have specific methods for that)
        return (string) $ticket->user_id === (string) $user->id && $ticket->status?->value === 'done';
    }

    public function assign(User $user, Ticket $ticket): bool
    {
        // Only managers of the ticket's department or Super Admins can assign (Branch & Technicians cannot assign)
        return $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin');
    }

    public function approveCompletion(User $user, Ticket $ticket): bool
    {
        // Managers can approve PendingApproval, Done, and TicketApproved tickets
        if ($this->isDepartmentManager($user, $ticket->department_id) || $user->hasRole('Ticket Super Admin')) {
            return true;
        }

        // The original requestor can approve Done tickets (setting status to ticket_approved)
        return (int) $ticket->user_id === (int) $user->id && $ticket->status?->value === 'done';
    }

    public function rejectCompletion(User $user, Ticket $ticket): bool
    {
        // Managers can reject PendingApproval, Done, and TicketApproved tickets
        if ($this->isDepartmentManager($user, $ticket->department_id) || $user->hasRole('Ticket Super Admin')) {
            return true;
        }

        // The original requestor can reject Done tickets (sending back to in_progress)
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

        // Department manager or Super Admin can update regardless of done status
        if (
            $this->isDepartmentManager($user, $ticket->department_id)
            || $user->hasRole('Ticket Super Admin')
        ) {
            return true;
        }

        // Staff (current assignee) cannot update once ticket is done or ticket_approved
        if (in_array($ticket->status?->value, ['done', 'ticket_approved'], true)) {
            return false;
        }

        // Current assignee
        return $ticket->assignments()->where('is_current', true)->where('assigned_to', $user->id)->exists();
    }

    public function rate(User $user, Ticket $ticket): bool
    {
        return in_array($ticket->status?->value, ['done', 'ticket_approved', 'closed'], true) && (int) $ticket->user_id === (int) $user->id;
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->can('ticket.delete');
    }

    public function updateDeadline(User $user, Ticket $ticket): bool
    {
        // Managers, users with assign permission, or Super Admins can update the deadline
        return $this->isDepartmentManager($user, $ticket->department_id)
            || $user->can('ticket.assign')
            || $user->hasRole('Ticket Super Admin');
    }

    public function updatePriority(User $user, Ticket $ticket): bool
    {
        // Only managers of the ticket's department, users with ticket.assign permission, or Super Admins can set priority
        return $this->isDepartmentManager($user, $ticket->department_id)
            || $user->can('ticket.assign')
            || $user->hasRole('Ticket Super Admin');
    }
}
