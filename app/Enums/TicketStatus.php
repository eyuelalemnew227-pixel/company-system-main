<?php

namespace App\Enums;

enum TicketStatus: string
{
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Hold = 'hold';
    case Escalated = 'escalated';
    case Done = 'done';
    case Rejected = 'rejected';
    case Closed = 'closed';

    public static function closable(): array
    {
        return [self::Done];
    }
}
