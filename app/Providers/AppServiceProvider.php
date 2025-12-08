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

        // Force HTTPS when behind proxy (ngrok, cloudflare, etc)
        if (request()->header('X-Forwarded-Proto') === 'https' || request()->header('X-Forwarded-Ssl') === 'on') {
            \URL::forceScheme('https');
        }
    }
}
