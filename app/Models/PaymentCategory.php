<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentCategory extends Model
{
    protected $guarded = [];

    public function weeklyBudgets()
    {
        return $this->hasMany(WeeklyBudget::class, 'payment_category_id');
    }
}
