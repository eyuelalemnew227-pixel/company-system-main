<?php

namespace App\Http\Controllers;

use App\Support\ExpenseBudgetAccess;
use App\Models\Branch;
use App\Models\Department;
use App\Models\ExpenseBudget;
use App\Models\ExpenseBudgetActivityLog;
use App\Models\ExpenseBudgetItem;
use App\Models\ExpenseItem;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Services\ExpenseBudgetActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\CsvExportService;

class ExpenseBudgetController extends Controller
{
    public function __construct(
        private readonly ExpenseBudgetActivityLogger $activityLogger,
    ) {}

    public function index(): Response
    {
        abort_unless(ExpenseBudgetAccess::canView(), 403);

        $query = ExpenseBudget::query()
            ->with([
                'branch',
                'department',
                'creator',
                'fiscalYear',
                'fiscalMonth',
                'expenseItem',
            ])
            ->whereNotNull('expense_budgets.planned_budget');

        if ($search = request('search')) {
            $query->whereHas('expenseItem', function ($q) use ($search) {
                $q->where('expense_type', 'like', "%{$search}%");
            });
        }

        if ($branchId = request('branch_id')) {
            $query->where('expense_budgets.branch_id', $branchId);
        }

        if ($departmentId = request('department_id')) {
            $query->where('expense_budgets.department_id', $departmentId);
        }

        if ($fiscalMonthId = request('fiscal_month_id')) {
            $query->where('expense_budgets.fiscal_month_id', $fiscalMonthId);
        }

        if ($fiscalYearId = request('fiscal_year_id')) {
            $query->where('expense_budgets.fiscal_year_id', $fiscalYearId);
        }

        if ($submittedBy = request('submitted_by')) {
            $query->where('expense_budgets.created_by', $submittedBy);
        }

        $user = auth()->user();

        $isUserHO = false;
        if ($user->employee?->branch_id) {
            $isUserHO = ExpenseBudgetAccess::isHeadOfficeBranch(Branch::find($user->employee->branch_id));
        }

        if (! ExpenseBudgetAccess::hasUnrestrictedViewAccess($user)) {
            $query->where(function ($q) use ($user, $isUserHO) {
                if ($user->can(ExpenseBudgetAccess::viewOwnDepartmentPermission())) {
                    $q->orWhere(function ($deptQ) use ($user) {
                        $deptQ->where('expense_budgets.department_id', $user->employee?->department_id)
                              ->where('expense_budgets.branch_id', $user->employee?->branch_id);
                    });
                }
                
                if ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission())) {
                    $q->orWhere(function ($branchQ) use ($user, $isUserHO) {
                        $branchQ->where('expense_budgets.branch_id', $user->employee?->branch_id);
                        if ($isUserHO) {
                            $branchQ->where('expense_budgets.department_id', $user->employee?->department_id);
                        }
                    });
                }
                
                if ($user->can(ExpenseBudgetAccess::viewAllExceptHOPermission())) {
                    $q->orWhereNotIn('expense_budgets.branch_id', function ($subQuery) {
                        $subQuery->select('id')->from('branches')
                          ->where('name', 'like', '%Head Office%')
                          ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
                    });
                }
            });
        }

        $branches = Branch::query()
            ->when(! ExpenseBudgetAccess::hasUnrestrictedViewAccess($user), function ($query) use ($user) {
                $query->where(function ($q) use ($user) {
                    if ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission()) || $user->can(ExpenseBudgetAccess::viewOwnDepartmentPermission())) {
                        $q->orWhere('id', $user->employee?->branch_id);
                    }
                    if ($user->can(ExpenseBudgetAccess::viewAllExceptHOPermission())) {
                        $q->orWhereNotIn('id', function ($subQuery) {
                            $subQuery->select('id')->from('branches')
                              ->where('name', 'like', '%Head Office%')
                              ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
                        });
                    }
                });
            })
            ->orderByRaw("CASE WHEN name LIKE '%Head Office%' OR UPPER(branch_code) = 'HO' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active_on_weekly_budget', 1)
            ->when(! ExpenseBudgetAccess::hasUnrestrictedViewAccess($user), function ($query) use ($user, $isUserHO) {
                if ($user->can(ExpenseBudgetAccess::viewAllExceptHOPermission())) {
                    // Do nothing, they can see all departments in their allowed branches
                } elseif ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission()) && ! $isUserHO) {
                    // Do nothing, non-HO branch users can see all departments
                } elseif ($user->can(ExpenseBudgetAccess::viewOwnDepartmentPermission()) || ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission()) && $isUserHO)) {
                    $query->where('id', $user->employee?->department_id);
                }
            })
            ->orderBy('name')
            ->get(['id', 'name']);

        $totalPlannedBudget = null;
        if (request()->filled(['branch_id', 'fiscal_month_id', 'fiscal_year_id'])) {
            $totalPlannedBudget = (clone $query)->sum('expense_budgets.planned_budget');
        }

        $items = $query
            ->leftJoin('fiscal_years', 'expense_budgets.fiscal_year_id', '=', 'fiscal_years.id')
            ->leftJoin('fiscal_months', 'expense_budgets.fiscal_month_id', '=', 'fiscal_months.id')
            ->orderByDesc('fiscal_years.gregorian_start_date')
            ->orderByDesc('fiscal_months.efy_month_number')
            ->orderByDesc('expense_budgets.created_at')
            ->select('expense_budgets.*')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ExpenseBudget $item) => [
                'id' => $item->id,
                'fiscal_year_id' => $item->fiscal_year_id,
                'fiscal_month_id' => $item->fiscal_month_id,
                'fiscal_year' => $item->fiscalYear?->name,
                'fiscal_month' => $item->fiscalMonth?->name,
                'branch_id' => $item->branch_id,
                'department_id' => $item->department_id,
                'branch' => $item->branch?->name,
                'department' => $item->department?->name,
                'expense_item_id' => $item->expense_item_id,
                'expense_item' => $item->expenseItem?->expense_type,
                'planned_budget' => $item->planned_budget,
                'submitted_by' => $item->creator?->name,
                'can_view_history' => ExpenseBudgetAccess::canViewItemHistory(auth()->user(), $item),
            ]);

        $expenseItems = ExpenseItem::query()
            ->orderBy('expense_type')
            ->get(['expense_parent_acc_code', 'expense_type'])
            ->map(fn (ExpenseItem $item) => [
                'id' => $item->expense_parent_acc_code,
                'name' => $item->expense_type,
            ])
            ->values();

        $submitters = \App\Models\User::query()
            ->join('employees', 'users.employee_id', '=', 'employees.id')
            ->where('employees.branch_id', 5)
            ->select('users.id', 'users.name')
            ->orderBy('users.name')
            ->get();

        return Inertia::render('Budget/ExpenseBudget/Index', [
            'items' => $items,
            'branches' => $branches,
            'departments' => $departments,
            'expenseItems' => $expenseItems,
            'submitters' => $submitters,
            'fiscalYears' => $this->fiscalYearOptions(),
            'fiscalMonths' => $this->fiscalMonthOptions(),
            'request' => request()->only(['search', 'branch_id', 'department_id', 'fiscal_month_id', 'fiscal_year_id', 'submitted_by']),
            'totalPlannedBudget' => $totalPlannedBudget,
        ]);
    }

    public function export(CsvExportService $csvExportService)
    {
        abort_unless(ExpenseBudgetAccess::canView(), 403);

        $query = ExpenseBudget::query()
            ->with([
                'branch',
                'department',
                'creator',
                'fiscalYear',
                'fiscalMonth',
                'expenseItem',
            ])
            ->whereNotNull('expense_budgets.planned_budget');

        if ($search = request('search')) {
            $query->whereHas('expenseItem', function ($q) use ($search) {
                $q->where('expense_type', 'like', "%{$search}%");
            });
        }

        if ($branchId = request('branch_id')) {
            $query->where('expense_budgets.branch_id', $branchId);
        }

        if ($departmentId = request('department_id')) {
            $query->where('expense_budgets.department_id', $departmentId);
        }

        if ($fiscalMonthId = request('fiscal_month_id')) {
            $query->where('expense_budgets.fiscal_month_id', $fiscalMonthId);
        }

        if ($fiscalYearId = request('fiscal_year_id')) {
            $query->where('expense_budgets.fiscal_year_id', $fiscalYearId);
        }

        if ($submittedBy = request('submitted_by')) {
            $query->where('expense_budgets.created_by', $submittedBy);
        }

        $user = auth()->user();

        $isUserHO = false;
        if ($user->employee?->branch_id) {
            $isUserHO = ExpenseBudgetAccess::isHeadOfficeBranch(Branch::find($user->employee->branch_id));
        }

        if (! ExpenseBudgetAccess::hasUnrestrictedViewAccess($user)) {
            $query->where(function ($q) use ($user, $isUserHO) {
                if ($user->can(ExpenseBudgetAccess::viewOwnDepartmentPermission())) {
                    $q->orWhere(function ($deptQ) use ($user) {
                        $deptQ->where('expense_budgets.department_id', $user->employee?->department_id)
                              ->where('expense_budgets.branch_id', $user->employee?->branch_id);
                    });
                }
                
                if ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission())) {
                    $q->orWhere(function ($branchQ) use ($user, $isUserHO) {
                        $branchQ->where('expense_budgets.branch_id', $user->employee?->branch_id);
                        if ($isUserHO) {
                            $branchQ->where('expense_budgets.department_id', $user->employee?->department_id);
                        }
                    });
                }
                
                if ($user->can(ExpenseBudgetAccess::viewAllExceptHOPermission())) {
                    $q->orWhereNotIn('expense_budgets.branch_id', function ($subQuery) {
                        $subQuery->select('id')->from('branches')
                          ->where('name', 'like', '%Head Office%')
                          ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
                    });
                }
            });
        }

        $items = $query
            ->leftJoin('fiscal_years', 'expense_budgets.fiscal_year_id', '=', 'fiscal_years.id')
            ->leftJoin('fiscal_months', 'expense_budgets.fiscal_month_id', '=', 'fiscal_months.id')
            ->orderByDesc('fiscal_years.gregorian_start_date')
            ->orderByDesc('fiscal_months.efy_month_number')
            ->orderByDesc('expense_budgets.created_at')
            ->select('expense_budgets.*')
            ->get();

        return $csvExportService->export(
            'expense-budgets-' . date('Y-m-d'),
            ['Fiscal Year', 'Fiscal Month', 'Branch', 'Department', 'Expense Item', 'Planned Budget', 'Submitted By'],
            $items,
            fn (ExpenseBudget $item) => [
                $item->fiscalYear?->name ?? '',
                $item->fiscalMonth?->name ?? '',
                $item->branch?->name ?? '',
                $item->department?->name ?? '',
                $item->expenseItem?->expense_type ?? '',
                $item->planned_budget,
                $item->creator?->name ?? '',
            ]
        );
    }

    public function submissionTracker(): Response
    {
        abort_unless(ExpenseBudgetAccess::canView(), 403);

        $user = auth()->user();

        $isUserHO = false;
        if ($user->employee?->branch_id) {
            $isUserHO = ExpenseBudgetAccess::isHeadOfficeBranch(Branch::find($user->employee->branch_id));
        }

        $branches = Branch::query()
            ->when(! ExpenseBudgetAccess::hasUnrestrictedViewAccess($user), function ($query) use ($user) {
                $query->where(function ($q) use ($user) {
                    if ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission()) || $user->can(ExpenseBudgetAccess::viewOwnDepartmentPermission())) {
                        $q->orWhere('id', $user->employee?->branch_id);
                    }
                    if ($user->can(ExpenseBudgetAccess::viewAllExceptHOPermission())) {
                        $q->orWhereNotIn('id', function ($subQuery) {
                            $subQuery->select('id')->from('branches')
                              ->where('name', 'like', '%Head Office%')
                              ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
                        });
                    }
                });
            })
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->when(! ExpenseBudgetAccess::hasUnrestrictedViewAccess($user), function ($query) use ($user, $isUserHO) {
                if ($user->can(ExpenseBudgetAccess::viewAllExceptHOPermission())) {
                    // Do nothing, they can see all departments in their allowed branches
                } elseif ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission()) && ! $isUserHO) {
                    // Do nothing, non-HO branch users can see all departments
                } elseif ($user->can(ExpenseBudgetAccess::viewOwnDepartmentPermission()) || ($user->can(ExpenseBudgetAccess::viewOwnBranchPermission()) && $isUserHO)) {
                    $query->where('id', $user->employee?->department_id);
                }
            })
            ->orderBy('name')
            ->get(['id', 'name']);

        $allExpenseItems = ExpenseItem::query()
            ->orderBy('expense_type')
            ->get(['expense_parent_acc_code', 'expense_type', 'frequent_expense'])
            ->map(fn (ExpenseItem $item) => [
                'id' => $item->expense_parent_acc_code,
                'name' => $item->expense_type,
                'frequent_expense' => (bool) $item->frequent_expense,
            ])
            ->values();

        $frequentExpenseItems = $allExpenseItems
            ->where('frequent_expense', true)
            ->values();

        $visibleExpenseItems = $this->resolveVisibleExpenseItems($allExpenseItems, $frequentExpenseItems);

        $submissionLookup = $this->buildSubmissionLookup(
            request('fiscal_month_id'),
            request('fiscal_year_id'),
        );

        $trackerBranches = $branches->when(
            request('branch_id'),
            fn ($collection, $branchId) => $collection->where('id', (int) $branchId),
        );

        $trackerDepartments = $departments->when(
            request('department_id'),
            fn ($collection, $departmentId) => $collection->where('id', (int) $departmentId),
        );

        $rows = [];

        foreach ($trackerBranches as $branch) {
            if ($this->isHeadOfficeBranch($branch)) {
                foreach ($trackerDepartments as $department) {
                    $rows[] = $this->buildSubmissionTrackerRow(
                        $branch,
                        $department,
                        $visibleExpenseItems,
                        $submissionLookup,
                    );
                }
            } elseif (! request('department_id')) {
                $rows[] = $this->buildSubmissionTrackerRow(
                    $branch,
                    null,
                    $visibleExpenseItems,
                    $submissionLookup,
                );
            }
        }

        return Inertia::render('Budget/ExpenseBudget/SubmissionTracker', [
            'rows' => $rows,
            'allExpenseItems' => $allExpenseItems,
            'visibleExpenseItems' => $visibleExpenseItems,
            'frequentExpenseItems' => $frequentExpenseItems,
            'branches' => $branches,
            'departments' => $departments,
            'fiscalYears' => $this->fiscalYearOptions(),
            'fiscalMonths' => $this->fiscalMonthOptions(),
            'request' => request()->only([
                'branch_id',
                'department_id',
                'fiscal_month_id',
                'fiscal_year_id',
                'expense_item_id',
                'expense_item_ids',
            ]),
        ]);
    }

    public function create(): Response|RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $branches = Branch::query()
            ->where(function ($query) {
                $query->where('status', 'active')
                    ->orWhere('name', 'like', '%Head Office%')
                    ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
            })
            ->orderByRaw("CASE WHEN name LIKE '%Head Office%' OR UPPER(branch_code) = 'HO' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->where('is_active_on_weekly_budget', 1)
            ->orderBy('name')
            ->get(['id', 'name']);

        $mapExpenseItem = fn (ExpenseItem $item) => [
            'id' => $item->expense_parent_acc_code,
            'name' => $item->expense_type,
            'icon' => null,
        ];

        $frequentExpenseItems = ExpenseItem::query()
            ->where('frequent_expense', true)
            ->where('is_expense', 1)
            ->orderBy('expense_type')
            ->get()
            ->map($mapExpenseItem)
            ->values();

        $otherExpenseItems = ExpenseItem::query()
            ->where('frequent_expense', false)
            ->where('is_expense', 1)
            ->orderBy('expense_type')
            ->get()
            ->map($mapExpenseItem)
            ->values();

        $activePeriods = \App\Models\ExpenseBudgetPeriod::with(['fiscalYear', 'fiscalMonth'])
            ->where('status', 'active')
            ->get();

        if ($activePeriods->isEmpty()) {
            return redirect()->route('expense-budget.index')->with('error', 'No active Expense Budget Periods found. Please contact an administrator to open a period.');
        }

        $activeFiscalMonths = $activePeriods->map(fn ($p) => [
            'id' => $p->fiscalMonth->id,
            'name' => $p->fiscalMonth->name,
            'fiscal_year_id' => $p->fiscalMonth->fiscal_year_id,
        ])->unique('id')->values()->all();

        $activeFiscalYears = $activePeriods->map(fn ($p) => [
            'id' => $p->fiscalYear->id,
            'name' => $p->fiscalYear->name,
        ])->unique('id')->values()->all();

        $defaultPeriod = $activePeriods->first();

        return Inertia::render('Budget/ExpenseBudget/Create', [
            'branches' => $branches,
            'departments' => $departments,
            'frequentExpenseItems' => $frequentExpenseItems,
            'otherExpenseItems' => $otherExpenseItems,
            'fiscalYears' => $activeFiscalYears,
            'fiscalMonths' => $activeFiscalMonths,
            'defaultFiscalYearId' => $defaultPeriod->fiscal_year_id,
            'defaultFiscalMonthId' => $defaultPeriod->fiscal_month_id,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $validated = $request->validate([
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => [
                'required',
                'integer',
                Rule::exists('fiscal_months', 'id')->where(
                    fn ($query) => $query->where('fiscal_year_id', $request->input('fiscal_year_id')),
                ),
            ],
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'items' => ['nullable', 'array'],
            'items.*.expense_item_id' => ['required', 'exists:expenses,expense_parent_acc_code'],
            'items.*.planned_budget' => ['nullable', 'numeric', 'min:0'],
            'items.*.prev_month_budget' => ['nullable', 'numeric', 'min:0'],
        ]);

        $periodActive = \App\Models\ExpenseBudgetPeriod::where('fiscal_year_id', $validated['fiscal_year_id'])
            ->where('fiscal_month_id', $validated['fiscal_month_id'])
            ->where('status', 'active')
            ->exists();
        
        if (!$periodActive) {
            throw ValidationException::withMessages([
                'fiscal_month_id' => 'The selected period is not active for expense budgets. Please activate the period first.',
            ]);
        }

        $branch = Branch::findOrFail($validated['branch_id']);
        $isHeadOffice = $this->isHeadOfficeBranch($branch);

        if ($isHeadOffice && empty($validated['department_id'])) {
            throw ValidationException::withMessages([
                'department_id' => 'The department field is required when the selected branch is Head Office.',
            ]);
        }

        if (! $isHeadOffice) {
            $validated['department_id'] = null;
        }

        $itemsToSave = collect($validated['items'] ?? [])
            ->filter(function (array $item) {
                return filled($item['expense_item_id'])
                    && array_key_exists('planned_budget', $item)
                    && $item['planned_budget'] !== null
                    && $item['planned_budget'] !== '';
            })
            ->values()
            ->all();

        $budgetedItemIds = ExpenseBudget::query()
            ->whereNotNull('planned_budget')
            ->where('fiscal_year_id', $validated['fiscal_year_id'])
            ->where('fiscal_month_id', $validated['fiscal_month_id'])
            ->where('branch_id', $validated['branch_id'])
            ->when(
                $isHeadOffice ? ($validated['department_id'] ?? null) : null,
                fn ($q, $deptId) => $q->where('department_id', $deptId),
                fn ($q) => $q->whereNull('department_id')
            )
            ->pluck('expense_item_id')
            ->all();

        foreach ($itemsToSave as $index => $item) {
            if (in_array($item['expense_item_id'], $budgetedItemIds, true)) {
                throw ValidationException::withMessages([
                    "items.{$index}.expense_item_id" => 'A planned budget has already been set for this expense item.',
                ]);
            }
        }

        if (empty($itemsToSave)) {
            throw ValidationException::withMessages([
                'items' => 'At least one expense item with a planned budget is required.',
            ]);
        }

        DB::transaction(function () use ($validated, $itemsToSave, $isHeadOffice) {
            $departmentId = $isHeadOffice ? ($validated['department_id'] ?? null) : null;

            foreach ($itemsToSave as $item) {
                $createdItem = ExpenseBudget::create([
                    'fiscal_year_id' => $validated['fiscal_year_id'],
                    'fiscal_month_id' => $validated['fiscal_month_id'],
                    'branch_id' => $validated['branch_id'],
                    'department_id' => $departmentId,
                    'expense_item_id' => $item['expense_item_id'],
                    'planned_budget' => $item['planned_budget'],
                    'created_by' => auth()->id(),
                ]);

                $this->activityLogger->logItemCreated($createdItem);
            }
        });

        return redirect()
            ->route('expense-budget.create')
            ->with('message', 'Expense budget saved successfully.');
    }

    public function destroyItem(ExpenseBudget $expenseBudget): RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $periodActive = \App\Models\ExpenseBudgetPeriod::where('fiscal_year_id', $expenseBudget->fiscal_year_id)
            ->where('fiscal_month_id', $expenseBudget->fiscal_month_id)
            ->where('status', 'active')
            ->exists();

        if (!$periodActive) {
            return redirect()->back()->with('error', 'Cannot delete this expense budget because the corresponding period is locked or inactive.');
        }

        $expenseBudget->load([
            'expenseItem',
            'fiscalYear',
            'fiscalMonth',
            'branch',
            'department',
        ]);

        DB::transaction(function () use ($expenseBudget) {
            $this->activityLogger->logItemDeleted($expenseBudget);
            $expenseBudget->delete();
        });

        return redirect()
            ->route('expense-budget.index')
            ->with('message', 'Expense budget deleted successfully.');
    }

    public function updateItem(Request $request, ExpenseBudget $expenseBudget): RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $validated = $request->validate([
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => [
                'required',
                'integer',
                Rule::exists('fiscal_months', 'id')->where(
                    fn ($query) => $query->where('fiscal_year_id', $request->input('fiscal_year_id')),
                ),
            ],
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'expense_item_id' => ['required', 'exists:expenses,expense_parent_acc_code'],
            'planned_budget' => ['required', 'numeric', 'min:0'],
        ]);

        $periodActive = \App\Models\ExpenseBudgetPeriod::where('fiscal_year_id', $validated['fiscal_year_id'])
            ->where('fiscal_month_id', $validated['fiscal_month_id'])
            ->where('status', 'active')
            ->exists();
        
        if (!$periodActive) {
            throw ValidationException::withMessages([
                'fiscal_month_id' => 'The selected period is not active for expense budgets. Please activate the period first.',
            ]);
        }

        $branch = Branch::findOrFail($validated['branch_id']);
        $isHeadOffice = $this->isHeadOfficeBranch($branch);

        if ($isHeadOffice && empty($validated['department_id'])) {
            throw ValidationException::withMessages([
                'department_id' => 'The department field is required when the selected branch is Head Office.',
            ]);
        }

        if (! $isHeadOffice) {
            $validated['department_id'] = null;
        }

        $departmentId = $validated['department_id'] ? (int) $validated['department_id'] : null;

        $duplicateExists = ExpenseBudget::query()
            ->where('id', '!=', $expenseBudget->id)
            ->where('expense_item_id', $validated['expense_item_id'])
            ->where('fiscal_year_id', $validated['fiscal_year_id'])
            ->where('fiscal_month_id', $validated['fiscal_month_id'])
            ->where('branch_id', $validated['branch_id'])
            ->when(
                $departmentId,
                fn ($q) => $q->where('department_id', $departmentId),
                fn ($q) => $q->whereNull('department_id')
            )
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'expense_item_id' => 'A planned budget has already been set for this expense item.',
            ]);
        }

        $expenseBudget->load([
            'expenseItem',
            'fiscalYear',
            'fiscalMonth',
            'branch',
            'department',
        ]);

        $oldValues = $this->activityLogger->itemAttributes($expenseBudget);

        DB::transaction(function () use ($expenseBudget, $validated, $departmentId, $oldValues) {
            $expenseBudget->update([
                'fiscal_year_id' => $validated['fiscal_year_id'],
                'fiscal_month_id' => $validated['fiscal_month_id'],
                'branch_id' => $validated['branch_id'],
                'department_id' => $departmentId,
                'expense_item_id' => $validated['expense_item_id'],
                'planned_budget' => $validated['planned_budget'],
            ]);

            $newValues = $this->activityLogger->itemAttributes($expenseBudget->fresh());
            $changedOld = [];
            $changedNew = [];

            foreach ($newValues as $key => $value) {
                $oldValue = $oldValues[$key] ?? null;

                if ($oldValue != $value) {
                    $changedOld[$key] = $oldValue;
                    $changedNew[$key] = $value;
                }
            }

            if ($changedNew !== []) {
                $this->activityLogger->logItemUpdated($expenseBudget, $changedOld, $changedNew);
            }
        });

        return redirect()
            ->route('expense-budget.index')
            ->with('message', 'Expense budget updated successfully.');
    }

    public function getPrevBudget(Request $request): JsonResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $validated = $request->validate([
            'expense_item_id' => ['required', 'exists:expenses,expense_parent_acc_code'],
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => ['required', 'integer', 'exists:fiscal_months,id'],
        ]);

        $branch = Branch::findOrFail($validated['branch_id']);
        $departmentId = $this->isHeadOfficeBranch($branch)
            ? ($validated['department_id'] ?? null)
            : null;

        $previousFiscalMonth = $this->findPreviousFiscalMonth((int) $validated['fiscal_month_id']);

        if (! $previousFiscalMonth) {
            return response()->json([
                'prev_month_budget' => null,
            ]);
        }

        $prevBudgetItem = ExpenseBudget::query()
            ->where('expense_item_id', $validated['expense_item_id'])
            ->where('fiscal_year_id', $previousFiscalMonth->fiscal_year_id)
            ->where('fiscal_month_id', $previousFiscalMonth->id)
            ->where('branch_id', $validated['branch_id'])
            ->when(
                $departmentId,
                fn ($q) => $q->where('department_id', $departmentId),
                fn ($q) => $q->whereNull('department_id')
            )
            ->first();

        return response()->json([
            'prev_month_budget' => $prevBudgetItem?->planned_budget,
        ]);
    }

    public function getBudgetedExpenseItems(Request $request): JsonResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => ['required', 'integer', 'exists:fiscal_months,id'],
        ]);

        $branch = Branch::findOrFail($validated['branch_id']);
        $departmentId = $this->isHeadOfficeBranch($branch)
            ? ($validated['department_id'] ?? null)
            : null;

        $expenseItemIds = ExpenseBudget::query()
            ->whereNotNull('planned_budget')
            ->where('fiscal_year_id', $validated['fiscal_year_id'])
            ->where('fiscal_month_id', $validated['fiscal_month_id'])
            ->where('branch_id', $validated['branch_id'])
            ->when(
                $departmentId,
                fn ($q) => $q->where('department_id', $departmentId),
                fn ($q) => $q->whereNull('department_id')
            )
            ->pluck('expense_item_id')
            ->unique()
            ->values();

        $previousFiscalMonth = $this->findPreviousFiscalMonth((int) $validated['fiscal_month_id']);
        $prevMonthBudgets = [];
        
        if ($previousFiscalMonth) {
            $prevMonthBudgets = ExpenseBudget::query()
                ->whereNotNull('planned_budget')
                ->where('fiscal_year_id', $previousFiscalMonth->fiscal_year_id)
                ->where('fiscal_month_id', $previousFiscalMonth->id)
                ->where('branch_id', $validated['branch_id'])
                ->when(
                    $departmentId,
                    fn ($q) => $q->where('department_id', $departmentId),
                    fn ($q) => $q->whereNull('department_id')
                )
                ->pluck('planned_budget', 'expense_item_id')
                ->toArray();
        }

        return response()->json([
            'expense_item_ids' => $expenseItemIds,
            'prev_month_budgets' => (object) $prevMonthBudgets,
        ]);
    }

    public function itemActivityLogs(ExpenseBudget $expenseBudget): JsonResponse
    {
        abort_unless(ExpenseBudgetAccess::canView(), 403);
        abort_unless(
            ExpenseBudgetAccess::canViewItemHistory(auth()->user(), $expenseBudget),
            403,
            ExpenseBudgetAccess::viewHistoryDeniedMessage(),
        );

        $expenseBudget->load([
            'expenseItem',
            'fiscalYear',
            'fiscalMonth',
            'branch',
            'department',
        ]);

        $logs = ExpenseBudgetActivityLog::query()
            ->where('expense_budget_id', $expenseBudget->id)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ExpenseBudgetActivityLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'summary' => $log->summary,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'meta' => $log->meta,
                'created_at' => $log->created_at?->toIso8601String(),
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                ] : null,
            ])
            ->values();

        return response()->json([
            'item' => [
                'id' => $expenseBudget->id,
                'expense_item' => $expenseBudget->expenseItem?->expense_type,
                'planned_budget' => $expenseBudget->planned_budget,
                'fiscal_year' => $expenseBudget->fiscalYear?->name,
                'fiscal_month' => $expenseBudget->fiscalMonth?->name,
                'branch' => $expenseBudget->branch?->name,
                'department' => $expenseBudget->department?->name,
            ],
            'logs' => $logs,
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array{id: int, name: string, frequent_expense: bool}>  $allExpenseItems
     * @param  \Illuminate\Support\Collection<int, array{id: int, name: string, frequent_expense: bool}>  $frequentExpenseItems
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string, frequent_expense: bool}>
     */
    private function resolveVisibleExpenseItems($allExpenseItems, $frequentExpenseItems)
    {
        $validIds = $allExpenseItems->pluck('id')->map(fn ($id) => (int) $id);

        if ($singleExpenseItemId = request('expense_item_id')) {
            $id = (int) $singleExpenseItemId;

            if ($validIds->contains($id)) {
                return $allExpenseItems->where('id', $id)->values();
            }
        }

        $requestedIds = collect(explode(',', (string) request('expense_item_ids', '')))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $validIds->contains($id))
            ->unique()
            ->values();

        if ($requestedIds->isNotEmpty()) {
            return $allExpenseItems
                ->filter(fn (array $item) => $requestedIds->contains((int) $item['id']))
                ->values();
        }

        return $frequentExpenseItems;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array{id: int, name: string}>  $visibleExpenseItems
     * @return array{branch: string, department: string, submissions: array<string, bool>}
     */
    private function buildSubmissionTrackerRow(
        Branch $branch,
        ?Department $department,
        $visibleExpenseItems,
        array $submissionLookup,
    ): array {
        $departmentKey = $department?->id ?? 0;
        $submissions = [];

        foreach ($visibleExpenseItems as $expenseItem) {
            $lookupKey = "{$branch->id}|{$departmentKey}|{$expenseItem['id']}";
            $submissions[(string) $expenseItem['id']] = isset($submissionLookup[$lookupKey]);
        }

        return [
            'branch' => $branch->name,
            'department' => $department?->name ?? '-',
            'submissions' => $submissions,
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function buildSubmissionLookup(?string $fiscalMonthId, ?string $fiscalYearId): array
    {
        $items = ExpenseBudget::query()
            ->whereNotNull('planned_budget')
            ->when($fiscalMonthId && $fiscalMonthId !== 'all', fn($q) => $q->where('fiscal_month_id', $fiscalMonthId))
            ->when($fiscalYearId && $fiscalYearId !== 'all', fn($q) => $q->where('fiscal_year_id', $fiscalYearId))
            ->get(['id', 'branch_id', 'department_id', 'expense_item_id']);

        $lookup = [];

        foreach ($items as $item) {
            $departmentKey = $item->department_id ?? 0;
            $lookupKey = "{$item->branch_id}|{$departmentKey}|{$item->expense_item_id}";
            $lookup[$lookupKey] = true;
        }

        return $lookup;
    }

    private function findExpenseBudgetForScope(
        int $fiscalYearId,
        int $fiscalMonthId,
        int $branchId,
        ?int $departmentId,
    ): ?ExpenseBudget {
        return ExpenseBudget::query()
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('fiscal_month_id', $fiscalMonthId)
            ->where('branch_id', $branchId)
            ->when(
                $departmentId,
                fn ($query) => $query->where('department_id', $departmentId),
                fn ($query) => $query->whereNull('department_id'),
            )
            ->first();
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string}>
     */
    private function fiscalYearOptions()
    {
        return FiscalYear::query()
            ->orderByDesc('gregorian_start_date')
            ->get(['id', 'name'])
            ->map(fn (FiscalYear $year) => [
                'id' => $year->id,
                'name' => $year->name,
            ])
            ->values();
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string, fiscal_year_id: int}>
     */
    private function fiscalMonthOptions()
    {
        return FiscalMonth::query()
            ->orderBy('fiscal_year_id')
            ->orderBy('efy_month_number')
            ->get(['id', 'name', 'fiscal_year_id'])
            ->map(fn (FiscalMonth $month) => [
                'id' => $month->id,
                'name' => $month->name,
                'fiscal_year_id' => $month->fiscal_year_id,
            ])
            ->values();
    }

    private function isHeadOfficeBranch(Branch $branch): bool
    {
        if (strcasecmp($branch->branch_code ?? '', 'HO') === 0) {
            return true;
        }

        return str_contains($branch->name, 'Head Office');
    }
}
