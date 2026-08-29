<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\SopAcknowledgement;
use App\Models\Training\SopDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SopController extends Controller
{
    public function index(Request $request): Response
    {
        $employee = $request->user()->employee;

        $sops = SopDocument::withCount('acknowledgements')
            ->where('status', 'active')
            ->latest()
            ->get();

        $myAcknowledgements = [];
        if ($employee) {
            $myAcknowledgements = SopAcknowledgement::where('employee_id', $employee->id)
                ->pluck('sop_id')
                ->toArray();
        }

        return Inertia::render('training/sop/index', [
            'sops' => $sops,
            'myAcknowledgements' => $myAcknowledgements,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'version' => 'required|string|max:50',
            'category' => 'required|string|max:100',
            'content' => 'required|string',
            'effective_date' => 'nullable|date',
            'requires_acknowledgement' => 'boolean',
            'status' => 'required|in:active,archived',
        ]);

        SopDocument::create($validated);

        return back()->with('success', 'SOP Document created successfully.');
    }

    public function show(SopDocument $sop, Request $request): Response
    {
        $employee = $request->user()->employee;
        $isAcknowledged = false;

        if ($employee) {
            $isAcknowledged = SopAcknowledgement::where('sop_id', $sop->id)
                ->where('employee_id', $employee->id)
                ->exists();
        }

        return Inertia::render('training/sop/show', [
            'sop' => $sop,
            'isAcknowledged' => $isAcknowledged,
        ]);
    }

    public function acknowledge(SopDocument $sop, Request $request): RedirectResponse
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return back()->with('error', 'Employee record not found.');
        }

        SopAcknowledgement::firstOrCreate([
            'sop_id' => $sop->id,
            'employee_id' => $employee->id,
        ], [
            'acknowledged_at' => now(),
            'ip_address' => $request->ip(),
            'digital_signature' => $request->user()->name,
        ]);

        return back()->with('success', 'SOP Acknowledged successfully.');
    }

    public function destroy(SopDocument $sop): RedirectResponse
    {
        $sop->delete();

        return back()->with('success', 'SOP deleted successfully.');
    }
}
