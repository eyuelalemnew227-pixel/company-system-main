<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'weight',
        'is_active',
    ];

    protected $casts = [
        'weight' => 'float',
        'is_active' => 'boolean',
    ];
}
