<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PreOrderProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_name',
        'unit_price',
        'walkin_price',
        'status',
        'has_discount',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'walkin_price' => 'decimal:2',
        'has_discount' => 'boolean',
    ];

    public function preOrderItems()
    {
        return $this->hasMany(PreOrderItem::class);
    }
}
