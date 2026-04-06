<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SparePartCategory extends Model
{
    protected $fillable = [
        'name',
    ];

    public function spareParts(): HasMany
    {
        return $this->hasMany(SparePart::class);
    }
}
