<?php

namespace App\Enums;

enum WeeklyBudgetStatusCeo: string
{
    case Pending  = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case OnHold   = 'on-hold';
}
