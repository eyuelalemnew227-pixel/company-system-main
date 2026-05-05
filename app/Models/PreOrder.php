<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PreOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'first_name',
        'father_name',
        'surname',
        'phone_number',
        'order_type_id',
        'collection_day_id',
        'collection_branch_id',
        'holiday_id',
        'status',

        'total_amount',
        'voucher_code',
        'transaction_reference',
        'registering_branch_id',
        'created_by',
        'updated_by',
        'collected_at',
        'collected_by',
        'late_payment',
        'payment_method',
        'payment_slip',
    ];

    protected $appends = ['client_name'];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'holiday_id' => 'integer',
        'late_payment' => 'boolean',
    ];

    /**
     * Virtual accessor for backward-compatibility.
     * Returns the full concatenated name from the three name parts.
     */
    public function getClientNameAttribute(): string
    {
        return trim(implode(' ', array_filter([
            $this->first_name,
            $this->father_name,
            $this->surname,
        ])));
    }

    /**
     * @return BelongsTo<OrderType, PreOrder>
     */
    public function orderType(): BelongsTo
    {
        return $this->belongsTo(OrderType::class);
    }

    /**
     * @return BelongsTo<CollectionDay, PreOrder>
     */
    public function collectionDay(): BelongsTo
    {
        return $this->belongsTo(CollectionDay::class);
    }

    /**
     * @return BelongsTo<Branch, PreOrder>
     */
    public function collectionBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'collection_branch_id');
    }

    /**
     * @return BelongsTo<Branch, PreOrder>
     */
    public function registeringBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'registering_branch_id');
    }

    /**
     * @return BelongsTo<User, PreOrder>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, PreOrder>
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * @return BelongsTo<User, PreOrder>
     */
    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    /**
     * @return BelongsTo<Holiday, PreOrder>
     */
    public function holiday(): BelongsTo
    {
        return $this->belongsTo(Holiday::class);
    }

    /**
     * @return HasMany<PreOrderItem>
     */

    public function items(): HasMany
    {
        return $this->hasMany(PreOrderItem::class);
    }
}
