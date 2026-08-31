<?php

namespace App\Models\Training;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingFeedbackResponse extends Model
{
    protected $fillable = [
        'training_schedule_id',
        'training_schedule_item_id',
        'user_id',
        'branch_id',
        'trainee_name',
        'q1_relevance',
        'q2_objective_clarity',
        'q3_response_quality',
        'q4_participatory',
        'q5_motivating',
        'q6_gained_new_knowledge',
        'q7_motivation_diff',
        'q8_knowledge_increase',
        'q9_one_word_summary',
        'q10_most_liked_aspects',
        'q11_additional_comments',
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

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
