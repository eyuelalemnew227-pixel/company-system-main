<?php

namespace App\Http\Middleware;

use App\Models\NotificationRecipient;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role_id' => $user->role_id,
                    'role_slug' => $user->role?->slug,
                    'role_name' => $user->role?->name,
                    'employee_id' => $user->employee?->id,
                    'permissions' => $user->role?->slug === 'admin'
                        ? \App\Models\Permission::pluck('slug')
                        : $user->permissionSlugs(),
                    'preferred_lang' => $user->preferred_lang,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'unreadNotificationCount' => fn () => $user?->employee
                ? NotificationRecipient::where('employee_id', $user->employee->id)->whereNull('read_at')->count()
                : 0,
        ];
    }
}
