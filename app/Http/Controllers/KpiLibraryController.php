<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\KpiLibrary;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KpiLibraryController extends Controller
{
    /**
     * Display a listing of the KPI Library.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $formFilter = $request->input('form_id');

        $query = KpiLibrary::with([
            'forms:id,title,status',
            'creator:id,name',
        ])->latest();

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (!empty($formFilter)) {
            $query->whereHas('forms', function ($q) use ($formFilter) {
                $q->where('forms.id', $formFilter);
            });
        }

        $kpis = $query->paginate(15)->withQueryString();

        // Calculate summary metrics
        $allKpis = KpiLibrary::with('forms:id')->get();
        $totalKpis = $allKpis->count();
        $totalWeight = (float) $allKpis->sum('weight');
        $linkedFormsCount = $allKpis->pluck('forms')->flatten()->pluck('id')->unique()->count();

        // All active/available forms for multi-selection dropdown
        $availableForms = Form::select('id', 'title', 'status')
            ->orderBy('title')
            ->get();

        return Inertia::render('Forms/KpiLibrary/Index', [
            'kpis' => $kpis,
            'filters' => [
                'search' => $search,
                'form_id' => $formFilter,
            ],
            'metrics' => [
                'total_kpis' => $totalKpis,
                'total_weight' => $totalWeight,
                'linked_forms_count' => $linkedFormsCount,
            ],
            'availableForms' => $availableForms,
        ]);
    }

    /**
     * Store a newly created KPI in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'form_ids' => 'nullable|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        $kpi = KpiLibrary::create([
            'name' => $validated['name'],
            'weight' => $validated['weight'] ?? 0.00,
            'description' => $validated['description'] ?? null,
            'created_by' => auth()->id(),
        ]);

        if (isset($validated['form_ids'])) {
            $kpi->forms()->sync($validated['form_ids']);
        }

        return redirect()->back()->with('success', 'KPI added to library successfully.');
    }

    /**
     * Update the specified KPI in storage.
     */
    public function update(Request $request, KpiLibrary $kpiLibrary)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'form_ids' => 'nullable|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        $kpiLibrary->update([
            'name' => $validated['name'],
            'weight' => $validated['weight'] ?? 0.00,
            'description' => $validated['description'] ?? null,
        ]);

        if (isset($validated['form_ids'])) {
            $kpiLibrary->forms()->sync($validated['form_ids']);
        } else {
            $kpiLibrary->forms()->detach();
        }

        return redirect()->back()->with('success', 'KPI updated successfully.');
    }

    /**
     * Remove the specified KPI from storage.
     */
    public function destroy(KpiLibrary $kpiLibrary)
    {
        $kpiLibrary->delete();

        return redirect()->back()->with('success', 'KPI deleted from library.');
    }
}
