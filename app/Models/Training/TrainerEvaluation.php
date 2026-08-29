<?php

namespace App\Models\Training;

use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainerEvaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'training_schedule_item_id',
        'evaluator_user_id',
        'evaluator_branch_id',
        'trainer_department_id',
        'content_clarity_rating',
        'preparation_rating',
        'time_management_rating',
        'applicability_rating',
        'overall_rating',
        'strengths',
        'areas_for_improvement',
        'feedback_notes',
        'attendance_confirmed',
    ];

    protected $casts = [
        'content_clarity_rating' => 'integer',
        'preparation_rating' => 'integer',
        'time_management_rating' => 'integer',
        'applicability_rating' => 'integer',
        'overall_rating' => 'float',
        'attendance_confirmed' => 'boolean',
    ];

    public function scheduleItem()
    {
        return $this->belongsTo(TrainingScheduleItem::class, 'training_schedule_item_id');
    }

    public function evaluatorUser()
    {
        return $this->belongsTo(User::class, 'evaluator_user_id');
    }

    public function evaluatorBranch()
    {
        return $this->belongsTo(Branch::class, 'evaluator_branch_id');
    }

    public function trainerDepartment()
    {
        return $this->belongsTo(Department::class, 'trainer_department_id');
    }
}
