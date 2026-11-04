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
        'tab_type',
        'category_name',
        'item_code',
        'item_name',
        'unit_of_measure',
        'article_id',
        'child_category_id',
        'product_id',
        'main_store_balance',
        'inspected_quantity',
        'expiry_date',
        'wac',
        'status',
        'remarks',
    ];

    protected $casts = [
        'main_store_balance' => 'decimal:2',
        'inspected_quantity' => 'decimal:2',
        'expiry_date' => 'date:Y-m-d',
        'wac' => 'decimal:4',
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
