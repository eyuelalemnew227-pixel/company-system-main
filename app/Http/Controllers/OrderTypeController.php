<?php

namespace App\Http\Controllers;

use App\Models\OrderType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class OrderTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $query = OrderType::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = (int) $request->query('per_page', 15);
        $orderTypes = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return Inertia::render('settings/order-types/Index', [
            'orderTypes' => $orderTypes,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $request->query('status'),
                'per_page' => $request->query('per_page'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('settings/order-types/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        OrderType::create($validated);
        Cache::forget('miniapp_init_data');

        return redirect()->route('order-types.index')
            ->with('success', 'Order type created successfully.');
    }

    public function edit(OrderType $orderType): Response
    {
        return Inertia::render('settings/order-types/Edit', [
            'orderType' => $orderType,
        ]);
    }

    public function update(Request $request, OrderType $orderType): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        $orderType->update($validated);
        Cache::forget('miniapp_init_data');

        return redirect()->route('order-types.index')
            ->with('success', 'Order type updated successfully.');
    }

    public function toggleStatus(OrderType $orderType): RedirectResponse
    {
        $newStatus = $orderType->status === 'Active' ? 'Inactive' : 'Active';
        $orderType->update(['status' => $newStatus]);
        Cache::forget('miniapp_init_data');

        return redirect()->back()
            ->with('success', "Order type source '{$orderType->name}' is now {$newStatus}.");
    }

    public function destroy(OrderType $orderType): RedirectResponse
    {
        $orderType->delete();
        Cache::forget('miniapp_init_data');

        return redirect()->route('order-types.index')
            ->with('success', 'Order type deleted successfully.');
    }
}
