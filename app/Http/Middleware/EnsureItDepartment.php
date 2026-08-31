<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureItDepartment
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Unauthorized.');
        }

        // Super Admin and IT Admin always have access
        if ($user->hasRole('Super Admin') || $user->hasRole('IT Admin')) {
            return $next($request);
        }

        // Allow any user with view telecom management permission regardless of department
        if ($user->can('view telecom management')) {
            return $next($request);
        }

        abort(403, 'Access denied. You do not have permission to view Telecom Management.');
    }
}
