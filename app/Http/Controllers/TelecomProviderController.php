<?php

namespace App\Http\Controllers;

use App\Models\TelecomProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TelecomProviderController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TelecomProvider::query()->withCount(['phoneNumbers', 'broadbands']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('support_contact', 'like', "%{$search}%");
            });
        }

        $providers = $query->orderBy('name')->get();

        return Inertia::render('telecom/providers/Index', [
            'providers' => $providers,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'support_contact' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        TelecomProvider::create($validated);

        return redirect()->route('telecom.providers.index')
            ->with('success', 'Telecom Provider created successfully.');
    }

    public function update(Request $request, TelecomProvider $provider): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'support_contact' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $provider->update($validated);

        return redirect()->route('telecom.providers.index')
            ->with('success', 'Telecom Provider updated successfully.');
    }

    public function destroy(TelecomProvider $provider): RedirectResponse
    {
        if ($provider->phoneNumbers()->count() > 0 || $provider->broadbands()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete provider with associated connections.');
        }

        $provider->delete();

        return redirect()->route('telecom.providers.index')
            ->with('success', 'Telecom Provider deleted successfully.');
    }
}
