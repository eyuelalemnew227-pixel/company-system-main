<?php

namespace App\Http\Controllers;

use App\Models\SocialMediaSource;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class SocialMediaSourceController extends Controller
{
    public function index(Request $request): Response
    {
        $query = SocialMediaSource::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($status = $request->query('status')) {
            if ($status === 'Active') {
                $query->where('is_active', true);
            } elseif ($status === 'Inactive') {
                $query->where('is_active', false);
            }
        }

        $perPage = (int) $request->query('per_page', 15);
        $sources = $query->orderBy('display_order')->orderBy('name')->paginate($perPage)->withQueryString();

        return Inertia::render('settings/social-media-sources/Index', [
            'sources' => $sources,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $request->query('status'),
                'per_page' => $request->query('per_page'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:social_media_sources,name'],
            'is_active' => ['required', 'boolean'],
            'display_order' => ['nullable', 'integer'],
        ]);

        SocialMediaSource::create([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'],
            'display_order' => $validated['display_order'] ?? 0,
        ]);

        Cache::forget('miniapp_init_data');

        return redirect()->route('social-media-sources.index')
            ->with('success', 'Social Media Source created successfully.');
    }

    public function update(Request $request, SocialMediaSource $socialMediaSource): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:social_media_sources,name,' . $socialMediaSource->id],
            'is_active' => ['required', 'boolean'],
            'display_order' => ['nullable', 'integer'],
        ]);

        $socialMediaSource->update($validated);
        Cache::forget('miniapp_init_data');

        return redirect()->route('social-media-sources.index')
            ->with('success', 'Social Media Source updated successfully.');
    }

    public function toggleStatus(SocialMediaSource $socialMediaSource): RedirectResponse
    {
        $newStatus = !$socialMediaSource->is_active;
        $socialMediaSource->update(['is_active' => $newStatus]);
        Cache::forget('miniapp_init_data');

        $statusText = $newStatus ? 'Active' : 'Inactive';
        return redirect()->back()
            ->with('success', "Social Media Source '{$socialMediaSource->name}' is now {$statusText}.");
    }

    public function destroy(SocialMediaSource $socialMediaSource): RedirectResponse
    {
        $socialMediaSource->delete();
        Cache::forget('miniapp_init_data');

        return redirect()->route('social-media-sources.index')
            ->with('success', 'Social Media Source deleted successfully.');
    }
}
