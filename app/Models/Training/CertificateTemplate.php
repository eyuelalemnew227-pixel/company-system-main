<?php

namespace App\Models\Training;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CertificateTemplate extends Model
{
    use HasFactory;

    protected $table = 'training_certificate_templates';

    protected $fillable = [
        'name',
        'html_template',
        'background_image',
        'font_settings',
        'signature_image',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class, 'certificate_template_id');
    }
}
