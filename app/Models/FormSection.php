<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSection extends Model
{
    use HasFactory;

    protected $fillable = ['form_version_id', 'title', 'order_index', 'visibility_logic'];

    protected $casts = [
        'visibility_logic' => 'array',
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
