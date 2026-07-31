<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseBudgetActivityLog extends Model
{
    use HasFactory;

    public const ACTION_BUDGET_CREATED = 'budget_created';

    public const ACTION_BUDGET_DELETED = 'budget_deleted';

    public const ACTION_ITEM_CREATED = 'budget_item_created';

    public const ACTION_ITEM_UPDATED = 'budget_item_updated';

    public const ACTION_ITEM_DELETED = 'budget_item_deleted';

    protected $fillable = [
        'expense_budget_id',
        'user_id',
        'action',
        'summary',
        'old_values',
        'new_values',
        'meta',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'meta' => 'array',
    ];

    public function expenseBudget(): BelongsTo
    {
        return $this->belongsTo(ExpenseBudget::class);
    }



    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
