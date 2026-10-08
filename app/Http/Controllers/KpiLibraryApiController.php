<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\KpiItem;
use App\Models\KpiLibrary;
use App\Models\KpiRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class KpiLibraryApiController extends Controller
{
    /**
     * List all KPIs with filtering, search, and pagination.
     * GET /api/kpi-library
     * GET /api/kpi-libraries
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $roleId = $request->query('kpi_role_id') ?? $request->query('role_id');
        $roleName = $request->query('role');
        $formId = $request->query('form_id');
        $itemId = $request->query('kpi_item_id') ?? $request->query('item_id');
        $minWeight = $request->query('min_weight');
        $maxWeight = $request->query('max_weight');
        $sortBy = $request->query('sort_by', 'created_at');
        $order = strtolower($request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->query('per_page', 15);
        $shouldPaginate = !filter_var($request->query('all', false), FILTER_VALIDATE_BOOLEAN)
            && filter_var($request->query('paginate', true), FILTER_VALIDATE_BOOLEAN);

        $query = KpiLibrary::with([
            'kpiRole:id,name,description',
            'kpiItem:id,name,description',
            'forms:id,title,status',
            'creator:id,name',
        ]);

        // 1. Search filter (Name, Description, Role Name, Master Item Name)
        if (!empty($search)) {
            $searchTerm = trim($search);
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('description', 'like', "%{$searchTerm}%")
                  ->orWhereHas('kpiRole', function ($rq) use ($searchTerm) {
                      $rq->where('name', 'like', "%{$searchTerm}%");
                  })
                  ->orWhereHas('kpiItem', function ($iq) use ($searchTerm) {
                      $iq->where('name', 'like', "%{$searchTerm}%");
                  });
            });
        }

        // 2. Role Filter (By ID, or 'unassigned')
        if (!empty($roleId) && $roleId !== 'all') {
            if ($roleId === 'unassigned' || $roleId === 'null') {
                $query->whereNull('kpi_role_id');
            } else {
                $query->where('kpi_role_id', $roleId);
            }
        } elseif (!empty($roleName)) {
            $query->whereHas('kpiRole', function ($rq) use ($roleName) {
                $rq->where('name', 'like', "%{$roleName}%");
            });
        }

        // 3. Form Filter (Linked via pivot)
        if (!empty($formId) && $formId !== 'all') {
            $query->whereHas('forms', function ($fq) use ($formId) {
                $fq->where('forms.id', $formId);
            });
        }

        // 4. Master Item Filter
        if (!empty($itemId)) {
            $query->where('kpi_item_id', $itemId);
        }

        // 5. Weight Filters
        if ($minWeight !== null && is_numeric($minWeight)) {
            $query->where('weight', '>=', (float) $minWeight);
        }
        if ($maxWeight !== null && is_numeric($maxWeight)) {
            $query->where('weight', '<=', (float) $maxWeight);
        }

        // 6. Sorting
        $allowedSorts = ['id', 'name', 'weight', 'created_at', 'updated_at'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $order);
        } else {
            $query->latest();
        }

        // 7. Overall Summary Stats
        $totalKpisCount = KpiLibrary::count();
        $totalRolesCount = KpiRole::count();
        $totalMasterItemsCount = KpiItem::count();
        $avgWeight = (float) (KpiLibrary::avg('weight') ?? 0);

        if ($shouldPaginate) {
            $perPage = max(1, min(100, $perPage));
            $paginated = $query->paginate($perPage)->withQueryString();

            $data = collect($paginated->items())->map(fn($kpi) => $this->formatKpi($kpi));

            return response()->json([
                'status' => 'success',
                'count' => $data->count(),
                'total' => $paginated->total(),
                'summary' => [
                    'total_kpis' => $totalKpisCount,
                    'total_roles' => $totalRolesCount,
                    'total_master_items' => $totalMasterItemsCount,
                    'average_weight' => round($avgWeight, 2),
                ],
                'data' => $data,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'from' => $paginated->firstItem(),
                    'to' => $paginated->lastItem(),
                    'has_more' => $paginated->hasMorePages(),
                ],
            ]);
        }

        $allKpis = $query->get()->map(fn($kpi) => $this->formatKpi($kpi));

        return response()->json([
            'status' => 'success',
            'count' => $allKpis->count(),
            'total' => $allKpis->count(),
            'summary' => [
                'total_kpis' => $totalKpisCount,
                'total_roles' => $totalRolesCount,
                'total_master_items' => $totalMasterItemsCount,
                'average_weight' => round($avgWeight, 2),
            ],
            'data' => $allKpis,
        ]);
    }

    /**
     * Get details of a single KPI from the library.
     * GET /api/kpi-library/{id}
     */
    public function show($id): JsonResponse
    {
        $kpi = KpiLibrary::with([
            'kpiRole:id,name,description',
            'kpiItem:id,name,description',
            'forms:id,title,status',
            'creator:id,name',
        ])->find($id);

        if (!$kpi) {
            return response()->json([
                'status' => 'error',
                'message' => "KPI with ID {$id} not found in library.",
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->formatKpi($kpi),
        ]);
    }

    /**
     * Create a new KPI in the library.
     * POST /api/kpi-library
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'kpi_role_id' => 'nullable|exists:kpi_roles,id',
            'kpi_role_name' => 'nullable|string|max:255',
            'kpi_item_id' => 'nullable|exists:kpi_items,id',
            'form_ids' => 'nullable|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // 1. Resolve or auto-create KPI Role if name passed instead of ID
        $roleId = $validated['kpi_role_id'] ?? null;
        if (!$roleId && !empty($validated['kpi_role_name'])) {
            $role = KpiRole::firstOrCreate(['name' => trim($validated['kpi_role_name'])]);
            $roleId = $role->id;
        }

        // 2. Resolve or auto-create master KPI item
        $itemId = $validated['kpi_item_id'] ?? null;
        if (!$itemId) {
            $masterItem = KpiItem::firstOrCreate(
                ['name' => trim($validated['name'])],
                ['description' => $validated['description'] ?? null]
            );
            $itemId = $masterItem->id;
        }

        // 3. Create KPI Library record
        $userId = auth()->id() ?? auth('web')->id();

        $kpi = KpiLibrary::create([
            'kpi_role_id' => $roleId,
            'kpi_item_id' => $itemId,
            'name' => trim($validated['name']),
            'weight' => $validated['weight'] ?? 0.00,
            'description' => $validated['description'] ?? null,
            'created_by' => $userId,
        ]);

        // 4. Attach forms if provided
        if (!empty($validated['form_ids'])) {
            $kpi->forms()->sync($validated['form_ids']);
        }

        $kpi->load(['kpiRole', 'kpiItem', 'forms', 'creator']);

        return response()->json([
            'status' => 'success',
            'message' => 'KPI successfully created in library.',
            'data' => $this->formatKpi($kpi),
        ], 201);
    }

    /**
     * Update an existing KPI in the library.
     * PUT/PATCH /api/kpi-library/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        $kpi = KpiLibrary::find($id);

        if (!$kpi) {
            return response()->json([
                'status' => 'error',
                'message' => "KPI with ID {$id} not found in library.",
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'kpi_role_id' => 'nullable|exists:kpi_roles,id',
            'kpi_role_name' => 'nullable|string|max:255',
            'kpi_item_id' => 'nullable|exists:kpi_items,id',
            'form_ids' => 'nullable|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // 1. Resolve role if role name passed
        $roleId = array_key_exists('kpi_role_id', $validated) ? $validated['kpi_role_id'] : $kpi->kpi_role_id;
        if (!empty($validated['kpi_role_name'])) {
            $role = KpiRole::firstOrCreate(['name' => trim($validated['kpi_role_name'])]);
            $roleId = $role->id;
        }

        // 2. Resolve master item if requested or updated
        $itemId = array_key_exists('kpi_item_id', $validated) ? $validated['kpi_item_id'] : $kpi->kpi_item_id;
        if (isset($validated['name']) && !$itemId) {
            $masterItem = KpiItem::firstOrCreate(
                ['name' => trim($validated['name'])],
                ['description' => $validated['description'] ?? null]
            );
            $itemId = $masterItem->id;
        }

        // 3. Update KPI attributes
        $updateData = [];
        if (isset($validated['name'])) $updateData['name'] = trim($validated['name']);
        if (array_key_exists('weight', $validated)) $updateData['weight'] = $validated['weight'] ?? 0.00;
        if (array_key_exists('description', $validated)) $updateData['description'] = $validated['description'];
        $updateData['kpi_role_id'] = $roleId;
        $updateData['kpi_item_id'] = $itemId;

        $kpi->update($updateData);

        // 4. Sync forms if form_ids explicitly supplied
        if (array_key_exists('form_ids', $validated)) {
            $kpi->forms()->sync($validated['form_ids'] ?? []);
        }

        $kpi->load(['kpiRole', 'kpiItem', 'forms', 'creator']);

        return response()->json([
            'status' => 'success',
            'message' => 'KPI updated successfully.',
            'data' => $this->formatKpi($kpi),
        ]);
    }

    /**
     * Delete a KPI from the library.
     * DELETE /api/kpi-library/{id}
     */
    public function destroy($id): JsonResponse
    {
        $kpi = KpiLibrary::find($id);

        if (!$kpi) {
            return response()->json([
                'status' => 'error',
                'message' => "KPI with ID {$id} not found in library.",
            ], 404);
        }

        // Detach forms from pivot table before deleting
        $kpi->forms()->detach();
        $kpi->delete();

        return response()->json([
            'status' => 'success',
            'message' => "KPI #{$id} has been permanently deleted from the library.",
        ]);
    }

    /**
     * Get metadata and reference lookup lists for client dropdowns.
     * GET /api/kpi-library/meta
     */
    public function meta(): JsonResponse
    {
        $roles = KpiRole::withCount('kpiLibraries')
            ->orderBy('name')
            ->get(['id', 'name', 'description'])
            ->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'description' => $r->description,
                'kpis_count' => $r->kpi_libraries_count,
            ]);

        $masterItems = KpiItem::withCount('kpiLibraries')
            ->orderBy('name')
            ->get(['id', 'name', 'description'])
            ->map(fn($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'description' => $i->description,
                'kpis_count' => $i->kpi_libraries_count,
            ]);

        $forms = Form::select('id', 'title', 'status')
            ->orderBy('title')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'roles' => $roles,
                'master_items' => $masterItems,
                'forms' => $forms,
                'counts' => [
                    'total_kpis' => KpiLibrary::count(),
                    'total_roles' => $roles->count(),
                    'total_master_items' => $masterItems->count(),
                    'total_forms' => $forms->count(),
                ],
            ],
        ]);
    }

    /**
     * List all KPI Roles.
     * GET /api/kpi-library/roles
     */
    public function roles(): JsonResponse
    {
        $roles = KpiRole::withCount('kpiLibraries')
            ->orderBy('name')
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'description' => $r->description,
                'kpis_count' => $r->kpi_libraries_count,
            ]);

        return response()->json([
            'status' => 'success',
            'count' => $roles->count(),
            'data' => $roles,
        ]);
    }

    /**
     * Create a new KPI Role.
     * POST /api/kpi-library/roles
     */
    public function storeRole(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $role = KpiRole::firstOrCreate(
            ['name' => trim($validated['name'])],
            ['description' => $validated['description'] ?? null]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'KPI Role created or resolved successfully.',
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
            ],
        ], 201);
    }

    /**
     * List all Master KPI catalog items.
     * GET /api/kpi-library/items
     */
    public function items(): JsonResponse
    {
        $items = KpiItem::withCount('kpiLibraries')
            ->orderBy('name')
            ->get()
            ->map(fn($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'description' => $i->description,
                'kpis_count' => $i->kpi_libraries_count,
            ]);

        return response()->json([
            'status' => 'success',
            'count' => $items->count(),
            'data' => $items,
        ]);
    }

    /**
     * Create a new Master KPI item.
     * POST /api/kpi-library/items
     */
    public function storeItem(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $item = KpiItem::firstOrCreate(
            ['name' => trim($validated['name'])],
            ['description' => $validated['description'] ?? null]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Master KPI catalog item created or resolved successfully.',
            'data' => [
                'id' => $item->id,
                'name' => $item->name,
                'description' => $item->description,
            ],
        ], 201);
    }

    /**
     * Attach forms to a KPI.
     * POST /api/kpi-library/{id}/forms
     */
    public function attachForms(Request $request, $id): JsonResponse
    {
        $kpi = KpiLibrary::find($id);

        if (!$kpi) {
            return response()->json([
                'status' => 'error',
                'message' => "KPI with ID {$id} not found in library.",
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'form_ids' => 'required|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $kpi->forms()->syncWithoutDetaching($request->input('form_ids'));
        $kpi->load('forms:id,title,status');

        return response()->json([
            'status' => 'success',
            'message' => 'Forms linked successfully.',
            'forms' => $kpi->forms,
        ]);
    }

    /**
     * Detach forms from a KPI.
     * DELETE /api/kpi-library/{id}/forms
     */
    public function detachForms(Request $request, $id): JsonResponse
    {
        $kpi = KpiLibrary::find($id);

        if (!$kpi) {
            return response()->json([
                'status' => 'error',
                'message' => "KPI with ID {$id} not found in library.",
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'form_ids' => 'required|array',
            'form_ids.*' => 'exists:forms,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $kpi->forms()->detach($request->input('form_ids'));
        $kpi->load('forms:id,title,status');

        return response()->json([
            'status' => 'success',
            'message' => 'Forms unlinked successfully.',
            'forms' => $kpi->forms,
        ]);
    }

    /**
     * Standardized formatting for KPI Library objects.
     */
    protected function formatKpi(KpiLibrary $kpi): array
    {
        return [
            'id' => $kpi->id,
            'name' => $kpi->name,
            'weight' => (float) $kpi->weight,
            'description' => $kpi->description,
            'role' => $kpi->kpiRole ? [
                'id' => $kpi->kpiRole->id,
                'name' => $kpi->kpiRole->name,
                'description' => $kpi->kpiRole->description ?? null,
            ] : null,
            'master_item' => $kpi->kpiItem ? [
                'id' => $kpi->kpiItem->id,
                'name' => $kpi->kpiItem->name,
                'description' => $kpi->kpiItem->description ?? null,
            ] : null,
            'forms' => $kpi->forms ? $kpi->forms->map(fn($f) => [
                'id' => $f->id,
                'title' => $f->title,
                'status' => $f->status,
            ])->values()->all() : [],
            'forms_count' => $kpi->forms ? $kpi->forms->count() : 0,
            'creator' => $kpi->creator ? [
                'id' => $kpi->creator->id,
                'name' => $kpi->creator->name,
            ] : null,
            'created_at' => $kpi->created_at ? $kpi->created_at->toIso8601String() : null,
            'updated_at' => $kpi->updated_at ? $kpi->updated_at->toIso8601String() : null,
        ];
    }
}
