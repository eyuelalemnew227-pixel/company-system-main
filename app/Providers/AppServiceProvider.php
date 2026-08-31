<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
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
        // Fix for older MySQL/MariaDB 'Specified key was too long' errors
        Schema::defaultStringLength(191);

        // Implicitly grant 'Super Admin' role permissions across Gate checks, except for explicit modules (Internal Memorandum, Online Training & Telecom Management)
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            if ($user->hasRole('Super Admin')) {
                if (str_starts_with($ability, 'memo.') || str_starts_with($ability, 'training.online.') || str_starts_with($ability, 'telecom.') || $ability === 'view telecom management') {
                    return null; // Fallback to checking user's actual assigned permissions
                }
                return true;
            }
            return null;
        });

        // Register policies manually (TicketPolicy)
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Ticket::class, \App\Policies\TicketPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\TicketMainCategory::class, \App\Policies\TicketMainCategoryPolicy::class);
    }
}
