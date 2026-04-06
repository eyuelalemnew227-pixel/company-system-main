<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class Product extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saved(fn() => Cache::forget('products_active'));
        static::deleted(fn() => Cache::forget('products_active'));
    }

    protected $fillable = [
        'product_name',
        'product_code',
        'unit_cost',
        'child_category_id',
        'min_count_threshold',
        'max_count_threshold',
        'variance_percentage',
        'measurement',
        'status',
        'is_purchasable',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'min_count_threshold' => 'decimal:2',
        'max_count_threshold' => 'decimal:2',
        'variance_percentage' => 'decimal:2',
        'measurement' => 'decimal:2',
        'is_purchasable' => 'boolean',
    ];

    /**
     * @return BelongsTo<ChildCategory, Product>
     */
    public function childCategory(): BelongsTo
    {
        return $this->belongsTo(ChildCategory::class);
    }
}


