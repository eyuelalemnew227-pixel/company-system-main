<?php

namespace App\Enums;

enum TicketSeverity: string
{
    case Severe = 'severe';
    case MidSevere = 'mid-severe';
    case NoImpact = 'no-impact';
}
