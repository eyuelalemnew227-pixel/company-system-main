<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BranchController extends Controller
{
    public function index()
    {
        $query = Branch::with('departments');

        if ($search = request('search')) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('branch_code', 'like', "%{$search}%");
        }

        $branches = $query->paginate(5)->withQueryString()->through(function ($branch) {
                return [
                    'id' => $branch->id,
                    'branch_code' => $branch->branch_code,
                    'name' => $branch->name,
                    'location' => $branch->location,
                    'created_at' => $branch->created_at->format('d-m-Y'),
                    'departments' => $branch->departments->pluck('name')
                ];
        });

        return Inertia::render('branches/Index', [
            'branches' => $branches,
            'request' => request()->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('branches/Create', [
            'departments' => Department::all()->pluck('name'),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'branch_code' => 'required|string|max:50|unique:branches,branch_code',
            'name' => 'required|string|max:100',
            'location' => 'nullable|string|max:150',
            'contact_email' => 'nullable|email|max:150',
            'contact_phone' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'departments' => 'array',
            'departments.*' => 'string|exists:departments,name'
        ]);

        $branch = Branch::create($request->only([
            'branch_code',
            'name',
            'location',
            'contact_email',
            'contact_phone',
            'description',
        ]));

        if ($request->has('departments')) {
            $departmentIds = Department::whereIn('name', $request->departments)->pluck('id');
            $branch->departments()->sync($departmentIds);
        }

        return to_route('branches.index')->with('message', 'Branch Created Successfully!');
    }

    public function edit(Branch $branch)
    {
        $branch->load('departments');

        // normalize branch payload so frontend receives departments as string[]
        $branchPayload = [
            'id' => $branch->id,
            'branch_code' => $branch->branch_code,
            'name' => $branch->name,
            'location' => $branch->location,
            'contact_email' => $branch->contact_email,
            'contact_phone' => $branch->contact_phone,
            'description' => $branch->description,
            'created_at' => $branch->created_at?->format('d-m-Y'),
            'departments' => $branch->departments->pluck('name'),
        ];

        return Inertia::render('branches/Edit', [
            'branch' => $branchPayload,
            'departments' => Department::all()->pluck('name'),
        ]);
    }

    public function update(Request $request, Branch $branch)
    {
        $request->validate([
            'branch_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('branches', 'branch_code')->ignore($branch->id),
            ],
            'name' => 'required|string|max:100',
            'location' => 'nullable|string|max:150',
            'contact_email' => 'nullable|email|max:150',
            'contact_phone' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'departments' => 'array',
            'departments.*' => 'string|exists:departments,name'
        ]);

        $branch->update($request->only([
            'branch_code',
            'name',
            'location',
            'contact_email',
            'contact_phone',
            'description',
        ]));

        if ($request->has('departments')) {
            $departmentIds = Department::whereIn('name', $request->departments)->pluck('id');
            $branch->departments()->sync($departmentIds);
        }

        return to_route('branches.index')->with('message', 'Branch Updated Successfully!');
    }

    public function destroy(Branch $branch)
    {
        $branch->delete();
        return to_route('branches.index')->with('message', 'Branch Deleted Successfully!');
    }
}