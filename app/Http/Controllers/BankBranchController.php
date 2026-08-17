<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\BankBranch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class BankBranchController extends Controller
{
    public function index()
    {
        abort_unless(auth()->user()->can('manage bank branches'), 403);

        $branches = BankBranch::with(['bank', 'creator', 'updator'])->latest()->get();
        $banks = Bank::where('status', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Budget/BankBalance/BankBranches/Index', [
            'bankBranches' => $branches,
            'banks' => $banks
        ]);
    }

    public function store(Request $request)
    {
        abort_unless(auth()->user()->can('manage bank branches'), 403);

        $validated = $request->validate([
            'bank_id' => 'required|exists:banks,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('bank_branches')->where(function ($query) use ($request) {
                    return $query->where('bank_id', $request->bank_id);
                })
            ],
            'status' => 'boolean',
        ]);

        $validated['created_by'] = Auth::id();

        BankBranch::create($validated);

        return redirect()->back()->with('message', 'Bank branch created successfully.');
    }

    public function update(Request $request, BankBranch $bankBranch)
    {
        abort_unless(auth()->user()->can('manage bank branches'), 403);

        $validated = $request->validate([
            'bank_id' => 'required|exists:banks,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('bank_branches')->where(function ($query) use ($request) {
                    return $query->where('bank_id', $request->bank_id);
                })->ignore($bankBranch->id)
            ],
            'status' => 'boolean',
        ]);

        $validated['updated_by'] = Auth::id();

        $bankBranch->update($validated);

        return redirect()->back()->with('message', 'Bank branch updated successfully.');
    }

    public function destroy(BankBranch $bankBranch)
    {
        abort_unless(auth()->user()->can('manage bank branches'), 403);

        $bankBranch->delete();

        return redirect()->back()->with('message', 'Bank branch deleted successfully.');
    }
}
