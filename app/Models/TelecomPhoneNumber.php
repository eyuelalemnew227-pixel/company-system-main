<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelecomPhoneNumber extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone_number',
        'account_number',
        'sim_card_number',
        'telecom_provider_id',
        'service_type',
        'package_type',
        'monthly_cost',
        'billing_type',
        'assigned_type',
        'employee_id',
        'branch_id',
        'department_id',
        'status',
        'issue_date',
        'renewal_date',
        'notes',
    ];

    protected $casts = [
        'monthly_cost' => 'decimal:2',
        'issue_date' => 'date',
        'renewal_date' => 'date',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(TelecomProvider::class, 'telecom_provider_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
