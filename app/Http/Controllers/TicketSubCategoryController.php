<?php

namespace App\Http\Controllers;

use App\Http\Requests\TicketSubCategoryRequest;
use App\Models\TicketMainCategory;
use App\Models\TicketSubCategory;
use Inertia\Inertia;

class TicketSubCategoryController extends Controller
{
    public function index()
    {
        return redirect()->route('ticket-settings.index');
    }

    public function create()
    {
        return Inertia::render('tickets/sub-categories/create', [
            'mainCategories' => TicketMainCategory::with('department')->orderBy('name')->get(),
        ]);
    }

    public function store(TicketSubCategoryRequest $request)
    {
        $data = $request->validated();
        TicketSubCategory::create($data);

        return redirect()->route('ticket-settings.index')->with('message', 'Sub category created.');
    }

    public function edit(TicketSubCategory $ticketSubCategory)
    {
        return Inertia::render('tickets/sub-categories/edit', [
            'subCategory' => $ticketSubCategory,
            'mainCategories' => TicketMainCategory::with('department')->orderBy('name')->get(),
        ]);
    }

    public function update(TicketSubCategoryRequest $request, TicketSubCategory $ticketSubCategory)
    {
        $data = $request->validated();
        $ticketSubCategory->update($data);

        return redirect()->route('ticket-settings.index')->with('message', 'Sub category updated.');
    }

    public function toggleStatus(TicketSubCategory $ticketSubCategory)
    {
        $ticketSubCategory->update(['is_active' => !$ticketSubCategory->is_active]);
        return back()->with('message', 'Status updated.');
    }

    public function destroy(TicketSubCategory $ticketSubCategory)
    {
        $ticketSubCategory->delete();
        return redirect()->route('ticket-settings.index')->with('message', 'Sub category deleted.');
    }
}
