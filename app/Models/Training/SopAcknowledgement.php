<?php

namespace App\Models\Training;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SopAcknowledgement extends Model
{
    use HasFactory;

    protected $table = 'training_sop_acknowledgements';

    protected $fillable = [
        'sop_id',
        'employee_id',
        'acknowledged_at',
        'ip_address',
        'digital_signature',
    ];

    protected $casts = [
        'acknowledged_at' => 'datetime',
    ];

    public function sopDocument(): BelongsTo
    {
        return $this->belongsTo(SopDocument::class, 'sop_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
