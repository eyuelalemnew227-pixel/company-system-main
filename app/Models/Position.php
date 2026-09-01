<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Position extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'level',
        'description',
    ];

    protected $appends = ['name'];

    public function getNameAttribute(): ?string
    {
        return $this->title;
    }
}
