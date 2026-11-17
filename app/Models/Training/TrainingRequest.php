<?php

namespace App\Models\Training;

use App\Models\Department;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class TrainingRequest extends Model
{
    use HasFactory;

    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_ASSIGNED = 'assigned';
    public const STATUS_HELD = 'held';

    public const VERDICT_CORRECT = 'correct';
    public const VERDICT_INCORRECT = 'incorrect';

    protected $table = 'training_requests';

    protected $fillable = [
        'request_group_id',
        'employee_id',
        'training_type_id',
        'requested_on',
        'recurring_module_id',
        'extra_info',
        'requested_by',
        'requester_department_id',
        'status',
        'first_proposed_start_at',
        'first_proposed_end_at',
        'current_proposed_start_at',
        'current_proposed_end_at',
        'coordinator_actual_start_at',
        'coordinator_actual_end_at',
        'actual_date_verdict',
        'requester_actual_start_at',
        'requester_actual_end_at',
    ];

    protected $casts = [
        'requested_on' => 'date',
        'first_proposed_start_at' => 'datetime',
        'first_proposed_end_at' => 'datetime',
        'current_proposed_start_at' => 'datetime',
        'current_proposed_end_at' => 'datetime',
        'coordinator_actual_start_at' => 'datetime',
        'coordinator_actual_end_at' => 'datetime',
        'requester_actual_start_at' => 'datetime',
        'requester_actual_end_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function trainingType(): BelongsTo
    {
        return $this->belongsTo(TrainingType::class, 'training_type_id');
    }

    public function recurringModule(): BelongsTo
    {
        return $this->belongsTo(RecurringTrainingModule::class, 'recurring_module_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function requesterDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'requester_department_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TdKpiAssignment::class, 'training_request_id')->orderBy('id');
    }

    /**
     * @return Collection<int, self>
     */
    public function groupMembers(): Collection
    {
        if (! $this->request_group_id) {
            return collect([$this]);
        }

        return static::query()
            ->where('request_group_id', $this->request_group_id)
            ->orderBy('id')
            ->get();
    }

    /**
     * @return array<int, int>
     */
    public function groupMemberIds(): array
    {
        if (! $this->request_group_id) {
            return [(int) $this->id];
        }

        return static::query()
            ->where('request_group_id', $this->request_group_id)
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
