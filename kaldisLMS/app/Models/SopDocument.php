<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SopDocument extends Model
{
    use HasUlids;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $table = 'sop_documents';

    protected $fillable = [
        'title', 'version', 'category', 'file_path', 'content',
        'effective_date', 'requires_acknowledgement', 'status',
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
