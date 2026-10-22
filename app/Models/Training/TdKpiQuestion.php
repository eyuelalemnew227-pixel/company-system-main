<?php

namespace App\Models\Training;

use App\Models\FormInputType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TdKpiQuestion extends Model
{
    use HasFactory;

    protected $table = 'td_kpi_questions';

    protected $fillable = [
        'label',
        'assessment_id',
        'form_input_type_id',
        'answer',
        'status',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(TdKpiAssessment::class, 'assessment_id');
    }

    public function inputType(): BelongsTo
    {
        return $this->belongsTo(FormInputType::class, 'form_input_type_id');
    }

    public function choices(): HasMany
    {
        return $this->hasMany(TdKpiQuestionChoice::class, 'td_kpi_question_id')->orderBy('order_index');
    }

    public function assignmentQuestions(): HasMany
    {
        return $this->hasMany(TdKpiAssignmentQuestion::class, 'td_kpi_question_id');
    }

    public function isAssigned(): bool
    {
        return $this->assignmentQuestions()->exists();
    }

    public static function inputTypeNeedsChoices(?string $typeIdentifier): bool
    {
        if (!$typeIdentifier) {
            return false;
        }

        return str_contains($typeIdentifier, 'select')
            || $typeIdentifier === 'radio'
            || $typeIdentifier === 'checkbox'
            || $typeIdentifier === 'employee_evaluation_grid';
    }

    public static function inputTypeRequiresAnswer(?string $typeIdentifier): bool
    {
        if (!$typeIdentifier) {
            return false;
        }

        return $typeIdentifier === 'select_one'
            || $typeIdentifier === 'select_multiple'
            || $typeIdentifier === 'radio'
            || $typeIdentifier === 'checkbox';
    }
}
