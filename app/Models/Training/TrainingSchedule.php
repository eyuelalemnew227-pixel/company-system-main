<?php

namespace App\Models\Training;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'schedule_date',
        'venue',
        'created_by_user_id',
        'status',
        'notes',
    ];

    protected $casts = [
        'schedule_date' => 'date:Y-m-d',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function items()
    {
        return $this->hasMany(TrainingScheduleItem::class)->orderBy('order_no', 'asc');
    }
}
