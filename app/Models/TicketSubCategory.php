<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketSubCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_main_category_id',
        'child_category_id',
        'spare_part_category_id',
        'name',
        'is_active',
    ];

    public function childCategory(): BelongsTo
    {
        return $this->belongsTo(ChildCategory::class);
    }


    public function mainCategory(): BelongsTo
    {
        return $this->belongsTo(TicketMainCategory::class, 'ticket_main_category_id');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(TicketAsset::class);
    }
}
