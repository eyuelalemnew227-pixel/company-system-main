<?php

namespace App\Models\Training;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SopDocument extends Model
{
    use HasFactory;

    protected $table = 'training_sop_documents';

    protected $fillable = [
        'title',
        'version',
        'category',
        'file_path',
        'content',
        'effective_date',
        'requires_acknowledgement',
        'status',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'requires_acknowledgement' => 'boolean',
    ];

    public function acknowledgements(): HasMany
    {
        return $this->hasMany(SopAcknowledgement::class, 'sop_id');
    }
}
