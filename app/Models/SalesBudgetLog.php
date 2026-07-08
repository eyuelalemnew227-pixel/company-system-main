<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesBudgetLog extends Model
{
    use HasFactory;

   protected $fillable = [
    'sales_budget_id',
    'branch_name',
    'ethiopian_month',
    'ethiopian_year',
    'user_id',
    'action',
    'old_sales_amount',
    'new_sales_amount',
    'old_prev_expense',
    'new_prev_expense',
    'notes',
];

    protected $casts = [
        'old_sales_amount' => 'decimal:2',
        'new_sales_amount' => 'decimal:2',
        'old_prev_expense' => 'decimal:2',
        'new_prev_expense' => 'decimal:2',
    ];

    public function salesBudget(): BelongsTo
    {
        return $this->belongsTo(SalesBudget::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}