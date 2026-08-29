<?php

namespace App\Http\Controllers;

use App\Support\PermissionCategoryHelper;
use App\Models\User;
use App\Models\Employee;
use App\Models\Branch;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller {
    public function index() {
        $query = User::query()->with(['employee.branch', 'employee.department']);

        if ($search = request('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($q) use ($search) {
                        $q->where('employee_code', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
                    });
            });
        }

        if ($branchId = request('branch_id')) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        if ($departmentId = request('department_id')) {
            $query->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        if ($role = request('role')) {
            $query->whereHas('roles', function ($q) use ($role) {
                $q->where('name', $role);
            });
        }

        $branches = Branch::with('departments')
            ->get()
            ->map(function ($branch) {
                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'departments' => $branch->departments->map(function ($department) {
                        return [
                            'id' => $department->id,
                            'name' => $department->name,
                        ];
                    })->toArray(),
                ];
            });

        $departments = Department::select('id', 'name')->get();

        $roles = Role::select('name')->get()->pluck('name');

        $users = $query->latest()->paginate(10)
            ->withQueryString()
            ->through(fn($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at->format('d-m-Y'),
                'roles' => $user->roles->pluck('name'),
                'employee' => $user->employee ? [
                    'employee_code' => $user->employee->employee_code,
                    'first_name' => $user->employee->first_name,
                    'last_name' => $user->employee->last_name,
                ] : null,
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'branches' => $branches,
            'departments' => $departments,
            'roles' => $roles,
            'request' => request()->only(['search', 'branch_id', 'department_id', 'role']),
        ]);
    }

    public function create() {
        // Get employees without user accounts
        $employees = Employee::whereDoesntHave('user')->get()->map(fn($employee) => [
            'id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'name' => "{$employee->first_name} {$employee->last_name}",
        ]);

        $rolesWithPermissions = Role::with('permissions')->get()->mapWithKeys(function ($role) {
            $perms = $role->permissions->pluck('name')->toArray();
            return [
                $role->name => [
                    'permissions' => $perms,
                    'grouped' => PermissionCategoryHelper::groupPermissions($perms),
                ]
            ];
        });

        return Inertia::render('users/create', [
            'roles' => Role::all()->pluck('name'),
            'rolesWithPermissions' => $rolesWithPermissions,
            'employees' => $employees,
        ]);
    }

    public function store(Request $request) {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'roles' => 'array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $user = User::create([
            'employee_id' => $request->employee_id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
        ]);

        if ($request->roles) {
            $user->syncRoles($request->roles);
        }

        return to_route('users.index')->with('message', 'User Created Successfully!');
    }

    public function edit(User $user) {
        $employees = Employee::whereDoesntHave('user')->orWhere('id', $user->employee_id)->get()->map(fn($employee) => [
            'id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'name' => "{$employee->first_name} {$employee->last_name}",
        ]);

        $rolesWithPermissions = Role::with('permissions')->get()->mapWithKeys(function ($role) {
            $perms = $role->permissions->pluck('name')->toArray();
            return [
                $role->name => [
                    'permissions' => $perms,
                    'grouped' => PermissionCategoryHelper::groupPermissions($perms),
                ]
            ];
        });

        return Inertia::render('users/edit', [
            'user' => [
                'id' => $user->id,
                'employee_id' => $user->employee_id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'employee' => $user->employee ? [
                    'id' => $user->employee->id,
                    'employee_code' => $user->employee->employee_code,
                    'name' => "{$user->employee->first_name} {$user->employee->last_name}",
                ] : null,
            ],
            'roles' => Role::all()->pluck('name'),
            'rolesWithPermissions' => $rolesWithPermissions,
            'employees' => $employees,
        ]);
    }

    public function update(Request $request, User $user) {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:8',
            'roles' => 'array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $updateData = [
            'employee_id' => $request->employee_id,
            'name' => $request->name,
            'email' => $request->email,
        ];

        // Only update password if it's provided
        if ($request->filled('password')) {
            $updateData['password'] = bcrypt($request->password);
        }

        $user->update($updateData);

        if ($request->roles) {
            $user->syncRoles($request->roles);
        }

        return to_route('users.index')->with('message', 'User Updated Successfully!');
    }

    public function destroy(User $user) {
        $user->delete();
        return to_route('users.index')->with('message', 'User Deleted Successfully!');
    }

    public function export(Request $request)
    {
        $query = User::query()->with(['employee.branch', 'employee.department', 'roles']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($q) use ($search) {
                        $q->where('employee_code', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
                    });
            });
        }

        if ($branchId = $request->query('branch_id')) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        if ($departmentId = $request->query('department_id')) {
            $query->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        if ($role = $request->query('role')) {
            $query->whereHas('roles', function ($q) use ($role) {
                $q->where('name', $role);
            });
        }

        $users = $query->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="users-' . date('Y-m-d') . '.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($users) {
            $out = fopen('php://output', 'w');
            if ($out === false) { return; }
            
            // Header row
            fputcsv($out, ['ID', 'User Name', 'Email', 'Employee Code', 'Employee Name', 'Branch', 'Department', 'Roles', 'Created At']);
            
            // Data rows
            foreach ($users as $user) {
                fputcsv($out, [
                    $user->id,
                    $user->name,
                    $user->email,
                    $user->employee ? $user->employee->employee_code : '',
                    $user->employee ? trim(($user->employee->first_name ?? '') . ' ' . ($user->employee->last_name ?? '')) : '',
                    $user->employee && $user->employee->branch ? $user->employee->branch->name : '',
                    $user->employee && $user->employee->department ? $user->employee->department->name : '',
                    implode(', ', $user->roles->pluck('name')->toArray()),
                    $user->created_at->format('Y-m-d'),
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }
}