<?php

namespace App\Http\Controllers;

use App\Models\TicketAsset;
use App\Models\TicketMainCategory;
use App\Models\TicketSubCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TicketSettingsController extends Controller
{
    public function mainCategories(Request $request)
    {
        $this->authorize('ticket.manage.taxonomy');

        $filters = $request->only(['search', 'department_id']);

        $mainCategories = TicketMainCategory::with('department')
            ->when($filters['search'] ?? null, fn($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['department_id'] ?? null, fn($q, $deptId) => $q->where('department_id', $deptId))
            ->orderBy('department_id')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('tickets/settings/main-categories', [
            'mainCategories' => $mainCategories,
            'filters' => $filters,
            'departments' => \App\Models\Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function subCategories(Request $request)
    {
        $this->authorize('ticket.manage.taxonomy');

        $filters = $request->only(['search', 'main_category_id', 'department_id']);

        $subCategories = TicketSubCategory::with('mainCategory.department')
            ->when($filters['search'] ?? null, fn($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['main_category_id'] ?? null, fn($q, $mainId) => $q->where('ticket_main_category_id', $mainId))
            ->when(
                $filters['department_id'] ?? null,
                fn($q, $deptId) =>
                $q->whereHas('mainCategory', fn($sq) => $sq->where('department_id', $deptId))
            )
            ->orderBy('ticket_main_category_id')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('tickets/settings/sub-categories', [
            'subCategories' => $subCategories,
            'filters' => $filters,
            'mainCategories' => TicketMainCategory::orderBy('name')->get(['id', 'name']),
            'departments' => \App\Models\Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function assets(Request $request)
    {
        $this->authorize('ticket.manage.taxonomy');

        $filters = $request->only(['search', 'department_id', 'main_category_id', 'sub_category_id']);

        $assets = \App\Models\TicketAsset::with(['department', 'mainCategory', 'subCategory'])
            ->when(
                $filters['search'] ?? null,
                fn($q, $search) =>
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('article_code', 'like', "%{$search}%")
            )
            ->when($filters['department_id'] ?? null, fn($q, $deptId) => $q->where('department_id', $deptId))
            ->when($filters['main_category_id'] ?? null, fn($q, $mainId) => $q->where('ticket_main_category_id', $mainId))
            ->when($filters['sub_category_id'] ?? null, fn($q, $subId) => $q->where('ticket_sub_category_id', $subId))
            ->orderBy('department_id')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('tickets/settings/assets', [
            'assets' => $assets,
            'filters' => $filters,
            'departments' => \App\Models\Department::orderBy('name')->get(['id', 'name']),
            'mainCategories' => TicketMainCategory::orderBy('name')->get(['id', 'name']),
            'subCategories' => TicketSubCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }
}
