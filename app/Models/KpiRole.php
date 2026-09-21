<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KpiRole extends Model
{
    use HasFactory;

    protected $table = 'kpi_roles';

    protected $fillable = [
        'name',
        'description',
    ];

    public function kpiLibraries()
    {
        return $this->hasMany(KpiLibrary::class, 'kpi_role_id');
    }
}
