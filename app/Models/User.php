<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
	/** @use HasFactory<\Database\Factories\UserFactory> */
	use HasFactory, Notifiable, HasRoles;

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var list<string>
	 */
	protected $fillable = [
		'employee_id',
		'name',
		'email',
		'password',
		'phone_number',
		'country_code',
		'is_paid_user',
		'sms_notifications_enabled',
	];

	/**
	 * The attributes that should be hidden for serialization.
	 *
	 * @var list<string>
	 */
	protected $hidden = [
		// keep employee_id visible if needed by front-end; remove from hidden
		'password',
		'remember_token',
	];

	/**
	 * The employee this user belongs to (if any).
	 */
	public function employee(): BelongsTo
	{
		return $this->belongsTo(Employee::class);
	}

	/**
	 * Evaluation responses where this user is the evaluator.
	 */
	public function evaluatorResponses(): HasMany
	{
		return $this->hasMany(EvaluationResponse::class, 'evaluator_id');
	}

	/**
	 * Evaluation responses where this user is being evaluated.
	 */
	public function evaluateeResponses(): HasMany
	{
		return $this->hasMany(EvaluationResponse::class, 'evaluate_id');
	}
	/**
	 * Get the attributes that should be cast.
	 *
	 * @return array<string, string>
	 */
	protected function casts(): array
	{
		return [
			'email_verified_at' => 'datetime',
			'password' => 'hashed',
			'is_paid_user' => 'boolean',
			'sms_notifications_enabled' => 'boolean',
		];
	}

    public function isManagerOfDepartment(int $departmentId): bool
    {
        if (!$this->employee_id) {
            return false;
        }

        return \Illuminate\Support\Facades\DB::table('managers')
            ->join('employees', 'managers.employee_id', '=', 'employees.id')
            ->where('employees.department_id', $departmentId)
            ->where('managers.employee_id', $this->employee_id)
            ->exists();
    }

    public function managedDepartmentIds(): array
    {
        if (!$this->employee_id) {
            return [];
        }

        return \Illuminate\Support\Facades\DB::table('managers')
            ->join('employees', 'managers.employee_id', '=', 'employees.id')
            ->where('managers.employee_id', $this->employee_id)
            ->pluck('employees.department_id')
            ->toArray();
    }
}
