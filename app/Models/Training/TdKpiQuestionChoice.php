<?php

namespace App\Models\Training;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TdKpiQuestionChoice extends Model
{
    use HasFactory;

    protected $table = 'td_kpi_question_choices';

    protected $fillable = [
        'td_kpi_question_id',
        'label',
        'value',
        'order_index',
    ];

    public function question(): BelongsTo
    {
        return $this->belongsTo(TdKpiQuestion::class, 'td_kpi_question_id');
    }
}
