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
        'parent_ticket_id',
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

    public function productRequests(): HasMany
    {
        return $this->hasMany(TicketProductRequest::class);
    }

    public function getAbilities(User $user): array
    {
        $currentAssignment = $this->assignments()->where('is_current', true)->first();
        $isAssignee = $currentAssignment && $currentAssignment->assigned_to === $user->id;

        $managerUserIds = app(\App\Services\TicketActionService::class)->departmentManagerUserIds($this->department_id);
        $hasManagerPower = in_array($user->id, $managerUserIds) || $user->hasRole('Ticket Super Admin');

        return [
            'canAssign' => ($hasManagerPower || $user->can('ticket.assign'))
                && !in_array($this->status, [TicketStatus::PendingApproval, TicketStatus::Rejected, TicketStatus::Closed]),
            'canUpdateStatus' => $isAssignee
                && !in_array($this->status, [TicketStatus::PendingApproval, TicketStatus::Rejected, TicketStatus::Closed, TicketStatus::Done]),
            'canApproveReject' => ($hasManagerPower && ($this->status === TicketStatus::PendingApproval || $this->status === TicketStatus::Done))
                || ($this->status === TicketStatus::Done && $this->user_id === $user->id),
            'canRate' => $this->status === TicketStatus::Closed
                && $this->user_id === $user->id
                && $this->ratings()->where('user_id', $user->id)->doesntExist(),
            'hasRated' => $this->user_id === $user->id
                && $this->ratings()->where('user_id', $user->id)->exists(),
            'isRequestor' => $this->user_id === $user->id,
            'canDelete' => $user->can('ticket.delete'),
            'canUpdateAsset' => $user->can('updateAsset', $this),
            'canUpdateDeadline' => $user->can('updateDeadline', $this),
            'canUpdatePriority' => $user->can('updatePriority', $this),
        ];
    }
}
