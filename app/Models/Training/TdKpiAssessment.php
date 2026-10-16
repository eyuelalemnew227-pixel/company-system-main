<?php

namespace App\Models\Training;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TdKpiAssessment extends Model
{
    use HasFactory;

    protected $table = 'td_kpi_assessments';

    protected $fillable = [
        'assessment_name',
        'training_module_id',
        'randomization_questions_number',
        'status',
    ];

    public function trainingModule(): BelongsTo
    {
        return $this->belongsTo(RecurringTrainingModule::class, 'training_module_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(TdKpiQuestion::class, 'assessment_id');
    }
}
