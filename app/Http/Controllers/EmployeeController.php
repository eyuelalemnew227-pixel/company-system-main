<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Position;
use App\Models\Image;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    public function index()
    {
        $query = Employee::with(['branch', 'department', 'position', 'image']);

        if ($search = request('search')) {
            $query->where('employee_code', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }

        return Inertia::render('employees/index', [
            'employees' => $query->paginate(15)->withQueryString()->through(function ($employee) {
                return [
                    'id' => $employee->id,
                    'employee_code' => $employee->employee_code,
                    'first_name' => $employee->first_name,
                    'last_name' => $employee->last_name,
                    'branch' => $employee->branch ? $employee->branch->name : null,
                    'department' => $employee->department ? $employee->department->name : null,
                    'position' => $employee->position ? $employee->position->title : null,
                    'status' => $employee->status,
                    'created_at' => $employee->created_at->format('d-m-Y'),
                    'image_path' => $employee->image ? $employee->image->path : null,
                ];
            }),
            'request' => request()->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('employees/create', [
            'branches' => Branch::all()->map(function ($branch) {
                return ['id' => $branch->id, 'name' => $branch->name];
            }),
            'departments' => Department::all()->map(function ($department) {
                return ['id' => $department->id, 'name' => $department->name];
            }),
            'positions' => Position::all()->map(function ($position) {
                return ['id' => $position->id, 'title' => $position->title];
            }),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_code' => 'required|string|max:50|unique:employees,employee_code',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => 'nullable|string|max:20',
            'gender' => 'required|in:male,female',
            'date_of_birth' => 'nullable|date',
            'email' => 'nullable|email|max:255',
            'hire_date' => 'nullable|date',
            'image' => 'nullable|image|mimes:jpeg,png,jpg|max:2048', // 2MB max
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'required|exists:departments,id',
            'position_id' => 'required|exists:positions,id',
            'status' => 'required|in:active,inactive,terminated',
        ]);

        // First create the employee record
        $employee = Employee::create($request->only([
            'employee_code',
            'first_name',
            'last_name',
            'phone',
            'gender',
            'date_of_birth',
            'email',
            'hire_date',
            'branch_id',
            'department_id',
            'position_id',
            'status',
        ]));

        // Then handle image upload (so imageable_id can reference the employee)
        if ($request->hasFile('image')) {
            Log::info('Employee store: image upload detected', ['employee_id' => $employee->id, 'has_file' => true]);
            $path = $request->file('image')->store('images/employees', 'public');
            try {
                Log::info('Employee store: creating Image record', ['employee_id' => $employee->id, 'path' => $path]);
                $image = Image::create([
                    'path' => $path,
                    'imageable_type' => Employee::class,
                    'imageable_id' => $employee->id,
                ]);

                // attach image to employee
                $employee->image_id = $image->id;
                $employee->save();
            } catch (\Throwable $e) {
                Log::error('Failed to create Image record during employee store', [
                    'exception' => $e->getMessage(),
                    'employee_id' => $employee->id,
                    'path' => $path,
                    'request_has_file' => $request->hasFile('image'),
                ]);
                throw $e;
            }
        }

        // Create User account for the employee (if email is provided and status is active)
        if ($employee->email && $employee->status === 'active') {
            User::create([
                'employee_id' => $employee->id,
                'name' => $employee->first_name . ' ' . $employee->last_name,
                'email' => $employee->email,
                'password' => Hash::make('password123'), // Default password
            ]);
            Log::info('User account created for employee', ['employee_id' => $employee->id, 'email' => $employee->email]);
        }

        return to_route('employees.index')->with('message', 'Employee Created Successfully!');
    }

    public function edit(Employee $employee)
    {
        return Inertia::render('employees/edit', [
            'employee' => [
                'id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'first_name' => $employee->first_name,
                'last_name' => $employee->last_name,
                'phone' => $employee->phone,
                'gender' => $employee->gender,
                'date_of_birth' => $employee->date_of_birth,
                'email' => $employee->email,
                'hire_date' => $employee->hire_date,
                'image_id' => $employee->image_id,
                'image_path' => $employee->image ? $employee->image->path : null,
                'branch_id' => $employee->branch_id,
                'department_id' => $employee->department_id,
                'position_id' => $employee->position_id,
                'status' => $employee->status,
            ],
            'branches' => Branch::all()->map(function ($branch) {
                return ['id' => $branch->id, 'name' => $branch->name];
            }),
            'departments' => Department::all()->map(function ($department) {
                return ['id' => $department->id, 'name' => $department->name];
            }),
            'positions' => Position::all()->map(function ($position) {
                return ['id' => $position->id, 'title' => $position->title];
            }),
        ]);
    }

    public function update(Request $request, Employee $employee)
    {
        // Debug: log incoming request keys and file presence to diagnose image upload issues
        Log::info('Employee update request received', [
            'employee_id' => $employee->id,
            'request_keys' => array_keys($request->all()),
            'has_file_image' => $request->hasFile('image'),
            'files_count' => count($request->files->all()),
        ]);
        // If some required fields are missing (for example when only updating the image),
        // pre-fill them from the existing employee so validation won't fail.
        $defaults = [
            'employee_code' => $employee->employee_code,
            'first_name' => $employee->first_name,
            'last_name' => $employee->last_name,
            'phone' => $employee->phone,
            'gender' => $employee->gender,
            'date_of_birth' => $employee->date_of_birth,
            'email' => $employee->email,
            'hire_date' => $employee->hire_date,
            'branch_id' => $employee->branch_id,
            'department_id' => $employee->department_id,
            'position_id' => $employee->position_id,
            'status' => $employee->status,
        ];

        foreach ($defaults as $key => $value) {
            // treat empty strings and absent keys as missing so we pre-fill defaults
            if (!$request->filled($key)) {
                $request->merge([$key => $value]);
            }
        }

        $request->validate([
            'employee_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('employees', 'employee_code')->ignore($employee->id),
            ],
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => 'nullable|string|max:20',
            'gender' => 'required|in:male,female',
            'date_of_birth' => 'nullable|date',
            'email' => 'nullable|email|max:255',
            'hire_date' => 'nullable|date',
            'image' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'required|exists:departments,id',
            'position_id' => 'required|exists:positions,id',
            'status' => 'required|in:active,inactive,terminated',
            'remove_image' => 'sometimes|boolean',
        ]);

        // If requested, remove existing image
        if ($request->boolean('remove_image')) {
            Log::info('Employee update: remove_image requested', ['employee_id' => $employee->id]);
            if ($employee->image) {
                Storage::disk('public')->delete($employee->image->path);
                $employee->image->delete();
            }
            $employee->image_id = null;
            $employee->save();
        }

        if ($request->hasFile('image')) {
            Log::info('Employee update: new image uploaded', ['employee_id' => $employee->id, 'has_file' => true]);
            // Delete old image if it exists
            if ($employee->image) {
                Storage::disk('public')->delete($employee->image->path);
                $employee->image->delete();
            }
            $path = $request->file('image')->store('images/employees', 'public');
            try {
                Log::info('Employee update: creating Image record', ['employee_id' => $employee->id, 'path' => $path]);
                $image = Image::create([
                    'path' => $path,
                    'imageable_type' => Employee::class,
                    'imageable_id' => $employee->id,
                ]);

                $employee->image_id = $image->id;
                $employee->save();
            } catch (\Throwable $e) {
                Log::error('Failed to create Image record during employee update', [
                    'exception' => $e->getMessage(),
                    'employee_id' => $employee->id,
                    'path' => $path,
                    'request_has_file' => $request->hasFile('image'),
                ]);
                throw $e;
            }
        }

        // Update only submitted fields
        $employee->update($request->only([
            'employee_code',
            'first_name',
            'last_name',
            'phone',
            'gender',
            'date_of_birth',
            'email',
            'hire_date',
            'branch_id',
            'department_id',
            'position_id',
            'status',
        ]));

        // Handle User account creation/update
        if ($employee->email && $employee->status === 'active') {
            $user = $employee->user;
            if ($user) {
                // Update existing user
                $user->update([
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'email' => $employee->email,
                ]);
                Log::info('User account updated for employee', ['employee_id' => $employee->id]);
            } else {
                // Create new user if doesn't exist
                User::create([
                    'employee_id' => $employee->id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'email' => $employee->email,
                    'password' => Hash::make('password123'), // Default password
                ]);
                Log::info('User account created for employee during update', ['employee_id' => $employee->id]);
            }
        } elseif ($employee->status !== 'active' && $employee->user) {
            // Optionally, you could deactivate/delete the user account when status is not active
            // For now, we'll just log it
            Log::info('Employee status changed to inactive, user account still exists', ['employee_id' => $employee->id]);
        }

        return to_route('employees.index')->with('message', 'Employee Updated Successfully!');
    }

    public function destroy(Employee $employee)
    {
        if ($employee->image) {
            Storage::disk('public')->delete($employee->image->path);
            $employee->image->delete();
        }
        $employee->delete();
        return to_route('employees.index')->with('message', 'Employee Deleted Successfully!');
    }
}