<?php

namespace App\Models\Training;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TdKpiAssignment extends Model
{
    use HasFactory;

    protected $table = 'td_kpi_assignments';

    protected $fillable = [
        'evaluation_result_override_id',
        'employee_id',
        'fiscal_year_id',
        'fiscal_month_id',
        'branch_id',
        'department_id',
        'training_type_id',
        'assigned_training_content_id',
        'proposed_training_date',
        'is_training_held',
        'attendance',
        'assessment_id',
        'post_assessment_score',
        'assigned_by',
    ];

    protected $casts = [
        'proposed_training_date' => 'date',
        'is_training_held' => 'boolean',
        'attendance' => 'boolean',
        'post_assessment_score' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::deleting(function (self $assignment) {
            $assignment->assignmentQuestions()->delete();
        });
    }

    public function evaluationResultOverride(): BelongsTo
    {
        return $this->belongsTo(EvaluationResultOverride::class, 'evaluation_result_override_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function fiscalMonth(): BelongsTo
    {
        return $this->belongsTo(FiscalMonth::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function trainingType(): BelongsTo
    {
        return $this->belongsTo(TrainingType::class, 'training_type_id');
    }

    public function assignedTrainingContent(): BelongsTo
    {
        return $this->belongsTo(RecurringTrainingModule::class, 'assigned_training_content_id');
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(TdKpiAssessment::class, 'assessment_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function assignmentQuestions(): HasMany
    {
        return $this->hasMany(TdKpiAssignmentQuestion::class, 'td_kpi_assignment_id')->orderBy('order_index');
    }
}
