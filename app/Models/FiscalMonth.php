<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FiscalMonth extends Model
{
    use HasFactory;

    protected $fillable = [
        'fiscal_year_id',
        'name',
        'efy_month_number',
        'gregorian_start_date',
        'gregorian_end_date',
    ];

    protected $casts = [
        'gregorian_start_date' => 'date',
        'gregorian_end_date' => 'date',
        'efy_month_number' => 'integer',
    ];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function evaluationPeriods(): HasMany
    {
        return $this->hasMany(EvaluationPeriod::class);
    }

    // public function evaluations(): HasMany
    // {
    //     return $this->hasMany(Evaluation::class);
    // }

    // Ethiopian month names (12 months, Nehasse includes Pagumē)
    public static $ethiopianMonths = [
        1 => ['en' => 'Hamle', 'am' => 'ሐምሌ'],
        2 => ['en' => 'Nehasse', 'am' => 'ነሐሴ'],
        3 => ['en' => 'Meskerem', 'am' => 'መስከረም'],
        4 => ['en' => 'Tikimt', 'am' => 'ጥቅምት'],
        5 => ['en' => 'Hidar', 'am' => 'ህዳር'],
        6 => ['en' => 'Tahsas', 'am' => 'ታህሳስ'],
        7 => ['en' => 'Tir', 'am' => 'ጥር'],
        8 => ['en' => 'Yekatit', 'am' => 'የካቲት'],
        9 => ['en' => 'Megabit', 'am' => 'መጋቢት'],
        10 => ['en' => 'Miazia', 'am' => 'ሚያዝያ'],
        11 => ['en' => 'Ginbot', 'am' => 'ግንቦት'],
        12 => ['en' => 'Sene', 'am' => 'ሰኔ'], 
    ];
}