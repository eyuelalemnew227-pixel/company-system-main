<?php

namespace App\Http\Controllers;

use App\Models\FiscalYear;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class FiscalYearController extends Controller
{
    public function index(Request $request)
    {
        $query = FiscalYear::withCount('fiscalMonths');

        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // status filter removed

        $fiscalYears = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('FiscalYears/Index', [
            'fiscalYears' => $fiscalYears,
            'request' => $request->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('FiscalYears/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:fiscal_years,name',
            'gregorian_start_date' => 'required|date',
            'gregorian_end_date' => 'required|date|after:gregorian_start_date',
        ]);

        FiscalYear::create($validated);

        return Redirect::route('fiscal-years.index')->with('flash.message', 'Fiscal Year created successfully!');
    }

    public function edit(FiscalYear $fiscalYear)
    {
        return Inertia::render('FiscalYears/Edit', [
            'fiscalYear' => $fiscalYear,
        ]);
    }

    public function update(Request $request, FiscalYear $fiscalYear)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:fiscal_years,name,' . $fiscalYear->id,
            'gregorian_start_date' => 'required|date',
            'gregorian_end_date' => 'required|date|after:gregorian_start_date',
        ]);

        $fiscalYear->update($validated);

        return Redirect::route('fiscal-years.index')->with('flash.message', 'Fiscal Year updated successfully!');
    }

    public function destroy(FiscalYear $fiscalYear)
    {
        $fiscalYear->delete();

        return Redirect::route('fiscal-years.index')->with('flash.message', 'Fiscal Year deleted successfully!');
    }
}
