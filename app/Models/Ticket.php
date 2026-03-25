<?php

namespace App\Models;

use App\Enums\TicketPriority;
use App\Enums\TicketSeverity;
use App\Enums\TicketStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'department_id',
        'ticket_main_category_id',
        'ticket_sub_category_id',
        'ticket_asset_id',
        'title',
        'description',
        'severity',
        'priority',
        'preferred_deadline',
        'requestor_full_name',
        'requestor_branch_id',
        'requestor_department_id',
        'requestor_phone',
        'deadline',
        'status',
        'hold_reason',
        'escalation_reason',
        'rejection_reason',
        'assigned_at',
        'in_progress_at',
        'done_at',
        'closed_at',
    ];

    protected $casts = [
        'preferred_deadline' => 'date',
        'deadline' => 'date',
        'assigned_at' => 'datetime',
        'in_progress_at' => 'datetime',
        'done_at' => 'datetime',
        'closed_at' => 'datetime',
        'severity' => TicketSeverity::class,
        'priority' => TicketPriority::class,
        'status' => TicketStatus::class,
    ];

    public function requestor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function requestorBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'requestor_branch_id');
    }

    public function requestorDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'requestor_department_id');
    }

    public function mainCategory(): BelongsTo
    {
        return $this->belongsTo(TicketMainCategory::class, 'ticket_main_category_id');
    }

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(TicketSubCategory::class, 'ticket_sub_category_id');
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(TicketAsset::class, 'ticket_asset_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TicketAssignment::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(TicketStatusHistory::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(TicketActivityLog::class);
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(TicketRating::class);
    }
}
