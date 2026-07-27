<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseItem extends Model
{
    use HasFactory;

    protected $table = 'expenses';

    protected $primaryKey = 'expense_parent_acc_code';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'expense_parent_acc_code',
        'code',
        'expense_type',
        'frequent_expense',
        'is_expense',
    ];

    protected $casts = [
        'frequent_expense' => 'boolean',
        'is_expense' => 'boolean',
        'expense_parent_acc_code' => 'integer',
        'code' => 'integer',
    ];

    public function getNameAttribute(): string
    {
        return $this->expense_type;
    }

    public function budgetItems(): HasMany
    {
        return $this->hasMany(ExpenseBudgetItem::class, 'expense_item_id', 'expense_parent_acc_code');
    }
}
