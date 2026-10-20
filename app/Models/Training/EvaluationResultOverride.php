<?php

namespace App\Models\Training;

use App\Models\Employee;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\Form;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EvaluationResultOverride extends Model
{
    use HasFactory;

    protected $table = 'evaluation_result_overrides';

    protected $fillable = [
        'employee_id',
        'form_id',
        'fiscal_year_id',
        'fiscal_month_id',
        'next_action',
        'training_type_id',
        'updated_by',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function fiscalMonth(): BelongsTo
    {
        return $this->belongsTo(FiscalMonth::class);
    }

    public function trainingType(): BelongsTo
    {
        return $this->belongsTo(TrainingType::class, 'training_type_id');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function assignment(): HasOne
    {
        return $this->hasOne(TdKpiAssignment::class, 'evaluation_result_override_id')->latestOfMany();
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TdKpiAssignment::class, 'evaluation_result_override_id')->orderBy('id');
    }
}
