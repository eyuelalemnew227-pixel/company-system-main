<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Admin role bypasses every permission check, mirroring the Next.js
        // app's roleSlug === 'super_admin' shortcut (src/lib/auth.ts).
        Gate::before(function (User $user, string $ability) {
            return $user->role?->slug === 'admin' ? true : null;
        });

        // `Gate::allows('permission', 'quiz.create')` checks the user's role
        // permissions for an arbitrary slug — the same slug catalogue used
        // by the React sidebar and the seeded RolePermissionSeeder.
        Gate::define('permission', function (User $user, string $slug) {
            return $user->hasPermission($slug);
        });
    }
}
