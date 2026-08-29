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

        // Super Admin always has access
        if ($user->hasRole('Super Admin')) {
            return $next($request);
        }

        // Check if user's employee department is IT Department
        $departmentName = $user->employee?->department?->name ?? '';
        $isItDepartment = strtoupper(trim($departmentName)) === 'IT'
            || str_contains(strtolower($departmentName), 'it department');

        if ($isItDepartment && $user->can('view telecom management')) {
            return $next($request);
        }

        abort(403, 'Access denied. Telecom Management is restricted to the IT Department.');
    }
}
