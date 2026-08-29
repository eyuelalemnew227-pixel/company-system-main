<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('permission', 'role.view');

        $totalPerms = Permission::count();
        $roles = Role::withCount(['users', 'permissions'])->with('permissions')
            ->orderByDesc('is_system')->orderBy('name')->get()
            ->map(function (Role $r) use ($totalPerms) {
                return [
                    'id' => $r->id, 'name' => $r->name, 'slug' => $r->slug, 'description' => $r->description,
                    'isSystem' => $r->is_system, 'createdAt' => $r->created_at, 'userCount' => $r->users_count,
                    'permissionCount' => $r->slug === 'admin' ? $totalPerms : $r->permissions_count,
                    'totalPermissions' => $totalPerms,
                    'permissions' => $r->slug === 'admin' ? [] : $r->permissions->pluck('slug'),
                ];
            });

        $catalog = Permission::orderBy('module')->orderBy('slug')->get();
        $grouped = $catalog->groupBy('module')->map(fn ($group) => $group->map(fn (Permission $p) => [
            'slug' => $p->slug, 'name' => $p->name, 'description' => $p->description,
        ])->values());

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'totalPermissions' => $totalPerms,
            'permissionCatalog' => $grouped,
            'canManage' => $request->user()->hasPermission('role.manage'),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'role.manage');

        $data = $request->validate([
            'name' => ['required', 'string'],
            'slug' => ['required', 'string'],
            'description' => ['nullable', 'string'],
        ]);

        $cleanSlug = Str::slug(strtolower(trim($data['slug'])), '_');
        abort_if(Role::where('name', $data['name'])->orWhere('slug', $cleanSlug)->exists(), 422, 'Role name or slug already exists');

        $role = Role::create(['name' => trim($data['name']), 'slug' => $cleanSlug, 'description' => $data['description'] ?? null, 'is_system' => false]);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'create_role', 'module' => 'roles',
            'entity_type' => 'Role', 'entity_id' => $role->id, 'new_value' => json_encode(['name' => $role->name, 'slug' => $role->slug]),
        ]);

        return back()->with('success', 'Role created.');
    }

    public function updatePermission(Request $request, Role $role)
    {
        Gate::authorize('permission', 'role.manage');
        abort_if($role->slug === 'admin', 403, 'Cannot modify Admin permissions (has wildcard access).');

        $data = $request->validate([
            'permission_slug' => ['required', 'string', 'exists:permissions,slug'],
            'granted' => ['required', 'boolean'],
        ]);

        $permission = Permission::where('slug', $data['permission_slug'])->firstOrFail();

        if ($data['granted']) {
            $role->permissions()->syncWithoutDetaching([$permission->id]);
        } else {
            $role->permissions()->detach($permission->id);
        }

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => $data['granted'] ? 'grant_permission' : 'revoke_permission',
            'module' => 'roles', 'entity_type' => 'Role', 'entity_id' => $role->id,
            'old_value' => $data['permission_slug'], 'new_value' => $data['granted'] ? 'true' : 'false',
        ]);

        return back()->with('success', $data['granted'] ? 'Permission granted.' : 'Permission revoked.');
    }
}
