<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use App\Models\PreOrderCost;
use App\Models\PreOrderCostCategory;
use App\Models\PreOrderProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PreOrderCostController extends Controller
{
    public function index()
    {
        if (!auth()->user()->can('manage pre-order costs')) {
            abort(403);
        }

        $costs = PreOrderCost::with(['category', 'holiday', 'creator'])
            ->orderByDesc('date')
            ->paginate(50);

        return Inertia::render('pre-orders/costs/index', [
            'costs' => $costs,
            'categories' => PreOrderCostCategory::orderBy('name')->get(),
            'holidays' => Holiday::orderByDesc('date')->get(['id', 'name', 'date']),
        ]);
    }

    public function store(Request $request)
    {
        if (!auth()->user()->can('manage pre-order costs')) {
            abort(403);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:pre_order_cost_categories,id',
            'holiday_id' => 'required|exists:holidays,id',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:500',
            'pre_order_product_id' => 'nullable|exists:pre_order_products,id',
            'product_cost_per_unit' => 'nullable|numeric|min:0',
        ]);

        // For product costs, use product_cost_per_unit as amount
        if (isset($validated['pre_order_product_id']) && $validated['pre_order_product_id']) {
            $validated['amount'] = $validated['product_cost_per_unit'] ?? 0;
        }

        $validated['created_by'] = auth()->id();

        PreOrderCost::create($validated);

        return redirect()->back()
            ->with('success', 'Cost recorded successfully.');
    }

    public function update(Request $request, PreOrderCost $preOrderCost)
    {
        if (!auth()->user()->can('manage pre-order costs')) {
            abort(403);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:pre_order_cost_categories,id',
            'holiday_id' => 'required|exists:holidays,id',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $preOrderCost->update($validated);

        return redirect()->back()->with('success', 'Cost entry updated successfully.');
    }

    public function destroy(PreOrderCost $preOrderCost)
    {
        if (!auth()->user()->can('manage pre-order costs')) {
            abort(403);
        }

        $preOrderCost->delete();

        return redirect()->back()->with('success', 'Cost entry deleted successfully.');
    }

    /**
     * Bulk update product costs for a holiday
     */
    public function bulkUpdateProductCosts(Request $request)
    {
        if (!auth()->user()->can('manage pre-order costs')) {
            abort(403);
        }

        $validated = $request->validate([
            'holiday_id' => 'required|exists:holidays,id',
            'product_costs' => 'required|array',
            'product_costs.*.pre_order_product_id' => 'required|exists:pre_order_products,id',
            'product_costs.*.cost_per_unit' => 'required|numeric|min:0',
        ]);

        $holidayId = $validated['holiday_id'];
        $productCosts = $validated['product_costs'];

        // Use first category or create a default "Product Cost" category
        $category = PreOrderCostCategory::firstOrCreate(
            ['name' => 'Product Cost'],
            ['description' => 'Auto-created category for per-product costs']
        );

        DB::transaction(function () use ($holidayId, $productCosts, $category) {
            foreach ($productCosts as $costData) {
                if ($costData['cost_per_unit'] <= 0) {
                    continue;
                }

                PreOrderCost::updateOrCreate(
                    [
                        'holiday_id' => $holidayId,
                        'pre_order_product_id' => $costData['pre_order_product_id'],
                    ],
                    [
                        'amount' => $costData['cost_per_unit'],
                        'product_cost_per_unit' => $costData['cost_per_unit'],
                        'category_id' => $category->id,
                        'date' => now()->toDateString(),
                        'created_by' => auth()->id(),
                    ]
                );
            }
        });

        return redirect()->back()->with('success', 'Product costs updated successfully.');
    }

    /**
     * Get active products with their existing cost for a specific holiday
     */
    public function getActiveProducts(Request $request)
    {
        $holidayId = $request->query('holiday_id');

        $products = PreOrderProduct::where('status', 'Active')
            ->orderByDesc('has_discount')
            ->orderBy('product_name', 'asc')
            ->get(['id', 'product_name', 'unit_price', 'has_discount']);

        // If holiday specified, attach existing cost_per_unit for each product
        if ($holidayId) {
            $existingCosts = PreOrderCost::where('holiday_id', $holidayId)
                ->whereNotNull('pre_order_product_id')
                ->pluck('product_cost_per_unit', 'pre_order_product_id');

            $products->each(function ($product) use ($existingCosts) {
                $product->existing_cost = $existingCosts[$product->id] ?? null;
            });
        }

        return response()->json($products);
    }
}
