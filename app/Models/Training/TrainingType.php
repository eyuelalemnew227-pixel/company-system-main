<?php

namespace App\Models\Training;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingType extends Model
{
    use HasFactory;

    protected $table = 'training_types';

    protected $fillable = [
        'name',
        'status',
    ];

    public function evaluationResultOverrides(): HasMany
    {
        return $this->hasMany(EvaluationResultOverride::class, 'training_type_id');
    }
}
