<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreOrderFeedback extends Model
{
    use HasFactory;

    protected $table = 'pre_order_feedback';

    protected $fillable = [
        'chat_id',
        'branch_id',
        'delivery_rating',
        'torta_rating',
        'service_rating',
        'written_feedback',
    ];

    protected $casts = [
        'delivery_rating' => 'integer',
        'torta_rating' => 'integer',
        'service_rating' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
