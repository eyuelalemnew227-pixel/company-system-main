<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller {
    public function index() {
        $query = User::query()->with('employee');

        if ($search = request('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($q) use ($search) {
                        $q->where('employee_code', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        $users = $query->latest()->paginate(5)
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
            'request' => request()->only('search'),
        ]);
    }

    public function create() {
        // Get employees without user accounts
        $employees = Employee::whereDoesntHave('user')->get()->map(fn($employee) => [
            'id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'name' => "{$employee->first_name} {$employee->last_name}",
        ]);

        return Inertia::render('users/create', [
            'roles' => Role::all()->pluck('name'),
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
            'roles' => 'array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $user->update([
            'employee_id' => $request->employee_id,
            'name' => $request->name,
            'email' => $request->email,
        ]);

        if ($request->roles) {
            $user->syncRoles($request->roles);
        }

        return to_route('users.index')->with('message', 'User Updated Successfully!');
    }

    public function destroy(User $user) {
        $user->delete();
        return to_route('users.index')->with('message', 'User Deleted Successfully!');
    }
}