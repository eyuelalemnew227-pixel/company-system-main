<?php

namespace App\Models\Training;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingScheduleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'training_schedule_id',
        'training_agenda_id',
        'department_id',
        'topic_title',
        'order_no',
        'allocated_minutes',
        'start_time',
        'end_time',
        'is_break',
        'department_approved',
        'department_approved_at',
        'department_approved_by',
    ];

    protected $casts = [
        'is_break' => 'boolean',
        'department_approved' => 'boolean',
        'department_approved_at' => 'datetime',
        'allocated_minutes' => 'integer',
        'order_no' => 'integer',
    ];

    public function schedule()
    {
        return $this->belongsTo(TrainingSchedule::class, 'training_schedule_id');
    }

    public function agenda()
    {
        return $this->belongsTo(TrainingAgenda::class, 'training_agenda_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'department_approved_by');
    }

    public function evaluations()
    {
        return $this->hasMany(TrainerEvaluation::class, 'training_schedule_item_id');
    }
}
