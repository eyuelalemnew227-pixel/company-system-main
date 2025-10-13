<?php

namespace App\Http\Controllers;

use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class FiscalMonthController extends Controller
{
    public function index(Request $request)
    {
        $query = FiscalMonth::with('fiscalYear:id,name');

        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', '%' . $request->search . '%')
                ->orWhereHas('fiscalYear', function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%');
                });
        }

        // status filter removed

        if ($request->has('fiscal_year') && $request->fiscal_year !== 'all') {
            $query->where('fiscal_year_id', $request->fiscal_year);
        }

        $fiscalMonths = $query->orderBy('fiscal_year_id', 'desc')
            ->orderBy('efy_month_number')
            ->paginate(10)
            ->withQueryString();

        $fiscalYears = FiscalYear::select('id', 'name')->orderBy('name', 'desc')->get();

        return Inertia::render('FiscalMonths/Index', [
            'fiscalMonths' => $fiscalMonths,
            'fiscalYears' => $fiscalYears,
            'request' => $request->only('search', 'fiscal_year'),
        ]);
    }

    public function create()
    {
        $fiscalYears = FiscalYear::select('id', 'name', 'gregorian_start_date', 'gregorian_end_date')
            ->orderBy('name', 'desc')
            ->get();

        return Inertia::render('FiscalMonths/Create', [
            'fiscalYears' => $fiscalYears,
            'ethiopianMonths' => FiscalMonth::$ethiopianMonths,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'name' => 'required|string|max:255',
            'efy_month_number' => 'required|integer|min:1|max:12',
            'gregorian_start_date' => 'required|date',
            'gregorian_end_date' => 'required|date|after:gregorian_start_date',
            // status removed
        ]);

        FiscalMonth::create($validated);

        return Redirect::route('fiscal-months.index')->with('flash.message', 'Fiscal Month created successfully!');
    }

    public function edit(FiscalMonth $fiscalMonth)
    {
        $fiscalYears = FiscalYear::select('id', 'name', 'gregorian_start_date', 'gregorian_end_date')
            ->orderBy('name', 'desc')
            ->get();

        return Inertia::render('FiscalMonths/Edit', [
            'fiscalMonth' => $fiscalMonth->load('fiscalYear'),
            'fiscalYears' => $fiscalYears,
            'ethiopianMonths' => FiscalMonth::$ethiopianMonths,
        ]);
    }

    public function update(Request $request, FiscalMonth $fiscalMonth)
    {
        $validated = $request->validate([
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'name' => 'required|string|max:255',
            'efy_month_number' => 'required|integer|min:1|max:12',
            'gregorian_start_date' => 'required|date',
            'gregorian_end_date' => 'required|date|after:gregorian_start_date',
            // status removed
        ]);

        $fiscalMonth->update($validated);

        return Redirect::route('fiscal-months.index')->with('flash.message', 'Fiscal Month updated successfully!');
    }

    public function destroy(FiscalMonth $fiscalMonth)
    {
        $fiscalMonth->delete();

        return Redirect::route('fiscal-months.index')->with('flash.message', 'Fiscal Month deleted successfully!');
    }
}
