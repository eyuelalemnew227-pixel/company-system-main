<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramBroadcastHistory extends Model
{
    use HasFactory;

    protected $table = 'telegram_broadcast_histories';

    protected $fillable = [
        'sender_id',
        'sender_name',
        'department_id',
        'department_name',
        'branch_id',
        'branch_name',
        'target_audience',
        'title',
        'message',
        'recipients_count',
        'sent_count',
    ];

    protected $casts = [
        'recipients_count' => 'integer',
        'sent_count' => 'integer',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
