<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KpiItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];

    public function kpiLibraries()
    {
        return $this->hasMany(KpiLibrary::class, 'kpi_item_id');
    }
}
