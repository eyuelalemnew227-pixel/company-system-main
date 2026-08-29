<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\TelegramAccount;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $employee = $request->user()->employee;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'telegramLinked' => (bool) $employee?->telegramAccount()->where('is_verified', true)->exists(),
        ]);
    }

    public function linkTelegram(Request $request): RedirectResponse
    {
        $employee = $request->user()->employee;
        abort_if(! $employee, 400, 'Only employee accounts can link Telegram.');

        $data = $request->validate(['code' => ['required', 'string']]);

        $account = TelegramAccount::where('link_code', trim($data['code']))
            ->where('is_verified', false)
            ->first();

        if (! $account) {
            return back()->with('error', 'That code is invalid or has expired. Send /start to the bot again for a new code.');
        }

        $account->update(['employee_id' => $employee->id, 'is_verified' => true, 'linked_at' => now()]);

        return back()->with('success', 'Telegram linked! You will now receive notifications there too.');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
