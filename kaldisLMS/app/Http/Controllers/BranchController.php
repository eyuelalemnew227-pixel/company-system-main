<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('permission', 'branch.manage');

        $branches = Branch::withCount(['employees', 'departments'])
            ->with(['departments' => fn ($q) => $q->withCount('employees')->orderBy('name')])
            ->orderBy('name')->get()
            ->map(fn (Branch $b) => [
                'id' => $b->id, 'name' => $b->name, 'code' => $b->code, 'address' => $b->address,
                'city' => $b->city, 'region' => $b->region, 'phone' => $b->phone, 'managerId' => $b->manager_id,
                'status' => $b->status, 'createdAt' => $b->created_at,
                'employeeCount' => $b->employees_count, 'departmentCount' => $b->departments_count,
                'departments' => $b->departments->map(fn (Department $d) => [
                    'id' => $d->id, 'name' => $d->name, 'code' => $d->code, 'headId' => $d->head_id,
                    'status' => $d->status, 'employeeCount' => $d->employees_count, 'createdAt' => $d->created_at,
                ]),
            ]);

        return Inertia::render('Branches/Index', ['branches' => $branches]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'branch.manage');

        $data = $request->validate([
            'name' => ['required', 'string'],
            'code' => ['required', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'region' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
        ]);

        $code = strtoupper(trim($data['code']));
        abort_if(Branch::where('name', $data['name'])->orWhere('code', $code)->exists(), 422, 'Branch name or code already exists');

        $branch = Branch::create([
            'name' => trim($data['name']), 'code' => $code, 'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null, 'region' => $data['region'] ?? null, 'phone' => $data['phone'] ?? null, 'status' => 'active',
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'create_branch', 'module' => 'organization',
            'entity_type' => 'Branch', 'entity_id' => $branch->id, 'new_value' => json_encode(['name' => $branch->name, 'code' => $branch->code]),
        ]);

        return back()->with('success', 'Branch created.');
    }

    public function update(Request $request, Branch $branch)
    {
        Gate::authorize('permission', 'branch.manage');

        $data = $request->validate([
            'name' => ['nullable', 'string'],
            'code' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'region' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        if (! empty($data['code'])) {
            $code = strtoupper(trim($data['code']));
            abort_if(Branch::where('code', $code)->where('id', '!=', $branch->id)->exists(), 422, 'Code already in use');
            $data['code'] = $code;
        }

        $old = ['name' => $branch->name, 'code' => $branch->code];
        $branch->update(array_filter($data, fn ($v) => $v !== null));

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'update_branch', 'module' => 'organization',
            'entity_type' => 'Branch', 'entity_id' => $branch->id,
            'old_value' => json_encode($old), 'new_value' => json_encode(['name' => $branch->name, 'code' => $branch->code]),
        ]);

        return back()->with('success', 'Branch updated.');
    }

    public function storeDepartment(Request $request, Branch $branch)
    {
        Gate::authorize('permission', 'branch.manage');

        $data = $request->validate([
            'name' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $code = strtoupper(trim($data['code']));
        abort_if(Department::where('branch_id', $branch->id)->where('code', $code)->exists(), 422, 'Department code already exists in this branch');

        $dept = Department::create(['branch_id' => $branch->id, 'name' => trim($data['name']), 'code' => $code, 'status' => 'active']);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'create_department', 'module' => 'organization',
            'entity_type' => 'Department', 'entity_id' => $dept->id, 'new_value' => json_encode(['name' => $dept->name, 'code' => $dept->code, 'branchId' => $branch->id]),
        ]);

        return back()->with('success', 'Department created.');
    }
}
