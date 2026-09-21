<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\KpiItem;
use App\Models\KpiLibrary;
use App\Models\KpiRole;
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
        $roleFilter = $request->input('kpi_role_id');
        $formFilter = $request->input('form_id');

        $query = KpiLibrary::with([
            'kpiRole:id,name',
            'kpiItem:id,name,description',
            'forms:id,title,status',
            'creator:id,name',
        ])->latest();

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('kpiRole', function ($rq) use ($search) {
                      $rq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if (!empty($roleFilter) && $roleFilter !== 'all') {
            if ($roleFilter === 'unassigned') {
                $query->whereNull('kpi_role_id');
            } else {
                $query->where('kpi_role_id', $roleFilter);
            }
        }

        if (!empty($formFilter) && $formFilter !== 'all') {
            $query->whereHas('forms', function ($q) use ($formFilter) {
                $q->where('forms.id', $formFilter);
            });
        }

        $kpis = $query->paginate(15)->withQueryString();

        // Available lists for dropdowns & filters
        $kpiRoles = KpiRole::select('id', 'name')->orderBy('name')->get();
        $masterKpis = KpiItem::select('id', 'name', 'description')->orderBy('name')->get();
        $availableForms = Form::select('id', 'title', 'status')->orderBy('title')->get();

        return Inertia::render('Forms/KpiLibrary/Index', [
            'kpis' => $kpis,
            'filters' => [
                'search' => $search,
                'kpi_role_id' => $roleFilter,
                'form_id' => $formFilter,
            ],
            'kpiRoles' => $kpiRoles,
            'masterKpis' => $masterKpis,
            'availableForms' => $availableForms,
        ]);
    }

    /**
     * Store a newly created KPI in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'kpi_role_id' => 'nullable|exists:kpi_roles,id',
            'kpi_item_id' => 'nullable|exists:kpi_items,id',
            'name' => 'required|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'form_ids' => 'nullable|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        // Auto-create or resolve master KPI item
        $kpiItemId = $validated['kpi_item_id'] ?? null;
        if (!$kpiItemId) {
            $masterItem = KpiItem::firstOrCreate(
                ['name' => trim($validated['name'])],
                ['description' => $validated['description'] ?? null]
            );
            $kpiItemId = $masterItem->id;
        }

        $kpi = KpiLibrary::create([
            'kpi_role_id' => $validated['kpi_role_id'] ?? null,
            'kpi_item_id' => $kpiItemId,
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
            'kpi_role_id' => 'nullable|exists:kpi_roles,id',
            'kpi_item_id' => 'nullable|exists:kpi_items,id',
            'name' => 'required|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'form_ids' => 'nullable|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        $kpiItemId = $validated['kpi_item_id'] ?? null;
        if (!$kpiItemId) {
            $masterItem = KpiItem::firstOrCreate(
                ['name' => trim($validated['name'])],
                ['description' => $validated['description'] ?? null]
            );
            $kpiItemId = $masterItem->id;
        }

        $kpiLibrary->update([
            'kpi_role_id' => $validated['kpi_role_id'] ?? null,
            'kpi_item_id' => $kpiItemId,
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

    /**
     * Quick-add a new KPI Role on-the-fly.
     */
    public function quickRole(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $kpiRole = KpiRole::firstOrCreate(
            ['name' => trim($request->name)]
        );

        return response()->json([
            'success' => true,
            'role' => [
                'id' => $kpiRole->id,
                'name' => $kpiRole->name,
            ],
        ]);
    }

    /**
     * Quick-add a new Master KPI on-the-fly.
     */
    public function quickKpi(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $kpiItem = KpiItem::firstOrCreate(
            ['name' => trim($request->name)],
            ['description' => $request->description ?? null]
        );

        return response()->json([
            'success' => true,
            'kpi' => [
                'id' => $kpiItem->id,
                'name' => $kpiItem->name,
                'description' => $kpiItem->description,
            ],
        ]);
    }
}
