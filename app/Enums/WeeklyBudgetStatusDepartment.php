<?php

namespace App\Enums;

enum WeeklyBudgetStatusDepartment: string
{
    case Pending  = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case OnHold   = 'on-hold';
}
