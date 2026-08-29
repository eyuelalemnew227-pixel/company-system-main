<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelecomBroadband extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_number',
        'connection_name',
        'connection_type',
        'telecom_provider_id',
        'package_type',
        'bandwidth_speed',
        'monthly_cost',
        'billing_type',
        'branch_id',
        'department_id',
        'installation_address',
        'ip_address',
        'equipment_details',
        'contract_start_date',
        'contract_expiry_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'monthly_cost' => 'decimal:2',
        'contract_start_date' => 'date',
        'contract_expiry_date' => 'date',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(TelecomProvider::class, 'telecom_provider_id');
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
