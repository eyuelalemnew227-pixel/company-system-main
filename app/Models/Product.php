<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_name',
        'product_code',
        'unit_cost',
        'child_category_id',
        'min_count_threshold',
        'max_count_threshold',
        'variance_percentage',
        'measurement',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'min_count_threshold' => 'decimal:2',
        'max_count_threshold' => 'decimal:2',
        'variance_percentage' => 'decimal:2',
        'measurement' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<ChildCategory, Product>
     */
    public function childCategory(): BelongsTo
    {
        return $this->belongsTo(ChildCategory::class);
    }
}


