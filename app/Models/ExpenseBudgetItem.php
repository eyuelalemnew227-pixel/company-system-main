<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseBudgetItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_budget_id',
        'expense_item_id',
        'planned_budget',
    ];

    protected $casts = [
        'planned_budget' => 'decimal:2',
    ];

    public function expenseBudget(): BelongsTo
    {
        return $this->belongsTo(ExpenseBudget::class);
    }

    public function expenseItem(): BelongsTo
    {
        return $this->belongsTo(ExpenseItem::class, 'expense_item_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ExpenseBudgetActivityLog::class);
    }
}
