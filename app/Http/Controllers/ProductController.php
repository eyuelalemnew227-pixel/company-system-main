<?php

namespace App\Http\Controllers;

use App\Models\ChildCategory;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Display a paginated listing of the products.
     */
    public function index(Request $request): Response
    {
        $query = Product::query()->with('childCategory:id,child_name');

        if ($search = $request->query('search')) {
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            });
        }

        if ($childCategoryId = $request->query('child_category_id')) {
            $query->where('child_category_id', $childCategoryId);
        }

        $perPage = (int) $request->query('per_page', 15);
        $perPage = $perPage > 0 ? $perPage : 15;

        $products = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return Inertia::render('products/Index', [
            'products' => $products,
            'childCategories' => ChildCategory::where('status', 'Active')->get(['id', 'child_name']),
            'filters' => $request->only(['search', 'child_category_id', 'per_page']),
        ]);
    }

    /**
     * Show the form for creating a new product.
     */
    public function create(): Response
    {
        return Inertia::render('products/Create', [
            'childCategories' => ChildCategory::where('status', 'Active')->get(['id', 'child_name']),
        ]);
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_name' => ['required', 'string', 'max:100'],
            'product_code' => ['nullable', 'string', 'max:50'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'child_category_id' => ['required', 'integer', 'exists:child_categories,id'],
            'min_count_threshold' => ['nullable', 'numeric', 'min:0'],
            'max_count_threshold' => ['nullable', 'numeric', 'min:0'],
            'measurement' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        if ($validated['min_count_threshold'] !== null && $validated['max_count_threshold'] !== null) {
            if ($validated['max_count_threshold'] < $validated['min_count_threshold']) {
                return back()->withErrors(['max_count_threshold' => 'The max count threshold must be greater than or equal to the min count threshold.'])->withInput();
            }
        }

        Product::create($validated);

        return redirect()->route('products.index')
            ->with('success', 'Product created successfully.');
    }

    /**
     * Show the form for editing the specified product.
     */
    public function edit(Product $product): Response
    {
        return Inertia::render('products/Edit', [
            'product' => $product,
            'childCategories' => ChildCategory::where('status', 'Active')->get(['id', 'child_name']),
        ]);
    }

    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate([
            'product_name' => ['required', 'string', 'max:100'],
            'product_code' => ['nullable', 'string', 'max:50'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'child_category_id' => ['required', 'integer', 'exists:child_categories,id'],
            'min_count_threshold' => ['nullable', 'numeric', 'min:0'],
            'max_count_threshold' => ['nullable', 'numeric', 'min:0'],
            'measurement' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        if ($validated['min_count_threshold'] !== null && $validated['max_count_threshold'] !== null) {
            if ($validated['max_count_threshold'] < $validated['min_count_threshold']) {
                return back()->withErrors(['max_count_threshold' => 'The max count threshold must be greater than or equal to the min count threshold.'])->withInput();
            }
        }

        $product->update($validated);

        return redirect()->route('products.index')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Remove the specified product from storage.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Product deleted successfully.');
    }
}


