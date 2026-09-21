<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KpiLibrary extends Model
{
    use HasFactory;

    protected $fillable = [
        'kpi_role_id',
        'kpi_item_id',
        'name',
        'weight',
        'description',
        'created_by',
    ];

    protected $casts = [
        'weight' => 'float',
    ];

    public function kpiRole()
    {
        return $this->belongsTo(KpiRole::class, 'kpi_role_id');
    }

    public function kpiItem()
    {
        return $this->belongsTo(KpiItem::class, 'kpi_item_id');
    }

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
