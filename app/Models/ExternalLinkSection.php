<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExternalLinkSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'label',
        'icon',
        'sort',
        'is_active',
    ];

    public function links()
    {
        return $this->hasMany(ExternalLink::class)->orderBy('sort');
    }
}
