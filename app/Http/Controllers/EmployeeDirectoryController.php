<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use Inertia\Inertia;
use Illuminate\Http\Request;

class EmployeeDirectoryController extends Controller
{
    private function formatPhone(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }

        $clean = preg_replace('/\\s+/', '', $phone);
        if (!$clean) {
            return null;
        }

        // If it already has a +, leave as-is
        if (str_starts_with($clean, '+')) {
            return $clean;
        }

        // Numbers starting with 0 -> replace leading 0 with +251
        if (str_starts_with($clean, '0')) {
            return '+251' . substr($clean, 1);
        }

        // Numbers starting with 9 -> prefix country code
        if (str_starts_with($clean, '9')) {
            return '+251' . $clean;
        }

        return $clean;
    }

    public function index(Request $request)
    {
        $query = Employee::with([
            'branch:id,name',
            'department:id,name',
            'position:id,title',
            'image:id,path',
        ])->select([
            'id',
            'employee_code',
            'first_name',
            'last_name',
            'phone',
            'email',
            'branch_id',
            'department_id',
            'position_id',
            'image_id',
        ]);

        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('employee_code', 'like', "%{$search}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
            });
        }

        if (($branchId = $request->input('branch_id')) && $branchId !== 'all') {
            $query->where('branch_id', $branchId);
        }

        if (($departmentId = $request->input('department_id')) && $departmentId !== 'all') {
            $query->where('department_id', $departmentId);
        }

        if (($positionId = $request->input('position_id')) && $positionId !== 'all') {
            $query->where('position_id', $positionId);
        }

        $employees = $query
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(12)
            ->withQueryString()
            ->through(function (Employee $employee) {
                return [
                    'id' => $employee->id,
                    'name' => trim($employee->first_name . ' ' . $employee->last_name),
                    'employee_code' => $employee->employee_code,
                    'phone' => $this->formatPhone($employee->phone),
                    'email' => $employee->email,
                    'branch' => $employee->branch?->name,
                    'department' => $employee->department?->name,
                    'position' => $employee->position?->title,
                    'avatar' => $employee->image?->path,
                ];
            });

        return Inertia::render('directory/index', [
            'employees' => $employees,
            'filters' => $request->only(['search', 'branch_id', 'department_id', 'position_id']),
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'positions' => Position::select('id', 'title')->orderBy('title')->get(),
        ]);
    }
}
