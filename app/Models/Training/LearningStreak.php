<?php

namespace App\Models\Training;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningStreak extends Model
{
    use HasFactory;

    protected $table = 'training_learning_streaks';

    protected $fillable = [
        'employee_id',
        'current_streak',
        'longest_streak',
        'last_activity_date',
        'total_days_active',
    ];

    protected $casts = [
        'last_activity_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
