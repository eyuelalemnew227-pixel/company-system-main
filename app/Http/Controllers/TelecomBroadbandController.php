<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\TelecomBroadband;
use App\Models\TelecomProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TelecomBroadbandController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TelecomBroadband::query()
            ->with(['provider:id,name', 'branch:id,name', 'department:id,name']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('connection_name', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('package_type', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('installation_address', 'like', "%{$search}%")
                    ->orWhere('equipment_details', 'like', "%{$search}%");
            });
        }

        if ($connectionType = $request->query('connection_type')) {
            $query->where('connection_type', $connectionType);
        }

        if ($providerId = $request->query('telecom_provider_id')) {
            $query->where('telecom_provider_id', $providerId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($branchId = $request->query('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        $perPage = (int) $request->query('per_page', 15);
        $broadbands = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return Inertia::render('telecom/broadbands/Index', [
            'broadbands' => $broadbands,
            'providers' => TelecomProvider::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'connection_type', 'telecom_provider_id', 'status', 'branch_id', 'per_page']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('telecom/broadbands/Create', [
            'providers' => TelecomProvider::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'account_number' => ['nullable', 'string', 'max:100'],
            'connection_name' => ['required', 'string', 'max:255'],
            'connection_type' => ['required', 'string', 'max:100'],
            'telecom_provider_id' => ['nullable', 'exists:telecom_providers,id'],
            'package_type' => ['nullable', 'string', 'max:150'],
            'bandwidth_speed' => ['nullable', 'string', 'max:100'],
            'monthly_cost' => ['required', 'numeric', 'min:0'],
            'billing_type' => ['required', 'string', 'max:50'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'installation_address' => ['nullable', 'string', 'max:255'],
            'ip_address' => ['nullable', 'string', 'max:100'],
            'equipment_details' => ['nullable', 'string'],
            'contract_start_date' => ['nullable', 'date'],
            'contract_expiry_date' => ['nullable', 'date'],
            'status' => ['required', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        TelecomBroadband::create($validated);

        return redirect()->route('telecom.broadbands.index')
            ->with('success', 'Broadband / WTTx connection recorded successfully.');
    }

    public function edit(TelecomBroadband $broadband): Response
    {
        return Inertia::render('telecom/broadbands/Edit', [
            'broadband' => $broadband->load(['provider', 'branch', 'department']),
            'providers' => TelecomProvider::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, TelecomBroadband $broadband): RedirectResponse
    {
        $validated = $request->validate([
            'account_number' => ['nullable', 'string', 'max:100'],
            'connection_name' => ['required', 'string', 'max:255'],
            'connection_type' => ['required', 'string', 'max:100'],
            'telecom_provider_id' => ['nullable', 'exists:telecom_providers,id'],
            'package_type' => ['nullable', 'string', 'max:150'],
            'bandwidth_speed' => ['nullable', 'string', 'max:100'],
            'monthly_cost' => ['required', 'numeric', 'min:0'],
            'billing_type' => ['required', 'string', 'max:50'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'installation_address' => ['nullable', 'string', 'max:255'],
            'ip_address' => ['nullable', 'string', 'max:100'],
            'equipment_details' => ['nullable', 'string'],
            'contract_start_date' => ['nullable', 'date'],
            'contract_expiry_date' => ['nullable', 'date'],
            'status' => ['required', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $broadband->update($validated);

        return redirect()->route('telecom.broadbands.index')
            ->with('success', 'Broadband / WTTx connection updated successfully.');
    }

    public function destroy(TelecomBroadband $broadband): RedirectResponse
    {
        $broadband->delete();

        return redirect()->route('telecom.broadbands.index')
            ->with('success', 'Broadband / WTTx connection deleted successfully.');
    }

    public function export(Request $request): StreamedResponse
    {
        $query = TelecomBroadband::query()
            ->with(['provider:id,name', 'branch:id,name', 'department:id,name']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('connection_name', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('package_type', 'like', "%{$search}%");
            });
        }

        $items = $query->orderBy('connection_name')->get();

        $response = new StreamedResponse(function () use ($items) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'ID', 'Connection Name', 'Account / Circuit No', 'Connection Type', 'Provider',
                'Package Type', 'Bandwidth / Speed', 'Billing Type', 'Monthly Cost',
                'Branch', 'Department', 'IP Address', 'Status', 'Start Date', 'Expiry Date', 'Equipment'
            ]);

            foreach ($items as $item) {
                fputcsv($handle, [
                    $item->id,
                    $item->connection_name,
                    $item->account_number ?? '',
                    $item->connection_type,
                    $item->provider?->name ?? 'N/A',
                    $item->package_type ?? '',
                    $item->bandwidth_speed ?? '',
                    $item->billing_type,
                    $item->monthly_cost,
                    $item->branch?->name ?? '-',
                    $item->department?->name ?? '-',
                    $item->ip_address ?? '-',
                    $item->status,
                    $item->contract_start_date ? $item->contract_start_date->format('Y-m-d') : '',
                    $item->contract_expiry_date ? $item->contract_expiry_date->format('Y-m-d') : '',
                    $item->equipment_details ?? '',
                ]);
            }
            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="company_broadbands_wttx_' . date('Y-m-d') . '.csv"');

        return $response;
    }
}
