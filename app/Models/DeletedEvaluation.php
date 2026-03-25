<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeletedEvaluation extends Model
{
    protected $fillable = [
        'evaluation_response_id',
        'evaluation_id',
        'evaluator_id',
        'evaluate_id',
        'evaluable_type',
        'evaluation_period_id',
        'evaluation_data',
        'question_responses_data',
        'deleted_by',
        'deleted_at',
        'deletion_reason',
    ];

    protected $casts = [
        'evaluation_data' => 'array',
        'question_responses_data' => 'array',
        'deleted_at' => 'datetime',
    ];

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function evaluationPeriod(): BelongsTo
    {
        return $this->belongsTo(EvaluationPeriod::class);
    }
}
