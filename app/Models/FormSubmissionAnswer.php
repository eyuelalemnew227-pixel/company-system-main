<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSubmissionAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_submission_id',
        'form_question_id',
        'sub_question_identifier',
        'value_text',
        'value_boolean',
        'is_relocated',
        'targeted_employees',
    ];

    protected $casts = [
        'is_relocated' => 'boolean',
        'targeted_employees' => 'array',
    ];

    public function submission()
    {
        return $this->belongsTo(FormSubmission::class, 'form_submission_id');
    }

    public function question()
    {
        return $this->belongsTo(FormQuestion::class, 'form_question_id');
    }
}
