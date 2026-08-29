<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Badge extends Model
{
    use HasUlids;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = ['name', 'description', 'icon', 'criteria_type', 'criteria_value', 'points'];

    public function employeeBadges(): HasMany
    {
        return $this->hasMany(EmployeeBadge::class);
    }
}
