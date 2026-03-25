<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExternalLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'external_link_section_id',
        'title',
        'href',
        'icon',
        'permission',
        'target',
        'rel',
        'is_external',
        'is_active',
        'sort',
        'created_by',
    ];

    protected $casts = [
        'is_external' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function section()
    {
        return $this->belongsTo(ExternalLinkSection::class, 'external_link_section_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
