<?php

namespace App\Enums;

enum WeeklyBudgetRequestType: string
{
    case Urgent = 'urgent';
    case Normal = 'normal';
}
