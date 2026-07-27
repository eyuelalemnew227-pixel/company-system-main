<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesBudget extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'fiscal_month_id',
        'ethiopian_month',
        'ethiopian_year',
        'sales_amount',
        'prev_expense_budget',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'fiscal_year_id'      => 'integer',
        'fiscal_month_id'     => 'integer',
        'sales_amount'        => 'decimal:2',
        'prev_expense_budget' => 'decimal:2',
        'ethiopian_month'     => 'integer',
        'ethiopian_year'      => 'integer',
    ];

    // Fiscal month names in the same order as the fiscal_months table
    public static array $monthNames = [
        1  => 'ሐምሌ',
        2  => 'ነሐሴ',
        3  => 'መስከረም',
        4  => 'ጥቅምት',
        5  => 'ህዳር',
        6  => 'ታህሳስ',
        7  => 'ጥር',
        8  => 'የካቲት',
        9  => 'መጋቢት',
        10 => 'ሚያዝያ',
        11 => 'ግንቦት',
        12 => 'ሰኔ',
    ];

    // Get month name from number
    public function getMonthNameAttribute(): string
    {
        return self::$monthNames[$this->ethiopian_month] ?? '';
    }

    // Get previous fiscal month number and year within the app's 12-month cycle
    public static function getPreviousMonth(
        int $month,
        int $year
    ): array {
        if ($month === 1) {
            return ['month' => 12, 'year' => $year - 1];
        }

        return ['month' => $month - 1, 'year' => $year];
    }

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function fiscalMonth(): BelongsTo
    {
        return $this->belongsTo(FiscalMonth::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(SalesBudgetLog::class);
    }
}