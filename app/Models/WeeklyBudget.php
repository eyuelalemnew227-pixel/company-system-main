<?php

namespace App\Models;

use App\Enums\WeeklyBudgetRequestType;
use App\Enums\WeeklyBudgetStatusCeo;
use App\Enums\WeeklyBudgetStatusDepartment;
use App\Enums\WeeklyBudgetStatusFinance;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyBudget extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'department_id',
        'fiscal_year_id',
        'fiscal_month_id',
        'week_number',
        'week_start_date',
        'week_end_date',
        'request_type',
        'status_finance',
        'status_department',
        'status_ceo',
        'amount',
        'description',
        'note',
        'created_by',
        'payment_category_id',
        'payment_type_id',
    ];

    protected $casts = [
        'request_type'      => WeeklyBudgetRequestType::class,
        'status_finance'    => WeeklyBudgetStatusFinance::class,
        'status_department' => WeeklyBudgetStatusDepartment::class,
        'status_ceo'        => WeeklyBudgetStatusCeo::class,
        'amount'         => 'decimal:2',
        'week_start_date' => 'date',
        'week_end_date'   => 'date',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function fiscalMonth(): BelongsTo
    {
        return $this->belongsTo(FiscalMonth::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paymentCategory(): BelongsTo
    {
        return $this->belongsTo(PaymentCategory::class, 'payment_category_id');
    }

    public function paymentType(): BelongsTo
    {
        return $this->belongsTo(PaymentType::class, 'payment_type_id');
    }
}
