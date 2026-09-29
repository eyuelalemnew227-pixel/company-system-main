<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FormsApiAuthMiddleware
{
    /**
     * Handle an incoming request.
     * Allows access via either:
     * 1) Authenticated Session / Sanctum User
     * 2) Valid API Key (via X-API-KEY header, Authorization Bearer, or ?api_key= query param)
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check if user is already authenticated via session or token
        if (auth()->check() || auth('web')->check()) {
            return $next($request);
        }

        // 2. Check for API key in headers or query parameters
        $providedKey = $request->header('X-API-KEY')
            ?? $request->header('X-FORMS-KEY')
            ?? $request->header('x-api-key')
            ?? $this->bearerToken($request)
            ?? $request->query('api_key')
            ?? $request->query('key');

        $expectedKey = config('services.forms.key');
        $fallbackKey = config('services.powerbi.key');

        if ($providedKey && $expectedKey && hash_equals((string) $expectedKey, (string) $providedKey)) {
            return $next($request);
        }

        if ($providedKey && $fallbackKey && hash_equals((string) $fallbackKey, (string) $providedKey)) {
            return $next($request);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Unauthorized. Provide a valid API key via X-API-KEY header or ?api_key= parameter, or authenticate via session/token.'
        ], 401);
    }

    private function bearerToken(Request $request): ?string
    {
        $auth = $request->header('Authorization');
        if (!$auth) {
            return null;
        }
        if (preg_match('/^Bearer\s+(?<token>.+)$/i', $auth, $m)) {
            return $m['token'];
        }
        return null;
    }
}
