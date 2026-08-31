<?php

namespace App\Http\Controllers;

use App\Support\PermissionCategoryHelper;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller {
	// index method
    public function index() {

		$query = Permission::query();

		if ($search = request('search')) {
			$query->where('name', 'like', "%{$search}%");
		}

        $permissions = $query->latest()->paginate(10)->withQueryString();
		$permissions->getCollection()->transform(function ($permission) {
			return [
				'id' => $permission->id,
				'name' => $permission->name,
				'category' => PermissionCategoryHelper::getCategory($permission->name),
				'created_at' => $permission->created_at->format('d-m-Y')
			];
		});
        return Inertia::render('permissions/index', [
            'permissions' => $permissions,
            'request' => request()->only('search')
        ]);
	}

	// store method
	public function store(Request $request) {
		Permission::create($request->validate([
			'name' => ['required', 'string', 'max:255', 'unique:permissions,name']
		]));
		app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

		return to_route('permissions.index')->with('message', 'Permission Created Successfully!');
	}

	// update method
	public function update(Request $request, Permission $permission) {
		$permission->update($request->validate([
			'name' => 'required|string|max:255|unique:permissions,name,' . $permission->id,
		]));
		app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

		return to_route('permissions.index')->with('message', 'Permission Updated Successfully!');
	}

	// destroy method
	public function destroy(Permission $permission) {
		$permission->delete();
		app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
		return to_route('permissions.index')->with('message', 'Permission Deleted Successfully!');
	}
}
