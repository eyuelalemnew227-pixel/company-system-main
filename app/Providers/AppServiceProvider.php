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

        // Register policies manually (TicketPolicy)
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Ticket::class, \App\Policies\TicketPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\TicketMainCategory::class, \App\Policies\TicketMainCategoryPolicy::class);
    }
}
