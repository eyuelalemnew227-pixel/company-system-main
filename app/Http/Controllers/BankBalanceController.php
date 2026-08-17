<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Models\BankBalance;
use App\Models\BankBranch;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class BankBalanceController extends Controller
{
    public function index()
    {
        abort_unless(auth()->user()->can('manage bank balance'), 403);

        $bankBalances = BankBalance::with([
            'fiscalYear',
            'fiscalMonth',
            'bank',
            'bankBranch',
            'estimatedWeeklySale',
            'creator',
            'updator'
        ])->latest()->get();

        $fiscalYears = FiscalYear::orderBy('id', 'desc')->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date'])
            ->map(fn($year) => [
                'id' => $year->id,
                'name' => $year->name,
                'gregorian_start_date' => $year->gregorian_start_date ? \Carbon\Carbon::parse($year->gregorian_start_date)->toDateString() : null,
                'gregorian_end_date' => $year->gregorian_end_date ? \Carbon\Carbon::parse($year->gregorian_end_date)->toDateString() : null,
            ])
            ->values();

        $fiscalMonths = FiscalMonth::orderBy('fiscal_year_id')->orderBy('efy_month_number')
            ->get(['id', 'name', 'fiscal_year_id', 'gregorian_start_date', 'gregorian_end_date'])
            ->map(fn($month) => [
                'id' => $month->id,
                'name' => $month->name,
                'fiscal_year_id' => $month->fiscal_year_id,
                'gregorian_start_date' => $month->gregorian_start_date ? \Carbon\Carbon::parse($month->gregorian_start_date)->toDateString() : null,
                'gregorian_end_date' => $month->gregorian_end_date ? \Carbon\Carbon::parse($month->gregorian_end_date)->toDateString() : null,
            ])
            ->values();
        $banks = Bank::where('status', true)->orderBy('name')->get(['id', 'name', 'currency']);
        $branches = BankBranch::where('status', true)->get(['id', 'bank_id', 'name']);

        return Inertia::render('Budget/BankBalance/BankBalances/Index', [
            'bankBalances' => $bankBalances,
            'fiscalYears' => $fiscalYears,
            'fiscalMonths' => $fiscalMonths,
            'banks' => $banks,
            'branches' => $branches,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless(auth()->user()->can('manage bank balance'), 403);

        $validated = $request->validate([
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'fiscal_month_id' => 'required|exists:fiscal_months,id',
            'week_number' => 'required|integer|min:1|max:6',
            'estimated_weekly_sales' => 'required|numeric|min:0',
            'balances' => 'required|array',
            'balances.*.bank_id' => 'required|exists:banks,id',
            'balances.*.bank_branch_id' => 'required|exists:bank_branches,id',
            'balances.*.amount' => 'required|numeric|min:0',
            'balances.*.exchange_rate' => 'required|numeric|min:0',
        ]);

        $userId = Auth::id();

        $estimatedSales = \App\Models\EstimatedWeeklySale::updateOrCreate(
            [
                'fiscal_year_id' => $validated['fiscal_year_id'],
                'fiscal_month_id' => $validated['fiscal_month_id'],
                'week_number' => $validated['week_number'],
            ],
            [
                'amount' => $validated['estimated_weekly_sales'],
                'created_by' => $userId,
                'updated_by' => $userId,
            ]
        );

        foreach ($validated['balances'] as $balance) {
            $existing = BankBalance::where([
                'fiscal_year_id' => $validated['fiscal_year_id'],
                'fiscal_month_id' => $validated['fiscal_month_id'],
                'week_number' => $validated['week_number'],
                'bank_branch_id' => $balance['bank_branch_id'],
            ])->first();

            if ($existing) {
                $existing->update([
                    'amount' => $balance['amount'],
                    'exchange_rate' => $balance['exchange_rate'],
                    'estimated_weekly_sale_id' => $estimatedSales->id,
                    'updated_by' => $userId,
                ]);
            } else {
                BankBalance::create([
                    'fiscal_year_id' => $validated['fiscal_year_id'],
                    'fiscal_month_id' => $validated['fiscal_month_id'],
                    'week_number' => $validated['week_number'],
                    'estimated_weekly_sale_id' => $estimatedSales->id,
                    'bank_id' => $balance['bank_id'],
                    'bank_branch_id' => $balance['bank_branch_id'],
                    'amount' => $balance['amount'],
                    'exchange_rate' => $balance['exchange_rate'],
                    'created_by' => $userId,
                ]);
            }
        }

        return redirect()->back()->with('message', 'Bank balances recorded successfully.');
    }

    public function show($id)
    {
        abort_unless(auth()->user()->can('manage bank balance'), 403);

        $balance = BankBalance::findOrFail($id);

        $periodBalances = BankBalance::with([
            'fiscalYear',
            'fiscalMonth',
            'bank',
            'bankBranch',
            'estimatedWeeklySale',
            'creator',
            'updator'
        ])->where([
                    'fiscal_year_id' => $balance->fiscal_year_id,
                    'fiscal_month_id' => $balance->fiscal_month_id,
                    'week_number' => $balance->week_number,
                ])->get();

        return Inertia::render('Budget/BankBalance/BankBalances/Show', [
            'periodBalances' => $periodBalances,
            'representative' => $balance
        ]);
    }

    public function update(Request $request, BankBalance $bankBalance)
    {
        abort_unless(auth()->user()->can('manage bank balance'), 403);

        $validated = $request->validate([
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'fiscal_month_id' => 'required|exists:fiscal_months,id',
            'week_number' => 'required|integer|min:1|max:5',
            'bank_id' => 'required|exists:banks,id',
            'bank_branch_id' => 'required|exists:bank_branches,id',
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|string|max:10',
            'exchange_rate' => 'required|numeric|min:0',
        ]);

        $validated['updated_by'] = Auth::id();

        $bankBalance->update($validated);

        return redirect()->back()->with('message', 'Bank balance updated successfully.');
    }

    public function destroy($id)
    {
        abort_unless(auth()->user()->can('manage bank balance'), 403);

        $balance = BankBalance::findOrFail($id);

        $periodBalances = BankBalance::where([
            'fiscal_year_id' => $balance->fiscal_year_id,
            'fiscal_month_id' => $balance->fiscal_month_id,
            'week_number' => $balance->week_number,
        ])->get();

        foreach ($periodBalances as $b) {
            $b->delete();
        }

        if ($balance->estimated_weekly_sale_id) {
            $existingReferences = BankBalance::where('estimated_weekly_sale_id', $balance->estimated_weekly_sale_id)->count();
            if ($existingReferences === 0) {
                \App\Models\EstimatedWeeklySale::where('id', $balance->estimated_weekly_sale_id)->delete();
            }
        }

        return redirect()->route('bank-balances.index')
            ->with('flash', ['message' => 'Bank Balance cohort deleted successfully.']);
    }
}
