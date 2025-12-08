<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\ChildCategory;
use App\Models\InventoryCount;
use App\Models\InventoryPeriod;
use App\Models\Product;
use App\Rules\ValidateInventoryCount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryCountController extends Controller
{
    /**
     * Display a paginated listing of the inventory counts.
     */
    public function index(Request $request): Response
    {
        // Get the logged-in user's branch ID
        $user = auth()->user();
        $userBranchId = $user->employee?->branch_id;
        $canManageAllBranches = $user->can('manage all branches inventory');

        $query = InventoryCount::query()
            ->with([
                'branch:id,name',
                'inventoryPeriod:id,inventory_period_name,status',
                'childCategory:id,child_name',
                'product:id,product_name',
                'creator:id,name',
                'updater:id,name',
                'approver:id,name',
            ]);

        // Filter by user's branch unless they have permission to manage all branches
        if (!$canManageAllBranches && $userBranchId) {
            $query->where('branch_id', $userBranchId);
        }

        // Allow branch filtering if user can manage all branches
        if ($canManageAllBranches && $branchId = $request->query('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        // Filter by inventory period
        if ($periodId = $request->query('inventory_period_id')) {
            $query->where('inventory_period_id', $periodId);
        }

        // Filter by approval status
        if ($request->filled('approval_status')) {
            $approvalStatus = $request->query('approval_status');
            if ($approvalStatus === 'approved') {
                $query->where('is_approved', true);
            } elseif ($approvalStatus === 'pending') {
                $query->where('is_approved', false);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('count', 'like', "%{$search}%")
                    ->orWhere('created_by', 'like', "%{$search}%")
                    ->orWhere('updated_by', 'like', "%{$search}%");
            });
        }

        if ($childCategoryId = $request->query('child_category_id')) {
            $query->where('child_category_id', $childCategoryId);
        }

        if ($productId = $request->query('product_id')) {
            $query->where('product_id', $productId);
        }

        $perPage = (int) $request->query('per_page', 15);
        $perPage = $perPage > 0 ? $perPage : 15;

        $inventoryCounts = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return Inertia::render('inventory-counts/index', [
            'inventoryCounts' => $inventoryCounts,
            'branches' => $canManageAllBranches ? Branch::all(['id', 'name']) : [],
            'inventoryPeriods' => InventoryPeriod::where('status', 'active')->get(['id', 'inventory_period_name']),
            'childCategories' => ChildCategory::where('status', 'Active')->get(['id', 'child_name']),
            'filters' => $request->only(['search', 'branch_id', 'inventory_period_id', 'child_category_id', 'product_id', 'approval_status', 'per_page']),
            'canManageAllBranches' => $canManageAllBranches,
            'canApprove' => $user->can('approve inventory counts'),
            'canUnapprove' => $user->can('unapprove inventory counts'),
            'selectedPeriodStatus' => $periodId ? InventoryPeriod::find($periodId)?->status : null,
        ]);
    }

    /**
     * Show the form for creating a new inventory count.
     */
    public function create(): Response
    {
        $user = auth()->user();
        $userBranchId = $user->employee?->branch_id;
        $canManageAllBranches = $user->can('manage all branches inventory');

        return Inertia::render('inventory-counts/create', [
            'branches' => $canManageAllBranches ? Branch::all(['id', 'name']) : Branch::where('id', $userBranchId)->get(['id', 'name']),
            'inventoryPeriods' => InventoryPeriod::where('status', 'active')->get(['id', 'inventory_period_name']),
            'childCategories' => ChildCategory::where('status', 'Active')->get(['id', 'child_name']),
            'products' => Product::with('childCategory:id,child_name')->get(['id', 'product_name', 'child_category_id']),
            'canManageAllBranches' => $canManageAllBranches,
            'userBranchId' => $userBranchId,
        ]);
    }

    /**
     * Store a newly created inventory count in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $userBranchId = $user->employee?->branch_id;
        $canManageAllBranches = $user->can('manage all branches inventory');

        $validated = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'inventory_period_id' => ['required', 'integer', 'exists:inventory_periods,id'],
            'child_category_id' => ['required', 'integer', 'exists:child_categories,id'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'count' => [
                'required',
                'numeric',
                'min:0',
                new ValidateInventoryCount(
                    $request->input('product_id'),
                    $request->input('branch_id'),
                    $request->input('inventory_period_id')
                )
            ],
        ]);

        // Check if inventory period is active
        $inventoryPeriod = InventoryPeriod::find($validated['inventory_period_id']);
        if (!$inventoryPeriod || $inventoryPeriod->status !== 'active') {
            return back()->withErrors(['inventory_period_id' => 'Cannot create inventory count for inactive period.']);
        }

        // Ensure user can only create inventory counts for their own branch unless they have permission
        if (!$canManageAllBranches && $userBranchId && $validated['branch_id'] != $userBranchId) {
            return back()->withErrors(['branch_id' => 'You can only create inventory counts for your own branch.']);
        }

        $validated['created_by'] = auth()->id();
        $validated['updated_by'] = auth()->id();

        InventoryCount::create($validated);

        return redirect()->route('inventory-counts.index')
            ->with('success', 'Inventory count created successfully.');
    }

    /**
     * Show the form for editing the specified inventory count.
     */
    public function edit(InventoryCount $inventoryCount): Response
    {
        $user = auth()->user();
        $userBranchId = $user->employee?->branch_id;
        $canManageAllBranches = $user->can('manage all branches inventory');

        // Check if inventory period is active
        if ($inventoryCount->inventoryPeriod->status !== 'active') {
            abort(403, 'Cannot edit inventory count for inactive period.');
        }

        // Ensure user can only edit inventory counts from their own branch unless they have permission
        if (!$canManageAllBranches && $userBranchId && $inventoryCount->branch_id != $userBranchId) {
            abort(403, 'You can only edit inventory counts from your own branch.');
        }

        return Inertia::render('inventory-counts/edit', [
            'inventoryCount' => $inventoryCount->load([
                'branch:id,name',
                'inventoryPeriod:id,inventory_period_name,status',
                'childCategory:id,child_name',
                'product:id,product_name',
            ]),
            'branches' => $canManageAllBranches ? Branch::all(['id', 'name']) : Branch::where('id', $userBranchId)->get(['id', 'name']),
            'inventoryPeriods' => InventoryPeriod::where('status', 'active')->get(['id', 'inventory_period_name']),
            'childCategories' => ChildCategory::where('status', 'Active')->get(['id', 'child_name']),
            'products' => Product::with('childCategory:id,child_name')->get(['id', 'product_name', 'child_category_id']),
            'canManageAllBranches' => $canManageAllBranches,
        ]);
    }

    /**
     * Update the specified inventory count in storage.
     */
    public function update(Request $request, InventoryCount $inventoryCount): RedirectResponse
    {
        $user = auth()->user();
        $userBranchId = $user->employee?->branch_id;
        $canManageAllBranches = $user->can('manage all branches inventory');

        // Check if inventory period is active
        if ($inventoryCount->inventoryPeriod->status !== 'active') {
            return back()->withErrors(['error' => 'Cannot update inventory count for inactive period.']);
        }

        // Ensure user can only update inventory counts from their own branch unless they have permission
        if (!$canManageAllBranches && $userBranchId && $inventoryCount->branch_id != $userBranchId) {
            abort(403, 'You can only update inventory counts from your own branch.');
        }

        $validated = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'inventory_period_id' => ['required', 'integer', 'exists:inventory_periods,id'],
            'child_category_id' => ['required', 'integer', 'exists:child_categories,id'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'count' => [
                'required',
                'numeric',
                'min:0',
                new ValidateInventoryCount(
                    $request->input('product_id'),
                    $request->input('branch_id'),
                    $request->input('inventory_period_id'),
                    $inventoryCount->id
                )
            ],
        ]);

        // Check if new period is active
        $newInventoryPeriod = InventoryPeriod::find($validated['inventory_period_id']);
        if (!$newInventoryPeriod || $newInventoryPeriod->status !== 'active') {
            return back()->withErrors(['inventory_period_id' => 'Cannot update to inactive period.']);
        }

        // Prevent changing branch_id to a different branch unless user has permission
        if (!$canManageAllBranches && isset($validated['branch_id']) && $validated['branch_id'] != $userBranchId) {
            return back()->withErrors(['branch_id' => 'You cannot change the branch to a different branch.']);
        }

        $validated['updated_by'] = auth()->id();

        $inventoryCount->update($validated);

        return redirect()->route('inventory-counts.index')
            ->with('success', 'Inventory count updated successfully.');
    }

    /**
     * Remove the specified inventory count from storage.
     */
    public function destroy(InventoryCount $inventoryCount): RedirectResponse
    {
        $user = auth()->user();
        $userBranchId = $user->employee?->branch_id;
        $canManageAllBranches = $user->can('manage all branches inventory');

        // Ensure user can only delete inventory counts from their own branch unless they have permission
        if (!$canManageAllBranches && $userBranchId && $inventoryCount->branch_id != $userBranchId) {
            abort(403, 'You can only delete inventory counts from your own branch.');
        }

        $inventoryCount->delete();

        return redirect()->route('inventory-counts.index')
            ->with('success', 'Inventory count deleted successfully.');
    }

    /**
     * Store multiple inventory counts at once.
     */
    public function bulkStore(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $userBranchId = $user->employee?->branch_id;
        $canManageAllBranches = $user->can('manage all branches inventory');

        $request->validate([
            'counts' => ['required', 'array', 'min:1'],
            'counts.*.branch_id' => ['required', 'integer', 'exists:branches,id'],
            'counts.*.inventory_period_id' => ['required', 'integer', 'exists:inventory_periods,id'],
            'counts.*.child_category_id' => ['required', 'integer', 'exists:child_categories,id'],
            'counts.*.product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $counts = $request->input('counts');
        
        foreach ($counts as $index => $countData) {
            $validator = validator($countData, [
                'count' => [
                    'required',
                    'numeric',
                    'min:0',
                    new ValidateInventoryCount(
                        $countData['product_id'],
                        $countData['branch_id'],
                        $countData['inventory_period_id']
                    )
                ],
            ]);

            if ($validator->fails()) {
                return back()->withErrors([
                    "counts.{$index}.count" => $validator->errors()->first('count')
                ])->withInput();
            }
        }

        $validated = $request->input('counts');

        // Check if all periods are active
        $periodIds = array_unique(array_column($validated, 'inventory_period_id'));
        $inactivePeriods = InventoryPeriod::whereIn('id', $periodIds)
            ->where('status', '!=', 'active')
            ->exists();

        if ($inactivePeriods) {
            return back()->withErrors(['counts' => 'Cannot create inventory counts for inactive periods.']);
        }

        // Ensure all counts are for the user's branch unless they have permission
        if (!$canManageAllBranches) {
            foreach ($validated as $countData) {
                if ($userBranchId && $countData['branch_id'] != $userBranchId) {
                    return back()->withErrors(['counts' => 'You can only create inventory counts for your own branch.']);
                }
            }
        }

        $userId = auth()->id();

        foreach ($validated as $countData) {
            $countData['created_by'] = $userId;
            $countData['updated_by'] = $userId;
            
            InventoryCount::create($countData);
        }

        return back()->with('success', count($validated) . ' inventory count(s) created successfully.');
    }

    /**
     * API: Approve a single inventory count - returns JSON
     */
    public function apiApprove(InventoryCount $inventoryCount): JsonResponse
    {
        $user = auth()->user();

        if (!$user->can('approve inventory counts')) {
            return response()->json(['message' => 'You do not have permission to approve inventory counts.'], 403);
        }

        if ($inventoryCount->is_approved) {
            return response()->json(['message' => 'This inventory count is already approved.'], 400);
        }

        $inventoryCount->update([
            'is_approved' => true,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return response()->json([
            'message' => 'Inventory count approved successfully',
            'data' => $inventoryCount->load(['approver:id,name']),
        ]);
    }

    /**
     * Inertia: Approve a single inventory count
     */
    public function approve(InventoryCount $inventoryCount): RedirectResponse
    {
        $user = auth()->user();

        if (!$user->can('approve inventory counts')) {
            abort(403, 'You do not have permission to approve inventory counts.');
        }

        // Check if inventory period is active
        if ($inventoryCount->inventoryPeriod->status !== 'active') {
            return back()->withErrors(['error' => 'Cannot approve inventory count for inactive period.']);
        }

        if ($inventoryCount->is_approved) {
            return back()->withErrors(['error' => 'This inventory count is already approved.']);
        }

        $inventoryCount->update([
            'is_approved' => true,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Inventory count approved successfully.');
    }

    /**
     * API: Unapprove a single inventory count - returns JSON
     */
    public function apiUnapprove(InventoryCount $inventoryCount): JsonResponse
    {
        $user = auth()->user();

        if (!$user->can('unapprove inventory counts')) {
            return response()->json(['message' => 'You do not have permission to unapprove inventory counts.'], 403);
        }

        if (!$inventoryCount->is_approved) {
            return response()->json(['message' => 'This inventory count is not approved.'], 400);
        }

        $inventoryCount->update([
            'is_approved' => false,
            'approved_by' => null,
            'approved_at' => null,
        ]);

        return response()->json([
            'message' => 'Inventory count unapproved successfully',
            'data' => $inventoryCount,
        ]);
    }

    /**
     * Inertia: Unapprove a single inventory count
     */
    public function unapprove(InventoryCount $inventoryCount): RedirectResponse
    {
        $user = auth()->user();

        if (!$user->can('unapprove inventory counts')) {
            abort(403, 'You do not have permission to unapprove inventory counts.');
        }

        // Check if inventory period is active
        if ($inventoryCount->inventoryPeriod->status !== 'active') {
            return back()->withErrors(['error' => 'Cannot unapprove inventory count for inactive period.']);
        }

        if (!$inventoryCount->is_approved) {
            return back()->withErrors(['error' => 'This inventory count is not approved.']);
        }

        $inventoryCount->update([
            'is_approved' => false,
            'approved_by' => null,
            'approved_at' => null,
        ]);

        return back()->with('success', 'Inventory count unapproved successfully.');
    }

    /**
     * API: Approve multiple inventory counts at once - returns JSON
     */
    public function apiBulkApprove(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (!$user->can('approve inventory counts')) {
            return response()->json(['message' => 'You do not have permission to approve inventory counts.'], 403);
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:inventory_counts,id'],
        ]);

        $counts = InventoryCount::whereIn('id', $validated['ids'])
            ->where('is_approved', false)
            ->get();

        if ($counts->isEmpty()) {
            return response()->json(['message' => 'No unapproved inventory counts found with the provided IDs.'], 400);
        }

        $userId = auth()->id();
        $now = now();

        foreach ($counts as $count) {
            $count->update([
                'is_approved' => true,
                'approved_by' => $userId,
                'approved_at' => $now,
            ]);
        }

        return response()->json([
            'message' => count($counts) . ' inventory count(s) approved successfully',
            'data' => $counts->load(['approver:id,name']),
        ]);
    }

    /**
     * Inertia: Approve multiple inventory counts at once
     */
    public function bulkApprove(Request $request): RedirectResponse
    {
        $user = auth()->user();

        if (!$user->can('approve inventory counts')) {
            abort(403, 'You do not have permission to approve inventory counts.');
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:inventory_counts,id'],
        ]);

        $counts = InventoryCount::with('inventoryPeriod')
            ->whereIn('id', $validated['ids'])
            ->where('is_approved', false)
            ->get();

        if ($counts->isEmpty()) {
            return back()->withErrors(['error' => 'No unapproved inventory counts found with the provided IDs.']);
        }

        // Check if all counts are from active periods
        $inactiveCounts = $counts->filter(function ($count) {
            return $count->inventoryPeriod->status !== 'active';
        });

        if ($inactiveCounts->isNotEmpty()) {
            return back()->withErrors(['error' => 'Cannot approve inventory counts from inactive periods.']);
        }

        $userId = auth()->id();
        $now = now();

        foreach ($counts as $count) {
            $count->update([
                'is_approved' => true,
                'approved_by' => $userId,
                'approved_at' => $now,
            ]);
        }

        return back()->with('success', count($counts) . ' inventory count(s) approved successfully.');
    }

    /**
     * API: Unapprove multiple inventory counts at once - returns JSON
     */
    public function apiBulkUnapprove(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (!$user->can('unapprove inventory counts')) {
            return response()->json(['message' => 'You do not have permission to unapprove inventory counts.'], 403);
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:inventory_counts,id'],
        ]);

        $counts = InventoryCount::whereIn('id', $validated['ids'])
            ->where('is_approved', true)
            ->get();

        if ($counts->isEmpty()) {
            return response()->json(['message' => 'No approved inventory counts found with the provided IDs.'], 400);
        }

        foreach ($counts as $count) {
            $count->update([
                'is_approved' => false,
                'approved_by' => null,
                'approved_at' => null,
            ]);
        }

        return response()->json([
            'message' => count($counts) . ' inventory count(s) unapproved successfully',
            'data' => $counts,
        ]);
    }

    /**
     * Inertia: Unapprove multiple inventory counts at once
     */
    public function bulkUnapprove(Request $request): RedirectResponse
    {
        $user = auth()->user();

        if (!$user->can('unapprove inventory counts')) {
            abort(403, 'You do not have permission to unapprove inventory counts.');
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:inventory_counts,id'],
        ]);

        $counts = InventoryCount::with('inventoryPeriod')
            ->whereIn('id', $validated['ids'])
            ->where('is_approved', true)
            ->get();

        if ($counts->isEmpty()) {
            return back()->withErrors(['error' => 'No approved inventory counts found with the provided IDs.']);
        }

        // Check if all counts are from active periods
        $inactiveCounts = $counts->filter(function ($count) {
            return $count->inventoryPeriod->status !== 'active';
        });

        if ($inactiveCounts->isNotEmpty()) {
            return back()->withErrors(['error' => 'Cannot unapprove inventory counts from inactive periods.']);
        }

        foreach ($counts as $count) {
            $count->update([
                'is_approved' => false,
                'approved_by' => null,
                'approved_at' => null,
            ]);
        }

        return back()->with('success', count($counts) . ' inventory count(s) unapproved successfully.');
    }
}
