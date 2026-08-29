<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PreOrderPaymentSetting extends Model
{
    protected $fillable = [
        'payment_method',
        'account_name',
        'account_number',
        'instructions',
        'validation_pattern',
        'example',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
