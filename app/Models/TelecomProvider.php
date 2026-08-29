<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelecomProvider extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'support_contact',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function phoneNumbers(): HasMany
    {
        return $this->hasMany(TelecomPhoneNumber::class, 'telecom_provider_id');
    }

    public function broadbands(): HasMany
    {
        return $this->hasMany(TelecomBroadband::class, 'telecom_provider_id');
    }
}
