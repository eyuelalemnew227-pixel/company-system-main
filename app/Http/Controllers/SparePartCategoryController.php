<?php

namespace App\Http\Controllers;

use App\Models\SparePartCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SparePartCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        $query = SparePartCategory::query()->withCount('spareParts');

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $categories = $query->orderByDesc('id')->paginate(15)->withQueryString();

        return Inertia::render('spare-part-categories/Index', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('spare-part-categories/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:spare_part_categories,name'],
        ]);

        SparePartCategory::create($validated);

        return redirect()->route('spare-part-categories.index')
            ->with('success', 'Category created successfully.');
    }

    public function edit(SparePartCategory $sparePartCategory): Response
    {
        return Inertia::render('spare-part-categories/Edit', [
            'category' => $sparePartCategory,
        ]);
    }

    public function update(Request $request, SparePartCategory $sparePartCategory): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:spare_part_categories,name,' . $sparePartCategory->id],
        ]);

        $sparePartCategory->update($validated);

        return redirect()->route('spare-part-categories.index')
            ->with('success', 'Category updated successfully.');
    }

    public function destroy(SparePartCategory $sparePartCategory): RedirectResponse
    {
        $sparePartCategory->delete();

        return redirect()->route('spare-part-categories.index')
            ->with('success', 'Category deleted successfully.');
    }
}
