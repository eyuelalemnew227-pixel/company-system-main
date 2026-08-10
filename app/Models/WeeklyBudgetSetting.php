<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WeeklyBudgetSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_deadline_day',
        'is_urgent_enabled',
    ];

    protected $casts = [
        'is_urgent_enabled' => 'boolean',
    ];
}
