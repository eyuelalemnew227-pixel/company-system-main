<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketMainCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'name',
        'is_active',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function subCategories(): HasMany
    {
        return $this->hasMany(TicketSubCategory::class);
    }
}
