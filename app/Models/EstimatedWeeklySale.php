<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EstimatedWeeklySale extends Model
{
    use HasFactory;

    protected $fillable = [
        'fiscal_year_id',
        'fiscal_month_id',
        'week_number',
        'amount',
        'created_by',
        'updated_by',
    ];

    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function fiscalMonth()
    {
        return $this->belongsTo(FiscalMonth::class);
    }

    public function bankBalances()
    {
        return $this->hasMany(BankBalance::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updator()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
