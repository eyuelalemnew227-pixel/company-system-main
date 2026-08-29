<?php

namespace App\Http\Requests\Auth;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /** Account lockout policy, ported from the Next.js app's src/lib/auth.ts. */
    private const MAX_ATTEMPTS = 5;

    private const LOCKOUT_MINUTES = 30;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $email = strtolower(trim($this->string('email')));
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }

        if ($user->locked_until && $user->locked_until->isFuture()) {
            $minutes = now()->diffInMinutes($user->locked_until) + 1;
            throw ValidationException::withMessages([
                'email' => "Account locked. Try again in {$minutes} minute(s).",
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages(['email' => 'This account is not active.']);
        }

        if (! Hash::check($this->string('password'), $user->password)) {
            $user->failed_attempts++;

            if ($user->failed_attempts >= self::MAX_ATTEMPTS) {
                $user->locked_until = now()->addMinutes(self::LOCKOUT_MINUTES);
                $user->failed_attempts = 0;
                $user->save();

                throw ValidationException::withMessages([
                    'email' => 'Too many failed attempts. Account locked for '.self::LOCKOUT_MINUTES.' minutes.',
                ]);
            }

            $user->save();
            $remaining = self::MAX_ATTEMPTS - $user->failed_attempts;

            throw ValidationException::withMessages([
                'email' => "Invalid credentials. {$remaining} attempt(s) remaining.",
            ]);
        }

        $user->failed_attempts = 0;
        $user->locked_until = null;
        $user->last_login = now();
        $user->save();

        Auth::login($user, $this->boolean('remember'));

        $this->session()->put('auth_login_at', now()->timestamp);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'login',
            'module' => 'auth',
            'ip_address' => $this->ip(),
            'user_agent' => $this->userAgent(),
        ]);
    }
}
