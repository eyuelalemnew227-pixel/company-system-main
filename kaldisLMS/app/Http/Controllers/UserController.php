<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Role;
use App\Models\TelegramAccount;
use App\Models\TelegramRegistration;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('permission', 'user.view');

        $query = User::with(['role', 'employee.branch', 'employee.department'])->orderByDesc('created_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('employee', fn ($e) => $e->where('employee_number', 'like', "%{$search}%"));
            });
        }
        if ($roleId = $request->query('roleId')) {
            $query->where('role_id', $roleId);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($branchId = $request->query('branchId')) {
            $query->whereHas('employee', fn ($e) => $e->where('branch_id', $branchId));
        }

        $users = $query->limit(500)->get()->map(fn (User $u) => $this->present($u));

        $canApprove = $request->user()->hasPermission('user.approve');

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => Role::orderBy('name')->get(['id', 'name', 'slug']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name', 'branch_id']),
            'filters' => $request->only(['search', 'roleId', 'branchId', 'status']),
            'can' => [
                'create' => $request->user()->hasPermission('user.create'),
                'edit' => $request->user()->hasPermission('user.edit'),
                'delete' => $request->user()->hasPermission('user.delete'),
                'approve' => $canApprove,
            ],
            'pendingRegistrations' => $canApprove
                ? TelegramRegistration::where('status', 'pending')->with('branch')->orderBy('created_at')->get()
                    ->map(fn (TelegramRegistration $r) => [
                        'id' => $r->id, 'firstName' => $r->first_name, 'lastName' => $r->last_name,
                        'email' => $r->email, 'phone' => $r->phone, 'branch' => $r->branch?->name,
                        'createdAt' => $r->created_at,
                    ])
                : [],
        ]);
    }

    public function approveRegistration(Request $request, TelegramRegistration $registration, NotificationService $notifications)
    {
        Gate::authorize('permission', 'user.approve');
        abort_if($registration->status !== 'pending', 400, 'This request has already been reviewed.');

        $role = Role::where('slug', 'employee')->firstOrFail();

        $user = User::create([
            'name' => trim("{$registration->first_name} {$registration->last_name}"),
            'email' => $registration->email,
            'password' => Str::password(16),
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_number' => $this->nextEmployeeNumber(),
            'first_name' => $registration->first_name,
            'last_name' => $registration->last_name,
            'branch_id' => $registration->branch_id,
            'phone' => $registration->phone,
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $registration->update(['status' => 'approved', 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);

        TelegramAccount::where('chat_id', $registration->chat_id)->update([
            'employee_id' => $employee->id,
            'is_verified' => true,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'approve_registration', 'module' => 'users',
            'entity_type' => 'User', 'entity_id' => $user->id, 'new_value' => $user->email,
        ]);

        $notifications->send($employee, 'system', "You're approved!", 'Your Kaldi Academy account has been approved. Use the "Forgot password" link on the login page to set your password and get started.');

        return back()->with('success', 'Registration approved — account created.');
    }

    public function rejectRegistration(Request $request, TelegramRegistration $registration)
    {
        Gate::authorize('permission', 'user.approve');
        abort_if($registration->status !== 'pending', 400, 'This request has already been reviewed.');

        $registration->update(['status' => 'rejected', 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);

        app(\App\Services\TelegramService::class)->sendMessage(
            $registration->chat_id,
            'Your Kaldi Academy registration request was not approved. Contact your training manager for more information.'
        );

        return back()->with('success', 'Registration rejected.');
    }

    private function nextEmployeeNumber(): string
    {
        $max = Employee::where('employee_number', 'like', 'KC-%')
            ->get(['employee_number'])
            ->map(fn (Employee $e) => (int) substr($e->employee_number, 3))
            ->max() ?? 0;

        return 'KC-'.str_pad((string) ($max + 1), 4, '0', STR_PAD_LEFT);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'user.create');

        $data = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role_id' => ['required', 'exists:roles,id'],
            'employee_number' => ['nullable', 'string', 'unique:employees,employee_number'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'position' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'hire_date' => ['nullable', 'date'],
        ]);

        $parts = preg_split('/\s+/', trim($data['name']), 2);
        $firstName = $parts[0];
        $lastName = $parts[1] ?? $parts[0];

        $user = User::create([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'password' => $data['password'],
            'role_id' => $data['role_id'],
            'status' => 'active',
        ]);

        if (! empty($data['employee_number'])) {
            Employee::create([
                'user_id' => $user->id,
                'employee_number' => $data['employee_number'],
                'first_name' => $firstName,
                'last_name' => $lastName,
                'branch_id' => $data['branch_id'] ?? null,
                'department_id' => $data['department_id'] ?? null,
                'position' => $data['position'] ?? null,
                'phone' => $data['phone'] ?? null,
                'hire_date' => $data['hire_date'] ?? now(),
                'status' => 'active',
            ]);
        }

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'create_user', 'module' => 'users',
            'entity_type' => 'User', 'entity_id' => $user->id, 'new_value' => $user->email,
        ]);

        return back()->with('success', 'User created.');
    }

    public function update(Request $request, User $targetUser)
    {
        Gate::authorize('permission', 'user.edit');

        $data = $request->validate([
            'name' => ['nullable', 'string'],
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($targetUser->id)],
            'role_id' => ['nullable', 'exists:roles,id'],
            'status' => ['nullable', Rule::in(['active', 'suspended', 'locked'])],
            'password' => ['nullable', 'string', 'min:6'],
            'employee_number' => ['nullable', 'string', Rule::unique('employees', 'employee_number')->ignore($targetUser->employee?->id)],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'position' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'hire_date' => ['nullable', 'date'],
        ]);

        $old = ['name' => $targetUser->name, 'role_id' => $targetUser->role_id, 'status' => $targetUser->status];

        $userData = array_filter([
            'name' => $data['name'] ?? null,
            'email' => isset($data['email']) ? strtolower(trim($data['email'])) : null,
            'role_id' => $data['role_id'] ?? null,
            'status' => $data['status'] ?? null,
        ], fn ($v) => $v !== null);
        if (! empty($data['password'])) {
            $userData['password'] = $data['password'];
        }
        $targetUser->update($userData);

        if ($targetUser->employee) {
            $empData = array_filter([
                'branch_id' => array_key_exists('branch_id', $data) ? $data['branch_id'] : null,
                'department_id' => array_key_exists('department_id', $data) ? $data['department_id'] : null,
                'position' => $data['position'] ?? null,
                'phone' => $data['phone'] ?? null,
                'employee_number' => $data['employee_number'] ?? null,
                'hire_date' => $data['hire_date'] ?? null,
            ], fn ($v) => $v !== null);
            if ($empData) {
                $targetUser->employee->update($empData);
            }
        } elseif (! empty($data['employee_number'])) {
            $parts = preg_split('/\s+/', trim($data['name'] ?? $targetUser->name), 2);
            Employee::create([
                'user_id' => $targetUser->id,
                'employee_number' => $data['employee_number'],
                'first_name' => $parts[0], 'last_name' => $parts[1] ?? $parts[0],
                'branch_id' => $data['branch_id'] ?? null, 'department_id' => $data['department_id'] ?? null,
                'position' => $data['position'] ?? null, 'phone' => $data['phone'] ?? null,
                'hire_date' => $data['hire_date'] ?? now(), 'status' => 'active',
            ]);
        }

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'update_user', 'module' => 'users',
            'entity_type' => 'User', 'entity_id' => $targetUser->id,
            'old_value' => json_encode($old), 'new_value' => json_encode($request->only(['name', 'role_id', 'status'])),
        ]);

        return back()->with('success', 'User updated.');
    }

    public function destroy(Request $request, User $targetUser)
    {
        Gate::authorize('permission', 'user.delete');
        abort_if($targetUser->id === $request->user()->id, 400, 'You cannot deactivate your own account.');

        $targetUser->update(['status' => 'suspended']);
        if ($targetUser->employee) {
            $targetUser->employee->update(['status' => 'suspended']);
        }

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'deactivate_user', 'module' => 'users',
            'entity_type' => 'User', 'entity_id' => $targetUser->id, 'new_value' => 'suspended',
        ]);

        return back()->with('success', 'User deactivated.');
    }

    private function present(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'status' => $u->status,
            'lastLogin' => $u->last_login, 'createdAt' => $u->created_at, 'roleId' => $u->role_id,
            'role' => $u->role ? ['id' => $u->role->id, 'name' => $u->role->name, 'slug' => $u->role->slug, 'isSystem' => $u->role->is_system] : null,
            'employee' => $u->employee ? [
                'id' => $u->employee->id, 'employeeNumber' => $u->employee->employee_number, 'position' => $u->employee->position,
                'phone' => $u->employee->phone, 'hireDate' => $u->employee->hire_date, 'status' => $u->employee->status,
                'totalPoints' => $u->employee->total_points, 'firstName' => $u->employee->first_name, 'lastName' => $u->employee->last_name,
                'branch' => $u->employee->branch ? ['id' => $u->employee->branch->id, 'name' => $u->employee->branch->name, 'code' => $u->employee->branch->code] : null,
                'department' => $u->employee->department ? ['id' => $u->employee->department->id, 'name' => $u->employee->department->name, 'code' => $u->employee->department->code] : null,
            ] : null,
        ];
    }
}
