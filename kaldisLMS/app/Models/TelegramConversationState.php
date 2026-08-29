<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class TelegramConversationState extends Model
{
    use HasUlids;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['chat_id', 'step', 'data', 'updated_at'];

    protected $casts = [
        'data' => 'array',
        'updated_at' => 'datetime',
    ];
}
