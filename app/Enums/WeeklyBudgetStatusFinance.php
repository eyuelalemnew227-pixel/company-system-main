<?php

namespace App\Enums;

enum WeeklyBudgetStatusFinance: string
{
    case Pending  = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Paid     = 'paid';
    case OnHold   = 'on-hold';
}
