<?php

namespace App\Http\Controllers;

use App\Support\PermissionCategoryHelper;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller {
	/**
	 * Display a listing of the resource.
	 */
    public function index() {
        $query = Role::with('permissions');

        if ($search = request('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $roles = $query->paginate(10)->withQueryString()->through(function ($role) {
            $permissionNames = $role->permissions->pluck('name')->toArray();
            return [
                'id' => $role->id,
                'name' => $role->name,
                'created_at' => $role->created_at->format('d-m-Y'),
                'permissions' => $permissionNames,
                'grouped_permissions' => PermissionCategoryHelper::groupPermissions($permissionNames),
            ];
        });

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'request' => request()->only('search')
        ]);
    }

	/**
	 * Show the form for creating a new resource.
	 */
	public function create() {
		$allPermissions = Permission::all()->pluck('name')->toArray();
		return Inertia::render('roles/create', [
			'permissions' => $allPermissions,
			'groupedPermissions' => PermissionCategoryHelper::groupPermissions($allPermissions),
		]);
	}

	/**
	 * Store a newly created resource in storage.
	 */
	public function store(Request $request) {
		$request->validate([
			'name' => 'required|string|max:255|unique:roles,name',
			'permissions' => 'array',
			'permissions.*' => 'string|exists:permissions,name'
		]);

		$role = Role::create([
			'name' => $request->name
		]);

		if ($request->has('permissions')) {
			$role->syncPermissions($request->input('permissions', []));
		} else {
			$role->syncPermissions([]);
		}
		app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

		return to_route('roles.index')->with('message', 'Role Created Successfully!');
	}

	/**
	 * Display the specified resource.
	 */
	public function show(string $id) {
		//
	}

	/**
	 * Show the form for editing the specified resource.
	 */
	public function edit(Role $role) {
		$allPermissions = Permission::all()->pluck('name')->toArray();
		return Inertia::render('roles/edit', [
			'role' => $role->load('permissions'),
			'permissions' => $allPermissions,
			'groupedPermissions' => PermissionCategoryHelper::groupPermissions($allPermissions),
		]);
	}

	/**
	 * Update the specified resource in storage.
	 */
	public function update(Request $request, Role $role) {
		$request->validate([
			'name' => [
				'required',
				'string',
				'max:255',
				Rule::unique('roles', 'name')->ignore($role->id),
			],
			'permissions' => 'array',
			'permissions.*' => 'string|exists:permissions,name'
		]);

		$role->name = $request->name;
		$role->save();

		if ($request->has('permissions')) {
			$role->syncPermissions($request->input('permissions', []));
		} else {
			$role->syncPermissions([]);
		}
		app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

		return to_route('roles.index')->with('message', 'Role Updated Successfully!');
	}

	/**
	 * Remove the specified resource from storage.
	 */
	public function destroy(Role $role) {
		$role->delete();
		app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
		return to_route('roles.index')->with('message', 'Role Deleted Successfully!');
	}

	/**
	 * Display the Role-Permission Comparison Matrix.
	 */
	public function matrix() {
		$roles = Role::with('permissions')->get()->map(function ($role) {
			return [
				'id' => $role->id,
				'name' => $role->name,
				'permissions' => $role->permissions->pluck('name')->toArray(),
			];
		});

		$allPermissions = Permission::all()->pluck('name')->toArray();
		$groupedPermissions = PermissionCategoryHelper::groupPermissions($allPermissions);

		return Inertia::render('roles/matrix', [
			'roles' => $roles,
			'allPermissions' => $allPermissions,
			'groupedPermissions' => $groupedPermissions,
		]);
	}

	/**
	 * Toggle a permission for a role directly in the matrix.
	 */
	public function toggleMatrixPermission(Request $request) {
		$request->validate([
			'role_id' => 'required|exists:roles,id',
			'permission' => 'required|string|exists:permissions,name',
			'grant' => 'required|boolean',
		]);

		$role = Role::findOrFail($request->role_id);
		if ($request->grant) {
			$role->givePermissionTo($request->permission);
			$msg = "Granted permission '{$request->permission}' to '{$role->name}'";
		} else {
			$role->revokePermissionTo($request->permission);
			$msg = "Revoked permission '{$request->permission}' from '{$role->name}'";
		}
		app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

		return back()->with('message', $msg);
	}
}
