<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\SalesBudget;
use App\Models\SalesBudgetLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\Rule;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class SalesBudgetController extends Controller
{
    // Check if user can add/edit/delete
private function canModify(): bool
{
    return true;
}

    private function activeBranches()
    {
        return Cache::remember('sales_budget_active_branches', 600, fn () => Branch::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name']));
    }

    private function previousFiscalMonth(FiscalMonth $fiscalMonth): ?FiscalMonth
    {
        return FiscalMonth::query()
            ->with('fiscalYear')
            ->where('gregorian_start_date', '<', $fiscalMonth->gregorian_start_date)
            ->orderByDesc('gregorian_start_date')
            ->first();
    }

    // GET /budget/sales-budget → show list
   public function index(Request $request)
{
    $branchId = $request->input('branch_id');
    $fiscalYearId = $request->input('fiscal_year_id');
    $fiscalMonthId = $request->input('fiscal_month_id');
    $ethiopianYear = $request->input('ethiopian_year');
    $ethiopianMonth = $request->input('ethiopian_month');
    $showUnbudgeted = filter_var($request->input('show_unbudgeted', false), FILTER_VALIDATE_BOOLEAN);

    $allBranches = Branch::query()
        ->where(function ($query) {
            $query->where('status', 'active')
                ->orWhere('name', 'like', '%Head Office%')
                ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
        })
        ->orderBy('name')
        ->get(['id', 'name', 'branch_code']);
    $fiscalYears = FiscalYear::orderByDesc('id')->get();
    $fiscalMonths = FiscalMonth::query()
        ->select('id', 'fiscal_year_id', 'name', 'efy_month_number')
        ->orderBy('fiscal_year_id')
        ->orderBy('efy_month_number')
        ->get();

    $selectedFiscalYear = $fiscalYearId ? $fiscalYears->firstWhere('id', $fiscalYearId) : null;
    $selectedEthiopianYear = $request->filled('ethiopian_year')
        ? (int) $ethiopianYear
        : ($selectedFiscalYear ? (int) str_replace('EFY ', '', $selectedFiscalYear->name) : null);

    $budgetQuery = SalesBudget::query()
        ->with(['branch', 'createdBy', 'updatedBy'])
        ->when($request->filled('branch_id'), function ($query) use ($branchId) {
            $query->where('branch_id', $branchId);
        })
        ->when($request->filled('fiscal_year_id'), function ($query) use ($fiscalYearId) {
            $query->where('fiscal_year_id', $fiscalYearId);
        })
        ->when($request->filled('fiscal_month_id'), function ($query) use ($fiscalMonthId) {
            $query->where('fiscal_month_id', $fiscalMonthId);
        })
        ->when($request->filled('ethiopian_year'), function ($query) use ($ethiopianYear) {
            $query->where('ethiopian_year', (int) $ethiopianYear);
        })
        ->when($request->filled('ethiopian_month'), function ($query) use ($ethiopianMonth) {
            $query->where('ethiopian_month', (int) $ethiopianMonth);
        })
        ->orderBy('fiscal_year_id')
        ->orderBy('fiscal_month_id')
        ->orderBy('branch_id');

    if ($showUnbudgeted && $request->filled('fiscal_year_id') && $request->filled('fiscal_month_id')) {
        $selectedFiscalMonthModel = $fiscalMonths->firstWhere('id', (int) $fiscalMonthId);
        $selectedEthiopianMonth = $selectedFiscalMonthModel?->efy_month_number;

        $budgetsWithBudget = $budgetQuery->get()->keyBy('branch_id');

        $filteredBranches = $request->filled('branch_id')
            ? $allBranches->where('id', (int) $branchId)->values()
            : $allBranches;

        $budgets = $filteredBranches->map(function ($branch) use ($budgetsWithBudget, $selectedEthiopianMonth, $selectedEthiopianYear) {
            $existing = $budgetsWithBudget->get($branch->id);

            if ($existing) {
                return [
                    'id'                  => $existing->id,
                    'branch'              => ['id' => $branch->id, 'name' => $branch->name],
                    'ethiopian_month'     => $existing->ethiopian_month,
                    'ethiopian_year'      => $existing->ethiopian_year,
                    'sales_amount'        => $existing->sales_amount,
                    'prev_expense_budget' => $existing->prev_expense_budget,
                    'created_by'          => $existing->createdBy ? ['name' => $existing->createdBy->name] : null,
                    'updated_by'          => $existing->updatedBy ? ['name' => $existing->updatedBy->name] : null,
                    'has_budget'          => true,
                ];
            }

            return [
                'id'                  => null,
                'branch'              => ['id' => $branch->id, 'name' => $branch->name],
                'ethiopian_month'     => $selectedEthiopianMonth,
                'ethiopian_year'      => $selectedEthiopianYear,
                'sales_amount'        => null,
                'prev_expense_budget' => null,
                'created_by'          => null,
                'updated_by'          => null,
                'has_budget'          => false,
            ];
        })->values();

        $page = LengthAwarePaginator::resolveCurrentPage();
        $perPage = 10;
        $paginatedBudgets = new LengthAwarePaginator(
            $budgets->forPage($page, $perPage)->values(),
            $budgets->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );
    } else {
        $paginatedBudgets = $budgetQuery->paginate(10);
        $paginatedBudgets->getCollection()->transform(function ($budget) {
            return [
                'id'                  => $budget->id,
                'branch'              => ['id' => $budget->branch->id, 'name' => $budget->branch->name],
                'ethiopian_month'     => $budget->ethiopian_month,
                'ethiopian_year'      => $budget->ethiopian_year,
                'sales_amount'        => $budget->sales_amount,
                'prev_expense_budget' => $budget->prev_expense_budget,
                'created_by'          => $budget->createdBy ? ['name' => $budget->createdBy->name] : null,
                'updated_by'          => $budget->updatedBy ? ['name' => $budget->updatedBy->name] : null,
                'has_budget'          => true,
            ];
        });
    }

    return inertia('Budget/SalesBudget/Index', [
        'budgets'     => $paginatedBudgets,
        'branches'    => $allBranches,
        'fiscalYears' => $fiscalYears,
        'fiscalMonths' => $fiscalMonths,
        'monthNames'  => SalesBudget::$monthNames,
        'canModify'   => $this->canModify(),
        'request'     => [
            'branch_id'       => $branchId,
            'fiscal_year_id'  => $fiscalYearId,
            'fiscal_month_id' => $fiscalMonthId,
            'ethiopian_year'  => $ethiopianYear,
            'ethiopian_month' => $ethiopianMonth,
            'show_unbudgeted' => $showUnbudgeted,
        ],
    ]);
}
    // GET /budget/sales-budget/create → show form
 public function create()
{
    

    $branches    = $this->activeBranches();
$fiscalYears = \App\Models\FiscalYear::orderBy('id')->get([
    'id',
    'name',
    'gregorian_start_date',
    'gregorian_end_date'
]);
    $fiscalMonths = FiscalMonth::query()
        ->select('id', 'fiscal_year_id', 'name', 'efy_month_number')
        ->orderBy('fiscal_year_id')
        ->orderBy('efy_month_number')
        ->get();
    $monthNames  = SalesBudget::$monthNames;

    return inertia('Budget/SalesBudget/Create', [
        'branches'    => $branches,
        'fiscalYears' => $fiscalYears,
        'fiscalMonths' => $fiscalMonths,
        'monthNames'  => $monthNames,
    ]);
}

    // GET /budget/sales-budget/period-data → load previous/current month data for all active branches
    public function getPeriodData(Request $request)
    {
        $request->validate([
            'fiscal_year_id' => ['required', 'exists:fiscal_years,id'],
            'fiscal_month_id' => ['required', 'exists:fiscal_months,id'],
        ]);

        $fiscalMonth = FiscalMonth::query()
            ->select('id', 'fiscal_year_id', 'name', 'efy_month_number', 'gregorian_start_date')
            ->whereKey($request->integer('fiscal_month_id'))
            ->firstOrFail();

        $previousFiscalMonth = $this->previousFiscalMonth($fiscalMonth);

        $previousYearLabel = null;
        if ($previousFiscalMonth?->fiscalYear?->name) {
            preg_match('/(\d+)/', $previousFiscalMonth->fiscalYear->name, $previousYearMatches);
            $previousYearLabel = $previousYearMatches[1] ?? $previousFiscalMonth->fiscalYear->name;
        }

        $branches = $this->activeBranches();
        $branchIds = $branches->pluck('id');

        $currentBudgets = SalesBudget::query()
            ->select(['id', 'branch_id', 'sales_amount'])
            ->where('fiscal_year_id', $request->integer('fiscal_year_id'))
            ->where('fiscal_month_id', $request->integer('fiscal_month_id'))
            ->whereIn('branch_id', $branchIds)
            ->get()
            ->keyBy('branch_id');

        $previousBudgets = $previousFiscalMonth
            ? SalesBudget::query()
                ->select(['branch_id', 'sales_amount'])
                ->where('fiscal_month_id', $previousFiscalMonth->id)
                ->whereIn('branch_id', $branchIds)
                ->get()
                ->keyBy('branch_id')
            : collect();

        $rows = $branches->map(function ($branch) use ($currentBudgets, $previousBudgets, $previousFiscalMonth, $previousYearLabel) {
            $currentBudget = $currentBudgets->get($branch->id);
            $previousBudget = $previousBudgets->get($branch->id);

            return [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'prev_expense_budget' => (float) ($previousBudget->sales_amount ?? 0),
                'prev_month_name' => $previousFiscalMonth?->name ?? '',
                'prev_year' => $previousYearLabel,
                'sales_amount' => $currentBudget?->sales_amount !== null ? (string) $currentBudget->sales_amount : '',
                'existing_budget_id' => $currentBudget?->id,
                'loading' => false,
            ];
        })->values();

        return response()->json([
            'rows' => $rows,
            'previous_month_label' => $previousFiscalMonth?->name,
            'previous_year_label' => $previousYearLabel,
        ]);
    }

    // GET /budget/sales-budget/prev-expense → get previous month expense
    public function getPrevExpense(Request $request)
    {
        $fiscalMonthId = (int) $request->query('fiscal_month_id');
        $branchId      = (int) $request->query('branch_id');

        $fiscalMonth = FiscalMonth::query()
            ->with('fiscalYear')
            ->whereKey($fiscalMonthId)
            ->firstOrFail();

        $previousFiscalMonth = FiscalMonth::query()
            ->with('fiscalYear')
            ->where('gregorian_start_date', '<', $fiscalMonth->gregorian_start_date)
            ->orderByDesc('gregorian_start_date')
            ->first();

        $prevBudget = $previousFiscalMonth
            ? SalesBudget::where('branch_id', $branchId)
                ->where('fiscal_month_id', $previousFiscalMonth->id)
                ->first()
            : null;

        $previousYearLabel = null;
        if ($previousFiscalMonth?->fiscalYear?->name) {
            preg_match('/(\d+)/', $previousFiscalMonth->fiscalYear->name, $previousYearMatches);
            $previousYearLabel = $previousYearMatches[1] ?? $previousFiscalMonth->fiscalYear->name;
        }

        return response()->json([
            'prev_month'          => $previousFiscalMonth?->id,
            'prev_year'           => $previousYearLabel,
            'prev_month_name'     => $previousFiscalMonth?->name,
            'prev_expense_budget' => $prevBudget
                ? $prevBudget->sales_amount
                : 0,
        ]);
    }

    // GET /budget/sales-budget/check → check if a budget already exists for branch/year/month
    public function check(Request $request)
    {
        $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'fiscal_year_id' => ['required', 'exists:fiscal_years,id'],
            'fiscal_month_id' => ['required', 'exists:fiscal_months,id'],
        ]);

        $budget = SalesBudget::query()
            ->select([
                'id',
                'branch_id',
                'fiscal_year_id',
                'fiscal_month_id',
                'ethiopian_month',
                'ethiopian_year',
                'sales_amount',
                'prev_expense_budget',
            ])
            ->where('branch_id', $request->branch_id)
            ->where('fiscal_year_id', $request->fiscal_year_id)
            ->where('fiscal_month_id', $request->fiscal_month_id)
            ->first();

        return response()->json([
            'budget' => $budget,
        ]);
    }

    // POST /budget/sales-budget → store new budget
    public function store(Request $request)
    {
            \Log::info('Sales budget store called', $request->all());

        if (!$this->canModify()) {
            return back()->with(
                'error',
                'You can only add budgets between the 5th and 12th of each month.'
            );
        }

       $request->validate([
    'fiscal_year_id'                => ['required', 'exists:fiscal_years,id'],
    'fiscal_month_id'               => [
        'required',
        'exists:fiscal_months,id',
        Rule::exists('fiscal_months', 'id')->where('fiscal_year_id', $request->input('fiscal_year_id')),
    ],
    'budgets'                       => 'required|array|min:1',
    'budgets.*.budget_id'           => 'nullable|integer|exists:sales_budgets,id',
    'budgets.*.branch_id'           => 'required|exists:branches,id',
    'budgets.*.sales_amount'        => 'nullable|numeric|min:0',
    'budgets.*.prev_expense_budget' => 'nullable|numeric|min:0',
]);

        $fiscalYear = FiscalYear::findOrFail($request->fiscal_year_id);
        $fiscalMonth = FiscalMonth::query()
            ->whereKey($request->fiscal_month_id)
            ->where('fiscal_year_id', $fiscalYear->id)
            ->firstOrFail();

        preg_match('/(\d+)/', $fiscalYear->name, $fiscalYearMatches);
        $ethiopianYear = isset($fiscalYearMatches[1]) ? (int) $fiscalYearMatches[1] : null;
        $ethiopianMonth = (int) $fiscalMonth->efy_month_number;

        if (!$ethiopianYear) {
            return back()->with('error', 'Unable to determine the Ethiopian year from the selected fiscal year.');
        }

        try {
            $transactionResult = DB::transaction(function () use ($request, $ethiopianYear, $ethiopianMonth) {
                $hasValidBudget = false;

                foreach ($request->budgets as $item) {
                    $salesAmount = $item['sales_amount'] ?? null;

                    if ($salesAmount === null || $salesAmount === '' || !is_numeric($salesAmount)) {
                        continue;
                    }

                    $hasValidBudget = true;

                    $branch = Branch::find($item['branch_id']);

                    $existingBudget = null;
                    if (!empty($item['budget_id'])) {
                        $existingBudget = SalesBudget::query()
                            ->whereKey($item['budget_id'])
                            ->where('branch_id', $item['branch_id'])
                            ->where('fiscal_year_id', $request->fiscal_year_id)
                            ->where('fiscal_month_id', $request->fiscal_month_id)
                            ->first();
                    }

                    if (!$existingBudget) {
                        $existingBudget = SalesBudget::query()
                            ->where('branch_id', $item['branch_id'])
                            ->where('fiscal_year_id', $request->fiscal_year_id)
                            ->where('fiscal_month_id', $request->fiscal_month_id)
                            ->first();
                    }

                    if ($existingBudget) {
                        $oldAmount = $existingBudget->sales_amount;

                        $existingBudget->update([
                            'sales_amount'        => $salesAmount,
                            'prev_expense_budget' => $item['prev_expense_budget'] ?? 0,
                            'ethiopian_month'     => $ethiopianMonth,
                            'ethiopian_year'      => $ethiopianYear,
                            'updated_by'          => Auth::id(),
                        ]);

                        SalesBudgetLog::create([
                            'sales_budget_id'  => $existingBudget->id,
                            'branch_name'      => $branch?->name,
                            'ethiopian_month'  => $ethiopianMonth,
                            'ethiopian_year'   => $ethiopianYear,
                            'user_id'          => Auth::id(),
                            'action'           => 'updated',
                            'old_sales_amount' => $oldAmount,
                            'new_sales_amount' => $salesAmount,
                            'old_prev_expense' => $existingBudget->prev_expense_budget,
                            'new_prev_expense' => $item['prev_expense_budget'] ?? 0,
                        ]);

                        continue;
                    }

                    $budget = SalesBudget::create([
                        'branch_id'           => $item['branch_id'],
                        'fiscal_year_id'      => $request->fiscal_year_id,
                        'fiscal_month_id'     => $request->fiscal_month_id,
                        'ethiopian_month'     => $ethiopianMonth,
                        'ethiopian_year'      => $ethiopianYear,
                        'sales_amount'        => $salesAmount,
                        'prev_expense_budget' => $item['prev_expense_budget'] ?? 0,
                        'created_by'          => Auth::id(),
                        'updated_by'          => null,
                    ]);
                    SalesBudgetLog::create([
                        'sales_budget_id'  => $budget->id,
                        'branch_name'      => $branch?->name,
                        'ethiopian_month'  => $ethiopianMonth,
                        'ethiopian_year'   => $ethiopianYear,
                        'user_id'          => Auth::id(),
                        'action'           => 'created',
                        'old_sales_amount' => null,
                        'new_sales_amount' => $salesAmount,
                        'old_prev_expense' => null,
                        'new_prev_expense' => $item['prev_expense_budget'] ?? 0,
                    ]);
                }

                if (!$hasValidBudget) {
                    return back()->with('error', 'Please enter at least one sales budget amount');
                }

                return null;
            });
        } catch (UniqueConstraintViolationException $exception) {
            return back()->with('error', 'A budget already exists for this branch and month.');
        }

        if ($transactionResult instanceof \Illuminate\Http\RedirectResponse) {
            return $transactionResult;
        }

        return to_route('sales-budget.index')
            ->with('message', 'Sales budget submitted successfully!');
    }

    // GET /budget/sales-budget/{id}/edit → show edit form
    public function edit(SalesBudget $salesBudget)
    {
        if (!$this->canModify()) {
            return back()->with(
                'error',
                'You can only edit budgets between the 5th and 12th of each month.'
            );
        }

        $salesBudget->load(['branch', 'createdBy']);

        return inertia('Budget/SalesBudget/Edit', [
            'budget'     => $salesBudget,
            'monthNames' => SalesBudget::$monthNames,
            'canModify'  => $this->canModify(),
        ]);
    }

    // PUT /budget/sales-budget/{id} → update budget
   public function update(Request $request, SalesBudget $salesBudget)
{
    if (!$this->canModify()) {
        return back()->with(
            'error',
            'You can only edit budgets between the 5th and 12th of each month.'
        );
    }

    $request->validate([
        'sales_amount' => 'required|numeric|min:0',
    ]);

    $oldAmount = $salesBudget->sales_amount;

    $salesBudget->update([
        'sales_amount' => $request->sales_amount,
        'updated_by'   => Auth::id(),
    ]);

    SalesBudgetLog::create([
        'sales_budget_id'  => $salesBudget->id,
        'branch_name'      => $salesBudget->branch->name,
        'ethiopian_month'  => $salesBudget->ethiopian_month,
        'ethiopian_year'   => $salesBudget->ethiopian_year,
        'user_id'          => Auth::id(),
        'action'           => 'updated',
        'old_sales_amount' => $oldAmount,
        'new_sales_amount' => $request->sales_amount,
        'old_prev_expense' => $salesBudget->prev_expense_budget,
        'new_prev_expense' => $salesBudget->prev_expense_budget,
    ]);

    return to_route('sales-budget.index')
        ->with('message', 'Sales budget updated successfully!');
}
    // DELETE /budget/sales-budget/{id} → delete budget
 public function destroy(SalesBudget $salesBudget)
{
    if (!$this->canModify()) {
        return back()->with(
            'error',
            'You can only delete budgets between the 5th and 12th of each month.'
        );
    }

    $branchName = $salesBudget->branch->name;

    SalesBudgetLog::create([
        'sales_budget_id'  => $salesBudget->id,
        'branch_name'      => $branchName,
        'ethiopian_month'  => $salesBudget->ethiopian_month,
        'ethiopian_year'   => $salesBudget->ethiopian_year,
        'user_id'          => Auth::id(),
        'action'           => 'deleted',
        'old_sales_amount' => $salesBudget->sales_amount,
        'new_sales_amount' => null,
        'old_prev_expense' => $salesBudget->prev_expense_budget,
        'new_prev_expense' => null,
        'notes'            => 'Deleted budget for ' . $branchName,
    ]);

    $salesBudget->delete();

    return to_route('sales-budget.index')
        ->with('message', 'Sales budget deleted successfully!');
} // GET /budget/sales-budget/logs → view logs
    public function logs(Request $request)
    {
        $action = $request->input('action');
        $branchId = $request->input('branch_id');
        $fiscalYearId = $request->input('fiscal_year_id');
        $ethiopianMonth = $request->input('ethiopian_month');

        $branches = Branch::orderBy('name')->get();
        $fiscalYears = FiscalYear::orderByDesc('id')->get();

        $logsQuery = SalesBudgetLog::query()
            ->with([
                'salesBudget.branch',
                'user',
            ])
            ->when($request->filled('action'), function ($query) use ($action) {
                $query->where('action', $action);
            })
            ->when($request->filled('branch_id'), function ($query) use ($branchId) {
                $query->whereHas('salesBudget.branch', function ($branchQuery) use ($branchId) {
                    $branchQuery->where('id', $branchId);
                });
            })
            ->when($request->filled('fiscal_year_id'), function ($query) use ($fiscalYearId) {
                $query->whereHas('salesBudget', function ($budgetQuery) use ($fiscalYearId) {
                    $budgetQuery->where('fiscal_year_id', $fiscalYearId);
                });
            })
            ->when($request->filled('fiscal_year_id') && $request->filled('ethiopian_month'), function ($query) use ($ethiopianMonth) {
                $query->where('ethiopian_month', $ethiopianMonth);
            })
            ->orderBy('created_at', 'desc');

        $logs = $logsQuery->paginate(10)->appends($request->query());

        return inertia('Budget/SalesBudget/Logs', [
            'logs' => $logs,
            'branches' => $branches,
            'fiscalYears' => $fiscalYears,
            'request' => [
                'action' => $action,
                'branch_id' => $branchId,
                'fiscal_year_id' => $fiscalYearId,
                'ethiopian_month' => $ethiopianMonth,
            ],
        ]);
    }
}