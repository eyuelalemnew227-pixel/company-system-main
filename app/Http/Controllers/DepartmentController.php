<?php

// Controller file: app/Http/Controllers/DepartmentController.php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $departments = Department::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
            })
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('departments/index', [
            'departments' => $departments,
            'request' => $request->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('departments/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'is_active_on_ticketing' => 'boolean',
        ]);

        Department::create($validated);

        return redirect()->route('departments.index')
            ->with('message', 'Department created successfully!');
    }

    public function edit(Department $department)
    {
        return Inertia::render('departments/edit', [
            'department' => $department,
        ]);
    }

    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'is_active_on_ticketing' => 'boolean',
        ]);

        $department->update($validated);

        return redirect()->route('departments.index')
            ->with('message', 'Department updated successfully!');
    }

    public function destroy(Department $department)
    {
        $department->delete();

        return redirect()->route('departments.index')
            ->with('message', 'Department deleted successfully!');
    }
}
