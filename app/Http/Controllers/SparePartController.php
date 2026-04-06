<?php

namespace App\Http\Controllers;

use App\Models\SparePart;
use App\Models\SparePartCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SparePartController extends Controller
{
    public function index(Request $request): Response
    {
        $query = SparePart::query()->with('category:id,name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('article_code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->query('spare_part_category_id')) {
            $query->where('spare_part_category_id', $categoryId);
        }

        $spareParts = $query->orderByDesc('id')->paginate(15)->withQueryString();

        return Inertia::render('spare-parts/Index', [
            'spareParts' => $spareParts,
            'categories' => SparePartCategory::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'spare_part_category_id']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('spare-parts/Create', [
            'categories' => SparePartCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'article_code' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'spare_part_category_id' => ['required', 'exists:spare_part_categories,id'],
        ]);

        SparePart::create($validated);

        return redirect()->route('spare-parts.index')
            ->with('success', 'Spare part created successfully.');
    }

    public function edit(SparePart $sparePart): Response
    {
        return Inertia::render('spare-parts/Edit', [
            'sparePart' => $sparePart->load('category:id,name'),
            'categories' => SparePartCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, SparePart $sparePart): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'article_code' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'spare_part_category_id' => ['required', 'exists:spare_part_categories,id'],
        ]);

        $sparePart->update($validated);

        return redirect()->route('spare-parts.index')
            ->with('success', 'Spare part updated successfully.');
    }

    public function destroy(SparePart $sparePart): RedirectResponse
    {
        $sparePart->delete();

        return redirect()->route('spare-parts.index')
            ->with('success', 'Spare part deleted successfully.');
    }
}
