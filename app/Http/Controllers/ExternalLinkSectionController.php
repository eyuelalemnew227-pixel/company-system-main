<?php

namespace App\Http\Controllers;

use App\Models\ExternalLinkSection;
use Illuminate\Http\Request;

class ExternalLinkSectionController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:255'],
            'sort' => ['integer'],
            'is_active' => ['boolean'],
        ]);

        ExternalLinkSection::create($validated);

        return back()->with('message', 'Section created.');
    }

    public function update(Request $request, ExternalLinkSection $external_link_section)
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:255'],
            'sort' => ['integer'],
            'is_active' => ['boolean'],
        ]);

        $external_link_section->update($validated);

        return back()->with('message', 'Section updated.');
    }

    public function destroy(ExternalLinkSection $external_link_section)
    {
        $external_link_section->delete();

        return back()->with('message', 'Section deleted.');
    }
}
