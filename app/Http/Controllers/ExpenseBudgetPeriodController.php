<?php

namespace App\Http\Controllers;

use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\ExpenseBudgetPeriod;
use App\Support\ExpenseBudgetAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseBudgetPeriodController extends Controller
{
    /**
     * Display a listing of the expense budget periods.
     */
    public function index(Request $request): Response
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $query = ExpenseBudgetPeriod::query()->with(['fiscalYear:id,name', 'fiscalMonth:id,name,fiscal_year_id']);

        if ($search = $request->query('search')) {
            $query->where('period_name', 'like', "%{$search}%");
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($fiscalYearId = $request->query('fiscal_year_id')) {
            $query->where('fiscal_year_id', $fiscalYearId);
        }

        if ($fiscalMonthId = $request->query('fiscal_month_id')) {
            $query->where('fiscal_month_id', $fiscalMonthId);
        }

        $perPage = max((int) $request->query('per_page', 15), 1);

        $periods = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return Inertia::render('expense-budget-periods/Index', [
            'expenseBudgetPeriods' => $periods,
            'fiscalYears' => FiscalYear::all(['id', 'name']),
            'fiscalMonths' => FiscalMonth::all(['id', 'name', 'fiscal_year_id']),
            'filters' => $request->only(['search', 'status', 'fiscal_year_id', 'fiscal_month_id', 'per_page']),
        ]);
    }

    /**
     * Show the form for creating a new expense budget period.
     */
    public function create(): Response
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        return Inertia::render('expense-budget-periods/Create', [
            'fiscalYears' => FiscalYear::all(['id', 'name']),
            'fiscalMonths' => FiscalMonth::all(['id', 'name', 'fiscal_year_id']),
        ]);
    }

    /**
     * Store a newly created expense budget period.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $validated = $request->validate([
            'period_name' => ['required', 'string', 'max:191'],
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => ['required', 'integer', 'exists:fiscal_months,id'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        ExpenseBudgetPeriod::create($validated);

        return redirect()->route('expense-budget-periods.index')
            ->with('success', 'Expense budget period created successfully.');
    }

    /**
     * Show the form for editing the specified expense budget period.
     */
    public function edit(ExpenseBudgetPeriod $expenseBudgetPeriod): Response
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        return Inertia::render('expense-budget-periods/Edit', [
            'expenseBudgetPeriod' => $expenseBudgetPeriod->load(['fiscalYear:id,name', 'fiscalMonth:id,name,fiscal_year_id']),
            'fiscalYears' => FiscalYear::all(['id', 'name']),
            'fiscalMonths' => FiscalMonth::all(['id', 'name', 'fiscal_year_id']),
        ]);
    }

    /**
     * Update the specified expense budget period in storage.
     */
    public function update(Request $request, ExpenseBudgetPeriod $expenseBudgetPeriod): RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $validated = $request->validate([
            'period_name' => ['required', 'string', 'max:191'],
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => ['required', 'integer', 'exists:fiscal_months,id'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $expenseBudgetPeriod->update($validated);

        return redirect()->route('expense-budget-periods.index')
            ->with('success', 'Expense budget period updated successfully.');
    }

    /**
     * Remove the specified expense budget period from storage.
     */
    public function destroy(ExpenseBudgetPeriod $expenseBudgetPeriod): RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $expenseBudgetPeriod->delete();

        return redirect()->route('expense-budget-periods.index')
            ->with('success', 'Expense budget period deleted successfully.');
    }
}
