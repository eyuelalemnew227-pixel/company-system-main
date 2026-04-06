<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SparePart extends Model
{
    protected $fillable = [
        'article_code',
        'name',
        'description',
        'spare_part_category_id',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(SparePartCategory::class, 'spare_part_category_id');
    }
}
