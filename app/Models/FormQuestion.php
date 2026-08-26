<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormQuestion extends Model
{
    use HasFactory;

    protected $fillable = ['form_section_id', 'form_input_type_id', 'label', 'is_required', 'order_index', 'local_id', 'visibility_logic', 'default_value'];

    protected $casts = [
        'visibility_logic' => 'array',
    ];

    public function section()
    {
        return $this->belongsTo(FormSection::class, 'form_section_id');
    }

    public function inputType()
    {
        return $this->belongsTo(FormInputType::class, 'form_input_type_id');
    }

    public function choices()
    {
        return $this->hasMany(FormChoice::class)->orderBy('order_index');
    }
}
