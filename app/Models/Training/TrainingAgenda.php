<?php

namespace App\Models\Training;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingAgenda extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'submitted_by_user_id',
        'title',
        'proposed_date',
        'allocated_minutes',
        'description',
        'objectives',
        'content_outline',
        'target_trainees',
        'delivery_method',
        'required_resources',
        'status',
        'rejection_reason',
    ];

    protected $casts = [
        'proposed_date' => 'date:Y-m-d',
        'objectives' => 'array',
        'content_outline' => 'array',
        'target_trainees' => 'array',
        'required_resources' => 'array',
        'allocated_minutes' => 'integer',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function scheduleItems()
    {
        return $this->hasMany(TrainingScheduleItem::class, 'training_agenda_id');
    }
}
