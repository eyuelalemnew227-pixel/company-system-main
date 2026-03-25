<?php

namespace App\Http\Controllers;

use App\Http\Requests\TicketAssetRequest;
use App\Models\Department;
use App\Models\TicketAsset;
use App\Models\TicketSubCategory;
use Inertia\Inertia;

class TicketAssetController extends Controller
{
    public function index()
    {
        return redirect()->route('ticket-settings.index');
    }

    public function create()
    {
        return Inertia::render('tickets/assets/create', [
            'departments' => Department::where('is_active_on_ticketing', true)->orderBy('name')->get(),
            'mainCategories' => \App\Models\TicketMainCategory::with('department')->orderBy('name')->get(),
            'subCategories' => TicketSubCategory::with('mainCategory')->orderBy('name')->get(),
        ]);
    }

    public function store(TicketAssetRequest $request)
    {
        TicketAsset::create($request->validated());

        return redirect()->route('ticket-settings.index')->with('message', 'Asset created.');
    }

    public function edit(TicketAsset $ticketAsset)
    {
        return Inertia::render('tickets/assets/edit', [
            'asset' => $ticketAsset,
            'departments' => Department::where('is_active_on_ticketing', true)->orderBy('name')->get(),
            'mainCategories' => \App\Models\TicketMainCategory::with('department')->orderBy('name')->get(),
            'subCategories' => TicketSubCategory::with('mainCategory')->orderBy('name')->get(),
        ]);
    }

    public function update(TicketAssetRequest $request, TicketAsset $ticketAsset)
    {
        $ticketAsset->update($request->validated());

        return redirect()->route('ticket-settings.index')->with('message', 'Asset updated.');
    }

    public function destroy(TicketAsset $ticketAsset)
    {
        $ticketAsset->delete();
        return redirect()->route('ticket-settings.index')->with('message', 'Asset deleted.');
    }
}
