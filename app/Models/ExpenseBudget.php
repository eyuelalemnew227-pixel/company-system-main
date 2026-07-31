<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseBudget extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'branch_id',
        'department_id',
        'fiscal_year_id',
        'fiscal_month_id',
        'expense_item_id',
        'planned_budget',
        'created_by',
        'is_deleted',
    ];

    protected $casts = [
        'fiscal_year_id' => 'integer',
        'fiscal_month_id' => 'integer',
        'planned_budget' => 'decimal:2',
        'is_deleted' => 'boolean',
    ];

    public function expenseItem(): BelongsTo
    {
        return $this->belongsTo(ExpenseItem::class, 'expense_item_id', 'expense_parent_acc_code');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ExpenseBudgetActivityLog::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function fiscalMonth(): BelongsTo
    {
        return $this->belongsTo(FiscalMonth::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
