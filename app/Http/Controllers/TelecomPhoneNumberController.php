<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\TelecomPhoneNumber;
use App\Models\TelecomProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TelecomPhoneNumberController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TelecomPhoneNumber::query()
            ->with(['provider:id,name', 'employee:id,first_name,last_name,employee_code', 'branch:id,name', 'department:id,name']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('phone_number', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('sim_card_number', 'like', "%{$search}%")
                    ->orWhere('package_type', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($providerId = $request->query('telecom_provider_id')) {
            $query->where('telecom_provider_id', $providerId);
        }

        if ($serviceType = $request->query('service_type')) {
            $query->where('service_type', $serviceType);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($assignedType = $request->query('assigned_type')) {
            $query->where('assigned_type', $assignedType);
        }

        if ($branchId = $request->query('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        $perPage = (int) $request->query('per_page', 15);
        $phoneNumbers = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return Inertia::render('telecom/phone-numbers/Index', [
            'phoneNumbers' => $phoneNumbers,
            'providers' => TelecomProvider::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'telecom_provider_id', 'service_type', 'status', 'assigned_type', 'branch_id', 'per_page']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('telecom/phone-numbers/Create', [
            'providers' => TelecomProvider::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'employees' => Employee::select('id', 'first_name', 'last_name', 'employee_code')->orderBy('first_name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'phone_number' => ['required', 'string', 'max:50', 'unique:telecom_phone_numbers,phone_number'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'sim_card_number' => ['nullable', 'string', 'max:100'],
            'telecom_provider_id' => ['nullable', 'exists:telecom_providers,id'],
            'service_type' => ['required', 'string', 'max:50'],
            'package_type' => ['nullable', 'string', 'max:150'],
            'monthly_cost' => ['required', 'numeric', 'min:0'],
            'billing_type' => ['required', 'string', 'max:50'],
            'assigned_type' => ['required', 'string', 'max:50'],
            'employee_id' => ['nullable', 'exists:employees,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'status' => ['required', 'string', 'max:50'],
            'issue_date' => ['nullable', 'date'],
            'renewal_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        TelecomPhoneNumber::create($validated);

        return redirect()->route('telecom.phone-numbers.index')
            ->with('success', 'Phone number created successfully.');
    }

    public function edit(TelecomPhoneNumber $phoneNumber): Response
    {
        return Inertia::render('telecom/phone-numbers/Edit', [
            'phoneNumber' => $phoneNumber->load(['provider', 'employee', 'branch', 'department']),
            'providers' => TelecomProvider::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'employees' => Employee::select('id', 'first_name', 'last_name', 'employee_code')->orderBy('first_name')->get(),
        ]);
    }

    public function update(Request $request, TelecomPhoneNumber $phoneNumber): RedirectResponse
    {
        $validated = $request->validate([
            'phone_number' => ['required', 'string', 'max:50', 'unique:telecom_phone_numbers,phone_number,' . $phoneNumber->id],
            'account_number' => ['nullable', 'string', 'max:100'],
            'sim_card_number' => ['nullable', 'string', 'max:100'],
            'telecom_provider_id' => ['nullable', 'exists:telecom_providers,id'],
            'service_type' => ['required', 'string', 'max:50'],
            'package_type' => ['nullable', 'string', 'max:150'],
            'monthly_cost' => ['required', 'numeric', 'min:0'],
            'billing_type' => ['required', 'string', 'max:50'],
            'assigned_type' => ['required', 'string', 'max:50'],
            'employee_id' => ['nullable', 'exists:employees,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'status' => ['required', 'string', 'max:50'],
            'issue_date' => ['nullable', 'date'],
            'renewal_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $phoneNumber->update($validated);

        return redirect()->route('telecom.phone-numbers.index')
            ->with('success', 'Phone number updated successfully.');
    }

    public function destroy(TelecomPhoneNumber $phoneNumber): RedirectResponse
    {
        $phoneNumber->delete();

        return redirect()->route('telecom.phone-numbers.index')
            ->with('success', 'Phone number deleted successfully.');
    }

    public function export(Request $request): StreamedResponse
    {
        $query = TelecomPhoneNumber::query()
            ->with(['provider:id,name', 'employee:id,first_name,last_name', 'branch:id,name', 'department:id,name']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('phone_number', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('package_type', 'like', "%{$search}%");
            });
        }

        $items = $query->orderBy('phone_number')->get();

        $response = new StreamedResponse(function () use ($items) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'ID', 'Phone Number', 'Account No', 'SIM Card / ICCID', 'Provider',
                'Service Type', 'Package Type', 'Billing Type', 'Monthly Cost',
                'Assigned To', 'Assigned Name', 'Status', 'Issue Date', 'Renewal Date', 'Notes'
            ]);

            foreach ($items as $item) {
                $assignedName = '-';
                if ($item->assigned_type === 'Employee' && $item->employee) {
                    $assignedName = $item->employee->first_name . ' ' . $item->employee->last_name;
                } elseif ($item->assigned_type === 'Branch' && $item->branch) {
                    $assignedName = $item->branch->name;
                } elseif ($item->assigned_type === 'Department' && $item->department) {
                    $assignedName = $item->department->name;
                }

                fputcsv($handle, [
                    $item->id,
                    $item->phone_number,
                    $item->account_number ?? '',
                    $item->sim_card_number ?? '',
                    $item->provider?->name ?? 'N/A',
                    $item->service_type,
                    $item->package_type ?? '',
                    $item->billing_type,
                    $item->monthly_cost,
                    $item->assigned_type,
                    $assignedName,
                    $item->status,
                    $item->issue_date ? $item->issue_date->format('Y-m-d') : '',
                    $item->renewal_date ? $item->renewal_date->format('Y-m-d') : '',
                    $item->notes ?? '',
                ]);
            }
            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="company_phone_numbers_' . date('Y-m-d') . '.csv"');

        return $response;
    }
}
