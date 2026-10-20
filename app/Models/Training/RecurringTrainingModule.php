<?php

namespace App\Models\Training;

use App\Models\Department;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecurringTrainingModule extends Model
{
    use HasFactory;

    protected $table = 'recurring_training_modules';

    protected $fillable = [
        'training_name',
        'description',
        'conducting_department_id',
        'trainer_employee_id',
        'targeted_department_id',
    ];

    public function conductingDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'conducting_department_id');
    }

    public function trainerEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'trainer_employee_id');
    }

    public function targetedDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'targeted_department_id');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(TdKpiAssessment::class, 'training_module_id');
    }
}
