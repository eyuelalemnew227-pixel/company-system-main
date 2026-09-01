<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Form;
use App\Models\User;
use App\Models\Branch;
use App\Models\Department;
use App\Models\FormUserPermission;
use Inertia\Inertia;

class FormPermissionController extends Controller
{
    public function index(Form $form, Request $request)
    {
        $user = auth()->user();
        if ($form->created_by !== $user->id) {
            if (!$user->hasPermissionTo('view forms') && !$user->hasPermissionTo('update forms')) {
                $hasAccess = $form->user_permissions()->where('user_id', $user->id)->where('can_manage_access', true)->exists();
                if (!$hasAccess) {
                    abort(403, 'You do not have permission to manage capabilities for this form.');
                }
            }
        }

        $search = $request->query('search', '');
        $branchId = $request->query('branch_id', 'all');
        $departmentId = $request->query('department_id', 'all');

        $users = User::query()
            ->with(['employee']) // Load employee relationship for filtering display
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($branchId !== 'all', function ($query) use ($branchId) {
                $query->whereHas('employee', function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            })
            ->when($departmentId !== 'all', function ($query) use ($departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->with([
                'form_permissions' => function ($query) use ($form) {
                    $query->where('form_id', $form->id);
                }
            ])
            ->paginate(15);

        $users->getCollection()->transform(function ($user) {
            $perm = $user->form_permissions->first();
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'employee_code' => $user->employee ? $user->employee->employee_code : null,
                'can_edit_schema' => $perm ? $perm->can_edit_schema : false,
                'can_manage_access' => $perm ? $perm->can_manage_access : false,
                'can_fill_submissions' => $perm ? $perm->can_fill_submissions : false,
                'can_view_submissions' => $perm ? $perm->can_view_submissions : false,
                'can_edit_submissions' => $perm ? $perm->can_edit_submissions : false,
                'can_delete_submissions' => $perm ? $perm->can_delete_submissions : false,
            ];
        });

        $branches = Branch::with('departments')->get();

        return Inertia::render('Forms/Permissions', [
            'form' => $form->only('id', 'title'),
            'users' => $users,
            'branches' => $branches,
            'filters' => [
                'search' => $search,
                'branch_id' => $branchId,
                'department_id' => $departmentId
            ]
        ]);
    }

    public function update(Request $request, Form $form)
    {
        $user = auth()->user();
        if ($form->created_by !== $user->id) {
            if (!$user->hasPermissionTo('view forms') && !$user->hasPermissionTo('update forms')) {
                $hasAccess = $form->user_permissions()->where('user_id', $user->id)->where('can_manage_access', true)->exists();
                if (!$hasAccess) {
                    abort(403, 'You do not have permission to manage capabilities for this form.');
                }
            }
        }

        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'permissions' => 'required|array',
            'permissions.can_edit_schema' => 'boolean',
            'permissions.can_manage_access' => 'boolean',
            'permissions.can_fill_submissions' => 'boolean',
            'permissions.can_view_submissions' => 'boolean',
            'permissions.can_edit_submissions' => 'boolean',
            'permissions.can_delete_submissions' => 'boolean',
        ]);

        foreach ($request->user_ids as $userId) {
            FormUserPermission::updateOrCreate(
                ['form_id' => $form->id, 'user_id' => $userId],
                $request->permissions
            );
        }

        return back()->with('success', 'Form permissions updated for selected users.');
    }
}
