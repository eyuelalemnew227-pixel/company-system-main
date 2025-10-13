<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FiscalYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', // e.g., 'EFY 2018'
        'gregorian_start_date',
        'gregorian_end_date',
    ];

    protected $casts = [
        'gregorian_start_date' => 'date',
        'gregorian_end_date' => 'date',
    ];

    public function fiscalMonths(): HasMany
    {
        return $this->hasMany(FiscalMonth::class);
    }

    public function evaluationPeriods(): HasMany
    {
        return $this->hasMany(EvaluationPeriod::class);
    }

    // public function evaluations(): HasMany
    // {
    //     return $this->hasMany(Evaluation::class);
    // }
}