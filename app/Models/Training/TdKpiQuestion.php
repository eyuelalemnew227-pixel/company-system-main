<?php

namespace App\Models\Training;

use App\Models\FormInputType;
use App\Models\KpiRole;
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
        'kpi_role_id',
        'form_input_type_id',
        'status',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(KpiRole::class, 'kpi_role_id');
    }

    public function inputType(): BelongsTo
    {
        return $this->belongsTo(FormInputType::class, 'form_input_type_id');
    }

    public function choices(): HasMany
    {
        return $this->hasMany(TdKpiQuestionChoice::class, 'td_kpi_question_id')->orderBy('order_index');
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
}
