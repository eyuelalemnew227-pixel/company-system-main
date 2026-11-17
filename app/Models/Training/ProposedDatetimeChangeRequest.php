<?php

namespace App\Models\Training;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProposedDatetimeChangeRequest extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'evaluation_result_override_id',
        'training_request_id',
        'employee_name',
        'branch_name',
        'department_name',
        'training_type_name',
        'assigned_training_content',
        'current_proposed_start_at',
        'current_proposed_end_at',
        'requested_proposed_start_at',
        'requested_proposed_end_at',
        'reason',
        'status',
        'requested_by',
        'decided_by',
        'decided_at',
    ];

    protected $casts = [
        'current_proposed_start_at' => 'datetime',
        'current_proposed_end_at' => 'datetime',
        'requested_proposed_start_at' => 'datetime',
        'requested_proposed_end_at' => 'datetime',
        'decided_at' => 'datetime',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function evaluationResultOverride(): BelongsTo
    {
        return $this->belongsTo(EvaluationResultOverride::class, 'evaluation_result_override_id');
    }

    public function trainingRequest(): BelongsTo
    {
        return $this->belongsTo(TrainingRequest::class, 'training_request_id');
    }
};
