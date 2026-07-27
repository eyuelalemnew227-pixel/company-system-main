<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyBudgetActivityLog extends Model
{
    use HasFactory;

    public const ACTION_REQUEST_CREATED = 'request_created';

    public const ACTION_REQUEST_UPDATED = 'request_updated';

    public const ACTION_REQUEST_DELETED = 'request_deleted';

    public const ACTION_FINANCE_STATUS_UPDATED = 'finance_status_updated';

    public const ACTION_DEPARTMENT_STATUS_UPDATED = 'department_status_updated';

    public const ACTION_CEO_STATUS_UPDATED = 'ceo_status_updated';

    public const ACTION_PAID_STATUS_OVERRIDDEN = 'paid_status_overridden';

    protected $fillable = [
        'weekly_budget_id',
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

    public function weeklyBudget(): BelongsTo
    {
        return $this->belongsTo(WeeklyBudget::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
