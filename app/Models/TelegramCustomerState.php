<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TelegramCustomerState extends Model
{
    protected $primaryKey = 'chat_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'chat_id',
        'state',
        'temp_data',
    ];

    protected $casts = [
        'temp_data' => 'array',
    ];
}
