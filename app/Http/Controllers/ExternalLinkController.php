<?php

namespace App\Http\Controllers;

use App\Models\ExternalLink;
use App\Models\ExternalLinkSection;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExternalLinkController extends Controller
{
    public function index()
    {
        $sections = ExternalLinkSection::query()
            ->with(['links' => function ($query) {
                $query->orderBy('sort');
            }])
            ->orderBy('sort')
            ->get();

        return Inertia::render('external-links/Index', [
            'sections' => $sections,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'external_link_section_id' => ['required', 'exists:external_link_sections,id'],
            'title' => ['required', 'string', 'max:255'],
            'href' => ['required', 'url'],
            'icon' => ['nullable', 'string', 'max:255'],
            'permission' => ['nullable', 'string', 'max:255'],
            'target' => ['nullable', 'string', 'max:50'],
            'rel' => ['nullable', 'string', 'max:255'],
            'is_external' => ['boolean'],
            'is_active' => ['boolean'],
            'sort' => ['integer'],
        ]);

        $validated['icon'] = $validated['icon'] ?? 'ExternalLink';
        $validated['rel'] = $validated['rel'] ?? 'noreferrer noopener';
        $validated['target'] = $validated['target'] ?? '_blank';
        $validated['created_by'] = $request->user()?->id;

        ExternalLink::create($validated);

        return to_route('external-links.index')->with('message', 'External link created.');
    }

    public function update(Request $request, ExternalLink $external_link)
    {
        $validated = $request->validate([
            'external_link_section_id' => ['required', 'exists:external_link_sections,id'],
            'title' => ['required', 'string', 'max:255'],
            'href' => ['required', 'url'],
            'icon' => ['nullable', 'string', 'max:255'],
            'permission' => ['nullable', 'string', 'max:255'],
            'target' => ['nullable', 'string', 'max:50'],
            'rel' => ['nullable', 'string', 'max:255'],
            'is_external' => ['boolean'],
            'is_active' => ['boolean'],
            'sort' => ['integer'],
        ]);

        $validated['icon'] = $validated['icon'] ?? 'ExternalLink';
        $validated['rel'] = $validated['rel'] ?? 'noreferrer noopener';
        $validated['target'] = $validated['target'] ?? '_blank';
        $external_link->update($validated);

        return to_route('external-links.index')->with('message', 'External link updated.');
    }

    public function destroy(ExternalLink $external_link)
    {
        $external_link->delete();

        return back()->with('message', 'External link deleted.');
    }
}
