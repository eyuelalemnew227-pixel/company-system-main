<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces an 8-hour absolute session lifetime on top of Laravel's idle-based
 * session.lifetime (2h), matching the Next.js app's dual timeout policy
 * (src/lib/auth.ts SESSION_MAX_AGE / SESSION_IDLE).
 */
class EnsureSessionNotExpired
{
    private const MAX_AGE_SECONDS = 8 * 60 * 60;

    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $loginAt = $request->session()->get('auth_login_at');

            if ($loginAt && (time() - $loginAt) > self::MAX_AGE_SECONDS) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->with('status', 'Your session has expired. Please sign in again.');
            }
        }

        return $next($request);
    }
}
