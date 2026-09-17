<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Role;

class KpiLibrary extends Model
{
    use HasFactory;

    protected $fillable = [
        'role_id',
        'kpi_item_id',
        'name',
        'weight',
        'description',
        'created_by',
    ];

    protected $casts = [
        'weight' => 'float',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
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
