<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'chat_id',
        'username',
        'group_type',
        'category',
        'purpose',
        'description',
        'branch_id',
        'department_id',
        'managed_by',
        'created_by',
        'status',
        'invite_link',
        'qr_code_path',
        'is_public',
        'member_count',
        'link_generated_at',
        'notes',
        'ticket_id',
    ];

    protected $casts = [
        'is_public'          => 'boolean',
        'member_count'       => 'integer',
        'link_generated_at'  => 'datetime',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get a clean Telegram public link (https://t.me/username or https://t.me/+hash)
     */
    public function getTelegramUrlAttribute(): ?string
    {
        if ($this->username) {
            return 'https://t.me/' . ltrim($this->username, '@');
        }
        if ($this->invite_link) {
            return $this->invite_link;
        }
        return null;
    }

    /**
     * Scope: Active groups only
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }
}
