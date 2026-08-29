<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramCustomer extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'username',
        'first_name',
        'last_name',
        'phone_number',
        'language',
        'state',
    ];

    public function preOrders(): HasMany
    {
        return $this->hasMany(PreOrder::class, 'phone_number', 'phone_number');
    }
}
