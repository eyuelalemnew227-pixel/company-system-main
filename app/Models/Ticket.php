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
        'beneficiary_branch_id',
        'beneficiary_department_id',
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
        'fiscal_year_id',
        'fiscal_month_id',
        'image_path',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? \Illuminate\Support\Facades\Storage::url($this->image_path) : null;
    }

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

    public function beneficiaryBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'beneficiary_branch_id');
    }

    public function beneficiaryDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'beneficiary_department_id');
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function fiscalMonth(): BelongsTo
    {
        return $this->belongsTo(FiscalMonth::class);
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
        // Use non-strict comparison for IDs to handle potential string/int mismatches in production
        $isAssignee = $currentAssignment && (string) $currentAssignment->assigned_to === (string) $user->id;

        $managerUserIds = app(\App\Services\TicketActionService::class)->departmentManagerUserIds($this->department_id);
        $hasManagerPower = in_array((int) $user->id, $managerUserIds)
            || $user->hasRole('Ticket Super Admin')
            || $user->hasRole('Super Admin')
            || $user->can('ticket.assign')
            || $user->can('ticket.approve')
            || $user->can('ticket.close');

        $isClosedOrRejected = in_array($this->status, [TicketStatus::Rejected, TicketStatus::Closed]);
        $isPendingOrDone = in_array($this->status, [TicketStatus::PendingApproval, TicketStatus::Done]);

        $canUpdateStatusPermission = $user->can('ticket.status.update')
            || $user->can('ticket.done')
            || $user->can('ticket.escalate')
            || $user->can('ticket.approve')
            || $user->can('ticket.close');

        return [
            'canAssign' => ($hasManagerPower || $user->can('ticket.assign')) && !$isClosedOrRejected,
            'canUpdateStatus' => ($isAssignee || $hasManagerPower || $canUpdateStatusPermission) && !$isClosedOrRejected,
            'canApproveReject' => (($hasManagerPower || $user->can('ticket.approve') || $user->can('ticket.reject')) && $isPendingOrDone)
                || ($this->status === TicketStatus::Done && (int) $this->user_id === (int) $user->id),
            'canRate' => $this->status === TicketStatus::TicketApproved
                && ((int) $this->user_id === (int) $user->id || $user->can('ticket.rate'))
                && $this->ratings()->where('user_id', $user->id)->doesntExist(),
            'hasRated' => (int) $this->user_id === (int) $user->id
                && $this->ratings()->where('user_id', $user->id)->exists(),
            'isRequestor' => (int) $this->user_id === (int) $user->id,
            'canDelete' => $user->can('ticket.delete') || $user->hasRole('Super Admin') || $user->hasRole('Ticket Super Admin'),
            'canUpdateAsset' => $user->can('updateAsset', $this),
            'canUpdateDeadline' => $user->can('updateDeadline', $this),
            'canUpdatePriority' => $user->can('updatePriority', $this),
            'canRequestSparePart' => (string) $this->department_id === '13706' && $this->status === TicketStatus::Hold && ($isAssignee || $hasManagerPower),
            'hasManagerPower' => $hasManagerPower,
        ];
    }
}
