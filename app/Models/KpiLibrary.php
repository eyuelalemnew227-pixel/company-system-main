<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KpiLibrary extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'weight',
        'description',
        'created_by',
    ];

    protected $casts = [
        'weight' => 'float',
    ];

    public function forms()
    {
        return $this->belongsToMany(Form::class, 'form_kpi_library')
            ->withTimestamps();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
