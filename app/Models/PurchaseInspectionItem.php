<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseInspectionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_inspection_id',
        'child_category_id',
        'product_id',
        'main_store_balance',
        'inspected_quantity',
        'unit_of_measure',
        'status',
        'remarks',
    ];

    protected $casts = [
        'main_store_balance' => 'decimal:2',
        'inspected_quantity' => 'decimal:2',
    ];

    public function purchaseInspection(): BelongsTo
    {
        return $this->belongsTo(PurchaseInspection::class, 'purchase_inspection_id');
    }

    public function childCategory(): BelongsTo
    {
        return $this->belongsTo(ChildCategory::class, 'child_category_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
