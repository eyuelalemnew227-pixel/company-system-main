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
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'walkin_price' => 'decimal:2',
    ];

    public function preOrderItems()
    {
        return $this->hasMany(PreOrderItem::class);
    }
}
