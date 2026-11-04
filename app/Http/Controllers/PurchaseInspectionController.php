<?php

namespace App\Http\Controllers;

use App\Models\PurchaseInspection;
use App\Models\PurchaseInspectionItem;
use App\Models\User;
use App\Services\PurchaseInspectionApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseInspectionController extends Controller
{
    protected PurchaseInspectionApiService $apiService;

    public function __construct(PurchaseInspectionApiService $apiService)
    {
        $this->apiService = $apiService;
    }

    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $status = $request->query('status');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $inspectorId = $request->query('inspector_id');
        $category = $request->query('category');

        $query = PurchaseInspection::query()
            ->with([
                'inspector:id,name',
                'approver:id,name',
            ])
            ->withCount([
                'items',
                'items as passed_items_count' => fn($q) => $q->where('status', 'pass'),
                'items as failed_items_count' => fn($q) => $q->where('status', 'fail'),
                'items as none_items_count' => fn($q) => $q->where('status', 'none'),
            ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('store_name', 'like', "%{$search}%")
                    ->orWhereHas('inspector', fn($iq) => $iq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('items', fn($iq) => $iq->where('item_name', 'like', "%{$search}%")
                        ->orWhere('item_code', 'like', "%{$search}%")
                        ->orWhere('category_name', 'like', "%{$search}%"));
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($dateFrom) {
            $query->whereDate('inspection_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('inspection_date', '<=', $dateTo);
        }

        if ($inspectorId && $inspectorId !== 'all') {
            $query->where('inspector_id', $inspectorId);
        }

        if ($category && $category !== 'all') {
            $query->whereHas('items', fn($iq) => $iq->where('category_name', $category));
        }

        $inspections = $query->orderByDesc('inspection_date')->orderByDesc('id')->paginate(15)->withQueryString();

        // Calculate metrics
        $metrics = [
            'total' => PurchaseInspection::count(),
            'draft' => PurchaseInspection::where('status', 'draft')->count(),
            'submitted' => PurchaseInspection::where('status', 'submitted')->count(),
            'approved' => PurchaseInspection::where('status', 'approved')->count(),
            'rejected' => PurchaseInspection::where('status', 'rejected')->count(),
        ];

        // Available categories from DB and external API
        $dbCategories = PurchaseInspectionItem::whereNotNull('category_name')
            ->distinct()
            ->pluck('category_name')
            ->toArray();
        $apiCategories = $this->apiService->getCategoryNames();
        $categories = array_values(array_unique(array_filter(array_merge($apiCategories, $dbCategories))));
        sort($categories);

        return Inertia::render('purchase-inspections/Index', [
            'inspections' => $inspections,
            'metrics' => $metrics,
            'filters' => [
                'search' => $search ?? '',
                'status' => $status ?? 'all',
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
                'inspector_id' => $inspectorId ?? 'all',
                'category' => $category ?? 'all',
            ],
            'categories' => $categories,
            'inspectors' => User::select('id', 'name')
                ->whereHas('roles', fn($q) => $q->whereIn('name', ['Super Admin', 'Admin']))
                ->orWhereNotNull('employee_id')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function apiItems(Request $request): JsonResponse
    {
        $refresh = $request->boolean('refresh');
        $data = $this->apiService->getGroupedCategories($refresh);

        return response()->json($data);
    }

    public function create(): Response
    {
        $apiData = $this->apiService->getGroupedCategories();

        return Inertia::render('purchase-inspections/Create', [
            'apiCategories' => $apiData['grouped'] ?? [],
            'totalApiItems' => $apiData['total_count'] ?? 0,
            'defaultStore' => 'M/Store',
            'todayDate' => now()->format('Y-m-d'),
            'currentUser' => Auth::user()->only(['id', 'name']),
            'lastFetched' => $apiData['fetched_at'] ?? now()->toIso8601String(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $rawItems = $request->input('items', []);
        $inspectedItems = array_values(array_filter((array) $rawItems, function ($item) {
            // If condition is NONE, do not store it (only store PASS and FAIL)
            $status = $item['status'] ?? null;
            if ($status !== 'pass' && $status !== 'fail') {
                return false;
            }

            $tab = $item['tab_type'] ?? 'custody_accuracy';
            if ($tab === 'custody_accuracy') {
                return isset($item['inspected_quantity']) && $item['inspected_quantity'] !== '' && $item['inspected_quantity'] !== null;
            }
            if ($tab === 'expiry_control') {
                return !empty($item['expiry_date']);
            }
            if ($tab === 'store_condition') {
                return true;
            }
            return false;
        }));

        $request->merge([
            'items' => $inspectedItems,
            'inspection_date' => now()->toDateString(),
            'store_name' => 'M/Store',
        ]);

        $validated = $request->validate([
            'inspection_date' => 'required|date',
            'store_name' => 'nullable|string|max:100',
            'action' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.tab_type' => 'required|in:custody_accuracy,expiry_control,store_condition',
            'items.*.category_name' => 'required|string|max:150',
            'items.*.item_code' => 'required|string|max:100',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.unit_of_measure' => 'nullable|string|max:50',
            'items.*.article_id' => 'nullable|string|max:50',
            'items.*.wac' => 'nullable|numeric',
            'items.*.main_store_balance' => 'nullable|numeric|min:0',
            'items.*.inspected_quantity' => 'nullable|numeric|min:0',
            'items.*.expiry_date' => 'nullable|date',
            'items.*.status' => 'required|in:pass,fail',
            'items.*.remarks' => 'nullable|string',
        ], [
            'items.min' => 'Please complete at least one inspection item with PASS or FAIL condition before saving (items set to NONE are not stored).',
        ]);

        DB::transaction(function () use ($validated) {
            $inspection = PurchaseInspection::create([
                'inspector_id' => Auth::id(),
                'inspection_date' => $validated['inspection_date'],
                'store_name' => !empty($validated['store_name']) ? $validated['store_name'] : 'M/Store',
                'status' => 'completed',
                'submitted_at' => now(),
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            foreach ($validated['items'] as $item) {
                $inspection->items()->create([
                    'tab_type' => $item['tab_type'] ?? 'custody_accuracy',
                    'category_name' => $item['category_name'],
                    'item_code' => $item['item_code'],
                    'item_name' => $item['item_name'],
                    'unit_of_measure' => $item['unit_of_measure'] ?? 'Pcs',
                    'article_id' => $item['article_id'] ?? null,
                    'wac' => $item['wac'] ?? null,
                    'main_store_balance' => isset($item['main_store_balance']) && is_numeric($item['main_store_balance']) ? $item['main_store_balance'] : 0,
                    'inspected_quantity' => isset($item['inspected_quantity']) && is_numeric($item['inspected_quantity']) ? $item['inspected_quantity'] : null,
                    'expiry_date' => !empty($item['expiry_date']) ? $item['expiry_date'] : null,
                    'status' => $item['status'] ?? 'none',
                    'remarks' => $item['remarks'] ?? null,
                ]);
            }
        });

        return redirect()->route('purchase-inspections.index')->with('message', 'Purchase Inspection saved successfully!');
    }

    public function show(PurchaseInspection $purchase_inspection): Response
    {
        $purchase_inspection->load([
            'inspector:id,name',
            'approver:id,name',
            'createdBy:id,name',
            'updatedBy:id,name',
            'items',
        ]);

        $totalItems = $purchase_inspection->items->count();
        $passedItems = $purchase_inspection->items->where('status', 'pass')->count();
        $failedItems = $purchase_inspection->items->where('status', 'fail')->count();
        $noneItems = $purchase_inspection->items->where('status', 'none')->count();
        $totalInspectedQty = $purchase_inspection->items->where('tab_type', 'custody_accuracy')->sum('inspected_quantity');

        $custodyCount = $purchase_inspection->items->where('tab_type', 'custody_accuracy')->count();
        $expiryCount = $purchase_inspection->items->where('tab_type', 'expiry_control')->count();
        $conditionCount = $purchase_inspection->items->where('tab_type', 'store_condition')->count();

        return Inertia::render('purchase-inspections/Show', [
            'inspection' => $purchase_inspection,
            'stats' => [
                'total_items' => $totalItems,
                'passed_items' => $passedItems,
                'failed_items' => $failedItems,
                'none_items' => $noneItems,
                'total_inspected_qty' => $totalInspectedQty,
                'custody_count' => $custodyCount,
                'expiry_count' => $expiryCount,
                'condition_count' => $conditionCount,
                'pass_rate' => $totalItems > 0 ? round(($passedItems / $totalItems) * 100, 1) : 0,
            ],
        ]);
    }

    public function edit(PurchaseInspection $purchase_inspection): Response
    {
        if (!Auth::user()->can('edit purchase inspections')) {
            abort(403, 'Unauthorized to edit purchase inspections.');
        }

        $purchase_inspection->load('items');
        $apiData = $this->apiService->getGroupedCategories();

        return Inertia::render('purchase-inspections/Edit', [
            'inspection' => $purchase_inspection,
            'apiCategories' => $apiData['grouped'] ?? [],
            'totalApiItems' => $apiData['total_count'] ?? 0,
            'lastFetched' => $apiData['fetched_at'] ?? now()->toIso8601String(),
        ]);
    }

    public function update(Request $request, PurchaseInspection $purchase_inspection): RedirectResponse
    {
        if (!Auth::user()->can('edit purchase inspections')) {
            abort(403, 'Unauthorized to edit purchase inspections.');
        }

        $rawItems = $request->input('items', []);
        $inspectedItems = array_values(array_filter((array) $rawItems, function ($item) {
            // If condition is NONE, do not store it (only store PASS and FAIL)
            $status = $item['status'] ?? null;
            if ($status !== 'pass' && $status !== 'fail') {
                return false;
            }

            $tab = $item['tab_type'] ?? 'custody_accuracy';
            if ($tab === 'custody_accuracy') {
                return isset($item['inspected_quantity']) && $item['inspected_quantity'] !== '' && $item['inspected_quantity'] !== null;
            }
            if ($tab === 'expiry_control') {
                return !empty($item['expiry_date']);
            }
            if ($tab === 'store_condition') {
                return true;
            }
            return false;
        }));

        $originalDate = \Illuminate\Support\Carbon::parse($purchase_inspection->inspection_date)->toDateString();
        $request->merge([
            'items' => $inspectedItems,
            'inspection_date' => $originalDate,
            'store_name' => $purchase_inspection->store_name ?: 'M/Store',
        ]);

        $validated = $request->validate([
            'inspection_date' => 'required|date',
            'store_name' => 'nullable|string|max:100',
            'action' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.tab_type' => 'required|in:custody_accuracy,expiry_control,store_condition',
            'items.*.category_name' => 'required|string|max:150',
            'items.*.item_code' => 'required|string|max:100',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.unit_of_measure' => 'nullable|string|max:50',
            'items.*.article_id' => 'nullable|string|max:50',
            'items.*.wac' => 'nullable|numeric',
            'items.*.main_store_balance' => 'nullable|numeric|min:0',
            'items.*.inspected_quantity' => 'nullable|numeric|min:0',
            'items.*.expiry_date' => 'nullable|date',
            'items.*.status' => 'required|in:pass,fail',
            'items.*.remarks' => 'nullable|string',
        ], [
            'items.min' => 'Please complete at least one inspection item with PASS or FAIL condition before saving (items set to NONE are not stored).',
        ]);

        DB::transaction(function () use ($purchase_inspection, $validated) {
            $purchase_inspection->update([
                'inspection_date' => $validated['inspection_date'],
                'store_name' => !empty($validated['store_name']) ? $validated['store_name'] : 'M/Store',
                'updated_by' => Auth::id(),
            ]);

            // Replace items
            $purchase_inspection->items()->delete();

            foreach ($validated['items'] as $item) {
                $purchase_inspection->items()->create([
                    'tab_type' => $item['tab_type'] ?? 'custody_accuracy',
                    'category_name' => $item['category_name'],
                    'item_code' => $item['item_code'],
                    'item_name' => $item['item_name'],
                    'unit_of_measure' => $item['unit_of_measure'] ?? 'Pcs',
                    'article_id' => $item['article_id'] ?? null,
                    'wac' => $item['wac'] ?? null,
                    'main_store_balance' => isset($item['main_store_balance']) && is_numeric($item['main_store_balance']) ? $item['main_store_balance'] : 0,
                    'inspected_quantity' => isset($item['inspected_quantity']) && is_numeric($item['inspected_quantity']) ? $item['inspected_quantity'] : null,
                    'expiry_date' => !empty($item['expiry_date']) ? $item['expiry_date'] : null,
                    'status' => $item['status'] ?? 'none',
                    'remarks' => $item['remarks'] ?? null,
                ]);
            }
        });

        return redirect()->route('purchase-inspections.show', $purchase_inspection->id)->with('message', 'Purchase Inspection updated successfully!');
    }

    public function destroy(PurchaseInspection $purchase_inspection): RedirectResponse
    {
        if (!Auth::user()->can('delete purchase inspections')) {
            abort(403, 'Unauthorized to delete purchase inspections.');
        }

        $purchase_inspection->delete();

        return redirect()->route('purchase-inspections.index')->with('message', 'Purchase Inspection deleted successfully.');
    }

    public function submit(PurchaseInspection $purchase_inspection): RedirectResponse
    {
        if ($purchase_inspection->status !== 'draft') {
            return back()->with('error', 'Only draft inspections can be submitted.');
        }

        $purchase_inspection->update([
            'status' => 'submitted',
            'submitted_at' => now(),
            'updated_by' => Auth::id(),
        ]);

        return back()->with('message', 'Inspection submitted for review!');
    }

    public function approve(PurchaseInspection $purchase_inspection): RedirectResponse
    {
        if (!Auth::user()->can('approve purchase inspections')) {
            abort(403, 'Unauthorized to approve purchase inspections.');
        }

        $purchase_inspection->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'rejection_reason' => null,
            'updated_by' => Auth::id(),
        ]);

        return back()->with('message', 'Inspection approved successfully!');
    }

    public function reject(Request $request, PurchaseInspection $purchase_inspection): RedirectResponse
    {
        if (!Auth::user()->can('approve purchase inspections')) {
            abort(403, 'Unauthorized to reject purchase inspections.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $purchase_inspection->update([
            'status' => 'rejected',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
            'updated_by' => Auth::id(),
        ]);

        return back()->with('message', 'Inspection has been rejected.');
    }

    public function export(PurchaseInspection $purchase_inspection): StreamedResponse
    {
        $purchase_inspection->load([
            'inspector:id,name',
            'approver:id,name',
            'items',
        ]);

        $filename = "Purchase_Inspection_{$purchase_inspection->reference_no}.csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($purchase_inspection) {
            $out = fopen('php://output', 'w');
            if ($out === false) return;
            fputs($out, "\xEF\xBB\xBF"); // UTF-8 BOM

            // Header metadata
            fputcsv($out, ['Purchase Inspection Report']);
            fputcsv($out, ['Reference No', $purchase_inspection->reference_no]);
            fputcsv($out, ['Inspection Date', $purchase_inspection->inspection_date?->format('Y-m-d')]);
            fputcsv($out, ['Store', $purchase_inspection->store_name]);
            fputcsv($out, ['Inspector', $purchase_inspection->inspector?->name ?? 'N/A']);
            fputcsv($out, []); // Blank line

            // Item Columns
            fputcsv($out, [
                'No.',
                'Inspection Tab / Section',
                'Category',
                'Article Code',
                'Item / Article Name',
                'UOM',
                'Main Store Balance',
                'Inspected Quantity',
                'Expiry Date',
                'Condition',
                'Remarks'
            ]);

            $index = 1;
            foreach ($purchase_inspection->items as $item) {
                $tabLabel = match($item->tab_type) {
                    'expiry_control' => 'Expiry Control',
                    'store_condition' => 'Store Condition',
                    default => 'Custody Accuracy',
                };

                fputcsv($out, [
                    $index++,
                    $tabLabel,
                    $item->category_name ?? 'N/A',
                    $item->item_code ?? '',
                    $item->item_name ?? 'N/A',
                    $item->unit_of_measure ?? 'Pcs',
                    $item->tab_type === 'custody_accuracy' ? $item->main_store_balance : '-',
                    $item->tab_type === 'custody_accuracy' ? $item->inspected_quantity : '-',
                    $item->tab_type === 'expiry_control' ? ($item->expiry_date?->format('Y-m-d') ?? '-') : '-',
                    strtoupper($item->status),
                    $item->remarks ?? '',
                ]);
            }

            fclose($out);
        }, 200, $headers);
    }
}
