<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormChoice extends Model
{
    use HasFactory;

    protected $fillable = ['form_question_id', 'label', 'value', 'order_index'];

    public function question()
    {
        return $this->belongsTo(FormQuestion::class, 'form_question_id');
    }
}
