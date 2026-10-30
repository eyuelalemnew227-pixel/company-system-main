<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class PurchaseInspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference_no',
        'inspector_id',
        'inspection_date',
        'store_name',
        'status',
        'notes',
        'submitted_at',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'inspection_date' => 'date:Y-m-d',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (PurchaseInspection $inspection) {
            if (empty($inspection->reference_no)) {
                $inspection->reference_no = static::generateReferenceNo($inspection->inspection_date ?? now());
            }
        });
    }

    public static function generateReferenceNo($date = null): string
    {
        $dateStr = Carbon::parse($date ?? now())->format('Ymd');
        $prefix = "PI-{$dateStr}-";

        $last = static::where('reference_no', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->value('reference_no');

        if ($last) {
            $lastSeq = (int) substr($last, -4);
            $seq = str_pad((string) ($lastSeq + 1), 4, '0', STR_PAD_LEFT);
        } else {
            $seq = '0001';
        }

        return $prefix . $seq;
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseInspectionItem::class, 'purchase_inspection_id');
    }
}
