<?php

namespace App\Http\Controllers;

use App\Models\ChildCategory;
use App\Models\Product;
use App\Models\PurchaseInspection;
use App\Models\PurchaseInspectionItem;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseInspectionController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $status = $request->query('status');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $inspectorId = $request->query('inspector_id');
        $childCategoryId = $request->query('child_category_id');

        $query = PurchaseInspection::query()
            ->with([
                'inspector:id,name',
                'approver:id,name',
            ])
            ->withCount([
                'items',
                'items as passed_items_count' => fn($q) => $q->where('status', 'pass'),
                'items as failed_items_count' => fn($q) => $q->where('status', 'fail'),
            ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('store_name', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('inspector', fn($iq) => $iq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('items.product', fn($pq) => $pq->where('product_name', 'like', "%{$search}%")->orWhere('product_code', 'like', "%{$search}%"));
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

        if ($childCategoryId && $childCategoryId !== 'all') {
            $query->whereHas('items', fn($iq) => $iq->where('child_category_id', $childCategoryId));
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

        return Inertia::render('purchase-inspections/Index', [
            'inspections' => $inspections,
            'metrics' => $metrics,
            'filters' => [
                'search' => $search ?? '',
                'status' => $status ?? 'all',
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
                'inspector_id' => $inspectorId ?? 'all',
                'child_category_id' => $childCategoryId ?? 'all',
            ],
            'childCategories' => ChildCategory::where('status', 'Active')->select('id', 'child_name')->orderBy('child_name')->get(),
            'inspectors' => User::select('id', 'name')->whereHas('roles', fn($q) => $q->whereIn('name', ['Super Admin', 'Admin']))->orWhereNotNull('employee_id')->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        $childCategories = ChildCategory::where('status', 'Active')
            ->with(['products' => function ($q) {
                $q->where('status', 'Active')->select('id', 'child_category_id', 'product_name', 'product_code', 'measurement', 'unit_cost');
            }])
            ->select('id', 'child_name')
            ->orderBy('child_name')
            ->get();

        return Inertia::render('purchase-inspections/Create', [
            'childCategories' => $childCategories,
            'defaultStore' => 'M/Store',
            'todayDate' => now()->format('Y-m-d'),
            'currentUser' => Auth::user()->only(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'inspection_date' => 'required|date',
            'store_name' => 'required|string|max:100',
            'notes' => 'nullable|string',
            'action' => 'required|in:draft,submit',
            'items' => 'required|array|min:1',
            'items.*.child_category_id' => 'required|exists:child_categories,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.main_store_balance' => 'required|numeric|min:0',
            'items.*.inspected_quantity' => 'required|numeric|min:0',
            'items.*.unit_of_measure' => 'nullable|string|max:50',
            'items.*.status' => 'required|in:pass,fail',
            'items.*.remarks' => 'nullable|string',
        ]);

        $isSubmit = $validated['action'] === 'submit';
        $status = $isSubmit ? 'submitted' : 'draft';

        DB::transaction(function () use ($validated, $status, $isSubmit) {
            $inspection = PurchaseInspection::create([
                'inspector_id' => Auth::id(),
                'inspection_date' => $validated['inspection_date'],
                'store_name' => $validated['store_name'],
                'status' => $status,
                'notes' => $validated['notes'] ?? null,
                'submitted_at' => $isSubmit ? now() : null,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            foreach ($validated['items'] as $item) {
                $inspection->items()->create([
                    'child_category_id' => $item['child_category_id'],
                    'product_id' => $item['product_id'],
                    'main_store_balance' => $item['main_store_balance'],
                    'inspected_quantity' => $item['inspected_quantity'],
                    'unit_of_measure' => $item['unit_of_measure'] ?? null,
                    'status' => $item['status'],
                    'remarks' => $item['remarks'] ?? null,
                ]);
            }
        });

        $msg = $isSubmit
            ? 'Purchase Inspection submitted successfully!'
            : 'Purchase Inspection saved as draft successfully!';

        return redirect()->route('purchase-inspections.index')->with('message', $msg);
    }

    public function show(PurchaseInspection $purchase_inspection): Response
    {
        $purchase_inspection->load([
            'inspector:id,name',
            'approver:id,name',
            'createdBy:id,name',
            'updatedBy:id,name',
            'items.childCategory:id,child_name',
            'items.product:id,product_name,product_code,measurement',
        ]);

        $totalItems = $purchase_inspection->items->count();
        $passedItems = $purchase_inspection->items->where('status', 'pass')->count();
        $failedItems = $purchase_inspection->items->where('status', 'fail')->count();
        $totalInspectedQty = $purchase_inspection->items->sum('inspected_quantity');

        return Inertia::render('purchase-inspections/Show', [
            'inspection' => $purchase_inspection,
            'stats' => [
                'total_items' => $totalItems,
                'passed_items' => $passedItems,
                'failed_items' => $failedItems,
                'total_inspected_qty' => $totalInspectedQty,
                'pass_rate' => $totalItems > 0 ? round(($passedItems / $totalItems) * 100, 1) : 0,
            ],
        ]);
    }

    public function edit(PurchaseInspection $purchase_inspection): Response
    {
        // Allow editing if draft or rejected, or user has edit permission
        if (!in_array($purchase_inspection->status, ['draft', 'rejected']) && !Auth::user()->can('edit purchase inspections')) {
            abort(403, 'This inspection cannot be edited in its current state.');
        }

        $purchase_inspection->load([
            'items.childCategory:id,child_name',
            'items.product:id,product_name,product_code,measurement',
        ]);

        $childCategories = ChildCategory::where('status', 'Active')
            ->with(['products' => function ($q) {
                $q->where('status', 'Active')->select('id', 'child_category_id', 'product_name', 'product_code', 'measurement', 'unit_cost');
            }])
            ->select('id', 'child_name')
            ->orderBy('child_name')
            ->get();

        return Inertia::render('purchase-inspections/Edit', [
            'inspection' => $purchase_inspection,
            'childCategories' => $childCategories,
        ]);
    }

    public function update(Request $request, PurchaseInspection $purchase_inspection): RedirectResponse
    {
        if (!in_array($purchase_inspection->status, ['draft', 'rejected']) && !Auth::user()->can('edit purchase inspections')) {
            abort(403, 'This inspection cannot be edited in its current state.');
        }

        $validated = $request->validate([
            'inspection_date' => 'required|date',
            'store_name' => 'required|string|max:100',
            'notes' => 'nullable|string',
            'action' => 'required|in:draft,submit',
            'items' => 'required|array|min:1',
            'items.*.child_category_id' => 'required|exists:child_categories,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.main_store_balance' => 'required|numeric|min:0',
            'items.*.inspected_quantity' => 'required|numeric|min:0',
            'items.*.unit_of_measure' => 'nullable|string|max:50',
            'items.*.status' => 'required|in:pass,fail',
            'items.*.remarks' => 'nullable|string',
        ]);

        $isSubmit = $validated['action'] === 'submit';
        $status = $isSubmit ? 'submitted' : 'draft';

        DB::transaction(function () use ($purchase_inspection, $validated, $status, $isSubmit) {
            $purchase_inspection->update([
                'inspection_date' => $validated['inspection_date'],
                'store_name' => $validated['store_name'],
                'status' => $status,
                'notes' => $validated['notes'] ?? null,
                'submitted_at' => $isSubmit ? now() : $purchase_inspection->submitted_at,
                'updated_by' => Auth::id(),
            ]);

            // Replace items
            $purchase_inspection->items()->delete();

            foreach ($validated['items'] as $item) {
                $purchase_inspection->items()->create([
                    'child_category_id' => $item['child_category_id'],
                    'product_id' => $item['product_id'],
                    'main_store_balance' => $item['main_store_balance'],
                    'inspected_quantity' => $item['inspected_quantity'],
                    'unit_of_measure' => $item['unit_of_measure'] ?? null,
                    'status' => $item['status'],
                    'remarks' => $item['remarks'] ?? null,
                ]);
            }
        });

        $msg = $isSubmit
            ? 'Purchase Inspection updated and submitted!'
            : 'Purchase Inspection draft updated successfully!';

        return redirect()->route('purchase-inspections.show', $purchase_inspection->id)->with('message', $msg);
    }

    public function destroy(PurchaseInspection $purchase_inspection): RedirectResponse
    {
        if (!in_array($purchase_inspection->status, ['draft', 'rejected']) && !Auth::user()->can('delete purchase inspections')) {
            abort(403, 'Only draft or rejected inspections can be deleted.');
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
            'items.childCategory:id,child_name',
            'items.product:id,product_name,product_code',
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

            // Header metadata
            fputcsv($out, ['Purchase Inspection Report']);
            fputcsv($out, ['Reference No', $purchase_inspection->reference_no]);
            fputcsv($out, ['Inspection Date', $purchase_inspection->inspection_date?->format('Y-m-d')]);
            fputcsv($out, ['Store', $purchase_inspection->store_name]);
            fputcsv($out, ['Status', strtoupper($purchase_inspection->status)]);
            fputcsv($out, ['Inspector', $purchase_inspection->inspector?->name ?? 'N/A']);
            fputcsv($out, ['Approver', $purchase_inspection->approver?->name ?? 'N/A']);
            fputcsv($out, ['Approved At', $purchase_inspection->approved_at?->format('Y-m-d H:i') ?? 'N/A']);
            if ($purchase_inspection->notes) {
                fputcsv($out, ['Notes', $purchase_inspection->notes]);
            }
            fputcsv($out, []); // Blank line

            // Item Columns
            fputcsv($out, [
                'No.',
                'Child Category',
                'Product Code',
                'Product Name',
                'Main Store Balance',
                'Inspected Quantity',
                'Unit of Measure',
                'Condition',
                'Remarks'
            ]);

            $index = 1;
            foreach ($purchase_inspection->items as $item) {
                fputcsv($out, [
                    $index++,
                    $item->childCategory?->child_name ?? 'N/A',
                    $item->product?->product_code ?? '',
                    $item->product?->product_name ?? 'N/A',
                    $item->main_store_balance,
                    $item->inspected_quantity,
                    $item->unit_of_measure ?? '',
                    strtoupper($item->status),
                    $item->remarks ?? '',
                ]);
            }

            fclose($out);
        }, 200, $headers);
    }
}
