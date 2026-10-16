<?php

namespace App\Models\Training;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TdKpiAssignmentQuestion extends Model
{
    use HasFactory;

    protected $table = 'td_kpi_assignment_questions';

    protected $fillable = [
        'td_kpi_assignment_id',
        'td_kpi_question_id',
        'order_index',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TdKpiAssignment::class, 'td_kpi_assignment_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(TdKpiQuestion::class, 'td_kpi_question_id');
    }
}
