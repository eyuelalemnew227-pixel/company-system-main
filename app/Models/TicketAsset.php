<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'ticket_main_category_id',
        'ticket_sub_category_id',
        'name',
        'article_code',
        'bar_code',
        'is_active',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(TicketSubCategory::class, 'ticket_sub_category_id');
    }

    public function mainCategory(): BelongsTo
    {
        return $this->belongsTo(TicketMainCategory::class, 'ticket_main_category_id');
    }
}
