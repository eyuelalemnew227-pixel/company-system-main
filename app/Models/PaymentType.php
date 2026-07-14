<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentType extends Model
{
    protected $guarded = [];

    public function category()
    {
        return $this->belongsTo(PaymentCategory::class, 'payment_category_id');
    }
}
