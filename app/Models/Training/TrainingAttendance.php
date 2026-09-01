<?php

namespace App\Models\Training;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingAttendance extends Model
{
    protected $fillable = [
        'training_schedule_id',
        'training_schedule_item_id',
        'training_agenda_id',
        'user_id',
        'user_type',
        'name',
        'trainee_name',
        'branch_or_department',
        'branch_name',
        'department_name',
        'phone_number',
        'session_date',
        'status',
        'notes',
        'recorded_by_user_id',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $model) {
            if (empty($model->trainee_name) && !empty($model->name)) {
                $model->trainee_name = $model->name;
            } elseif (empty($model->name) && !empty($model->trainee_name)) {
                $model->name = $model->trainee_name;
            }
        });
    }

    protected $casts = [
        'session_date' => 'date',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(TrainingSchedule::class, 'training_schedule_id');
    }

    public function scheduleItem(): BelongsTo
    {
        return $this->belongsTo(TrainingScheduleItem::class, 'training_schedule_item_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}
