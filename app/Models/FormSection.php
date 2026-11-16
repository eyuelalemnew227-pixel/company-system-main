<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSection extends Model
{
    use HasFactory;

    protected $fillable = ['form_version_id', 'title', 'order_index', 'visibility_logic', 'min_required_answers', 'max_allowed_answers', 'exact_required_answers', 'weight'];

    protected $casts = [
        'visibility_logic' => 'array',
        'min_required_answers' => 'integer',
        'max_allowed_answers' => 'integer',
        'exact_required_answers' => 'integer',
        'weight' => 'float',
    ];

    public function formVersion()
    {
        return $this->belongsTo(FormVersion::class);
    }

    public function questions()
    {
        return $this->hasMany(FormQuestion::class)->orderBy('order_index');
    }
}
