<?php

namespace App\Enums;

enum TicketPriority: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';
    case Urgent = 'urgent';

    public function color(): string
    {
        return match ($this) {
            self::Low => 'slate',
            self::Medium => 'blue',
            self::High => 'orange',
            self::Urgent => 'red',
        };
    }
}
