<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class BankController extends Controller
{
    public function index()
    {
        abort_unless(auth()->user()->can('manage banks'), 403);

        $banks = Bank::with(['creator', 'updator'])->latest()->get();

        return Inertia::render('Budget/BankBalance/Banks/Index', [
            'banks' => $banks
        ]);
    }

    public function store(Request $request)
    {
        abort_unless(auth()->user()->can('manage banks'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:banks,name',
            'currency' => 'required|string|max:10',
            'status' => 'boolean',
        ]);

        $validated['created_by'] = Auth::id();

        Bank::create($validated);

        return redirect()->back()->with('message', 'Bank created successfully.');
    }

    public function update(Request $request, Bank $bank)
    {
        abort_unless(auth()->user()->can('manage banks'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:banks,name,' . $bank->id,
            'currency' => 'required|string|max:10',
            'status' => 'boolean',
        ]);

        $validated['updated_by'] = Auth::id();

        $bank->update($validated);

        return redirect()->back()->with('message', 'Bank updated successfully.');
    }

    public function destroy(Bank $bank)
    {
        abort_unless(auth()->user()->can('manage banks'), 403);

        $bank->delete();

        return redirect()->back()->with('message', 'Bank deleted successfully.');
    }
}
