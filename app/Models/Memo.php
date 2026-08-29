<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Memo extends Model
{
    use HasFactory;

    protected $fillable = [
        'memo_id',
        'title',
        'memo_date',
        'sender_name',
        'sender_position',
        'recipient_name',
        'content',
        'priority',
        'departments',
        'cc_departments',
        'signature_type',
        'signature_data',
        'cc_signatures',
        'status',
        'telegram_status',
        'created_by',
        'created_by_username',
    ];

    protected $casts = [
        'memo_date' => 'date',
        'departments' => 'array',
        'cc_departments' => 'array',
        'cc_signatures' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
