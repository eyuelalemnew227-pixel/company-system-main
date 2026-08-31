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
        'payment_type',
        'validation_type',
        'validation_pattern',
        'example',
        'reference_prefix',
        'auto_fill_prefix',
        'reference_length',
        'reference_required',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'auto_fill_prefix' => 'boolean',
        'reference_required' => 'boolean',
    ];

}
