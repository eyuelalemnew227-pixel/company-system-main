<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PowerBiApiKeyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $provided = $request->header('X-POWERBI-KEY')
            ?? $request->header('x-api-key')
            ?? $this->bearerToken($request)
            ?? $request->query('key');
        $expected = config('services.powerbi.key');

        if (!$expected) {
            return response()->json(['message' => 'Power BI key not configured'], 500);
        }

        if (!hash_equals((string) $expected, (string) $provided)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return $next($request);
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


