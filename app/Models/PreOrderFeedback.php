<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreOrderFeedback extends Model
{
    use HasFactory;

    protected $table = 'pre_order_feedback';

    protected $fillable = [
        'chat_id',
        'branch_id',
        'delivery_rating',
        'torta_rating',
        'service_rating',
        'written_feedback',
    ];

    protected $casts = [
        'delivery_rating' => 'integer',
        'torta_rating' => 'integer',
        'service_rating' => 'integer',
    ];

    protected $appends = [
        'customer_name',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(TelegramCustomer::class, 'chat_id', 'chat_id');
    }

    public function getCustomerNameAttribute(): string
    {
        if ($this->relationLoaded('customer') && $this->customer) {
            $name = trim(($this->customer->first_name ?? '') . ' ' . ($this->customer->last_name ?? ''));
            if (!empty($name)) {
                return $name;
            }
            if (!empty($this->customer->username)) {
                return '@' . $this->customer->username;
            }
            if (!empty($this->customer->phone_number)) {
                return $this->customer->phone_number;
            }
        }

        $cust = $this->customer;
        if ($cust) {
            $name = trim(($cust->first_name ?? '') . ' ' . ($cust->last_name ?? ''));
            if (!empty($name)) {
                return $name;
            }
            if (!empty($cust->username)) {
                return '@' . $cust->username;
            }
            if (!empty($cust->phone_number)) {
                return $cust->phone_number;
            }
        }

        if (!empty($this->chat_id)) {
            $order = PreOrder::where('chat_id', $this->chat_id)
                ->whereNotNull('customer_name')
                ->where('customer_name', '!=', '')
                ->latest()
                ->first();
            if ($order && !empty($order->customer_name)) {
                return $order->customer_name;
            }
            return "Customer (#{$this->chat_id})";
        }

        return 'Guest Customer';
    }
}
