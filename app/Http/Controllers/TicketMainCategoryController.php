<?php

namespace App\Http\Controllers;

use App\Http\Requests\TicketMainCategoryRequest;
use App\Models\Department;
use App\Models\TicketMainCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TicketMainCategoryController extends Controller
{
    public function index(Request $request)
    {
        // Redirect to unified Ticket Settings page
        return redirect()->route('ticket-settings.index');
    }

    public function create()
    {
        return Inertia::render('tickets/main-categories/create', [
            'departments' => Department::where('is_active_on_ticketing', true)->orderBy('name')->get(),
        ]);
    }

    public function store(TicketMainCategoryRequest $request)
    {
        $data = $request->validated();
        TicketMainCategory::create($data);

        return redirect()->route('ticket-settings.index')->with('message', 'Main category created.');
    }

    public function edit(TicketMainCategory $ticketMainCategory)
    {
        return Inertia::render('tickets/main-categories/edit', [
            'category' => $ticketMainCategory,
            'departments' => Department::where('is_active_on_ticketing', true)->orderBy('name')->get(),
        ]);
    }

    public function update(TicketMainCategoryRequest $request, TicketMainCategory $ticketMainCategory)
    {
        $data = $request->validated();
        $ticketMainCategory->update($data);

        return redirect()->route('ticket-settings.index')->with('message', 'Main category updated.');
    }

    public function destroy(TicketMainCategory $ticketMainCategory)
    {
        $ticketMainCategory->delete();
        return redirect()->route('ticket-settings.index')->with('message', 'Main category deleted.');
    }
}
