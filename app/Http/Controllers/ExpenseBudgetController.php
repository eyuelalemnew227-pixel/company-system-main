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

class ExpenseBudgetController extends Controller
{
    public function __construct(
        private readonly ExpenseBudgetActivityLogger $activityLogger,
    ) {}

    public function index(): Response
    {
        abort_unless(ExpenseBudgetAccess::canView(), 403);

        $query = ExpenseBudgetItem::query()
            ->with([
                'expenseBudget.branch',
                'expenseBudget.department',
                'expenseBudget.creator',
                'expenseBudget.fiscalYear',
                'expenseBudget.fiscalMonth',
                'expenseItem',
            ])
            ->whereNotNull('planned_budget')
            ->whereHas('expenseBudget');

        if ($search = request('search')) {
            $query->whereHas('expenseItem', function ($q) use ($search) {
                $q->where('expense_type', 'like', "%{$search}%");
            });
        }

        if ($branchId = request('branch_id')) {
            $query->whereHas('expenseBudget', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        if ($departmentId = request('department_id')) {
            $query->whereHas('expenseBudget', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        if ($fiscalMonthId = request('fiscal_month_id')) {
            $query->whereHas('expenseBudget', function ($q) use ($fiscalMonthId) {
                $q->where('fiscal_month_id', $fiscalMonthId);
            });
        }

        if ($fiscalYearId = request('fiscal_year_id')) {
            $query->whereHas('expenseBudget', function ($q) use ($fiscalYearId) {
                $q->where('fiscal_year_id', $fiscalYearId);
            });
        }

        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $items = $query
            ->join('expense_budgets', function ($join) {
                $join->on('expense_budget_items.expense_budget_id', '=', 'expense_budgets.id')
                    ->whereNull('expense_budgets.deleted_at');
            })
            ->leftJoin('fiscal_years', 'expense_budgets.fiscal_year_id', '=', 'fiscal_years.id')
            ->leftJoin('fiscal_months', 'expense_budgets.fiscal_month_id', '=', 'fiscal_months.id')
            ->orderByDesc('fiscal_years.gregorian_start_date')
            ->orderByDesc('fiscal_months.efy_month_number')
            ->orderByDesc('expense_budget_items.created_at')
            ->select('expense_budget_items.*')
            ->paginate(5)
            ->withQueryString()
            ->through(fn (ExpenseBudgetItem $item) => [
                'id' => $item->id,
                'fiscal_year_id' => $item->expenseBudget->fiscal_year_id,
                'fiscal_month_id' => $item->expenseBudget->fiscal_month_id,
                'fiscal_year' => $item->expenseBudget->fiscalYear?->name,
                'fiscal_month' => $item->expenseBudget->fiscalMonth?->name,
                'branch_id' => $item->expenseBudget->branch_id,
                'department_id' => $item->expenseBudget->department_id,
                'branch' => $item->expenseBudget->branch?->name,
                'department' => $item->expenseBudget->department?->name,
                'expense_item_id' => $item->expense_item_id,
                'expense_item' => $item->expenseItem?->expense_type,
                'planned_budget' => $item->planned_budget,
                'submitted_by' => $item->expenseBudget->creator?->name,
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

        return Inertia::render('Budget/ExpenseBudget/Index', [
            'items' => $items,
            'branches' => $branches,
            'departments' => $departments,
            'expenseItems' => $expenseItems,
            'fiscalYears' => $this->fiscalYearOptions(),
            'fiscalMonths' => $this->fiscalMonthOptions(),
            'request' => request()->only(['search', 'branch_id', 'department_id', 'fiscal_month_id', 'fiscal_year_id']),
        ]);
    }

    public function submissionTracker(): Response
    {
        abort_unless(ExpenseBudgetAccess::canView(), 403);

        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
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

    public function create(): Response
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $branches = Branch::query()
            ->where(function ($query) {
                $query->where('status', 'active')
                    ->orWhere('name', 'like', '%Head Office%')
                    ->orWhereRaw('UPPER(branch_code) = ?', ['HO']);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $mapExpenseItem = fn (ExpenseItem $item) => [
            'id' => $item->expense_parent_acc_code,
            'name' => $item->expense_type,
            'icon' => null,
        ];

        $frequentExpenseItems = ExpenseItem::query()
            ->where('frequent_expense', true)
            ->orderBy('expense_type')
            ->get()
            ->map($mapExpenseItem)
            ->values();

        $otherExpenseItems = ExpenseItem::query()
            ->where('frequent_expense', false)
            ->orderBy('expense_type')
            ->get()
            ->map($mapExpenseItem)
            ->values();

        $defaultPeriod = $this->resolveDefaultFiscalPeriod();

        return Inertia::render('Budget/ExpenseBudget/Create', [
            'branches' => $branches,
            'departments' => $departments,
            'frequentExpenseItems' => $frequentExpenseItems,
            'otherExpenseItems' => $otherExpenseItems,
            'fiscalYears' => $this->fiscalYearOptions(),
            'fiscalMonths' => $this->fiscalMonthOptions(),
            'defaultFiscalYearId' => $defaultPeriod['fiscal_year_id'],
            'defaultFiscalMonthId' => $defaultPeriod['fiscal_month_id'],
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

        $budgetedItemIds = ExpenseBudgetItem::query()
            ->whereNotNull('planned_budget')
            ->whereHas('expenseBudget', function ($query) use ($validated, $isHeadOffice) {
                $departmentId = $isHeadOffice ? ($validated['department_id'] ?? null) : null;

                $query
                    ->where('fiscal_year_id', $validated['fiscal_year_id'])
                    ->where('fiscal_month_id', $validated['fiscal_month_id'])
                    ->where('branch_id', $validated['branch_id'])
                    ->when(
                        $departmentId,
                        fn ($q) => $q->where('department_id', $departmentId),
                        fn ($q) => $q->whereNull('department_id')
                    );
            })
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

        $newBudgetAmount = collect($itemsToSave)->sum(fn (array $item) => (float) $item['planned_budget']);

        DB::transaction(function () use ($validated, $itemsToSave, $newBudgetAmount) {
            $budget = $this->findExpenseBudgetForScope(
                (int) $validated['fiscal_year_id'],
                (int) $validated['fiscal_month_id'],
                (int) $validated['branch_id'],
                $validated['department_id'] ? (int) $validated['department_id'] : null,
            );

            $budgetWasCreated = false;

            if ($budget) {
                $budget->update([
                    'budget_amount' => (float) $budget->budget_amount + $newBudgetAmount,
                ]);
            } else {
                $budget = ExpenseBudget::create([
                    'fiscal_year_id' => $validated['fiscal_year_id'],
                    'fiscal_month_id' => $validated['fiscal_month_id'],
                    'branch_id' => $validated['branch_id'],
                    'department_id' => $validated['department_id'],
                    'budget_amount' => $newBudgetAmount,
                    'created_by' => auth()->id(),
                ]);
                $budgetWasCreated = true;
            }

            if ($budgetWasCreated) {
                $this->activityLogger->logBudgetCreated($budget);
            }

            foreach ($itemsToSave as $item) {
                $createdItem = ExpenseBudgetItem::create([
                    'expense_budget_id' => $budget->id,
                    'expense_item_id' => $item['expense_item_id'],
                    'prev_month_budget' => $item['prev_month_budget'] ?? null,
                    'planned_budget' => $item['planned_budget'],
                ]);

                $this->activityLogger->logItemCreated($createdItem);
            }
        });

        return redirect()
            ->route('expense-budget.create')
            ->with('message', 'Expense budget saved successfully.');
    }

    public function destroyItem(ExpenseBudgetItem $expenseBudgetItem): RedirectResponse
    {
        abort_unless(ExpenseBudgetAccess::canManage(), 403, ExpenseBudgetAccess::manageDeniedMessage());

        $expenseBudgetItem->load([
            'expenseItem',
            'expenseBudget.fiscalYear',
            'expenseBudget.fiscalMonth',
            'expenseBudget.branch',
            'expenseBudget.department',
        ]);

        $budget = $expenseBudgetItem->expenseBudget;
        $willDeleteBudget = $budget && $budget->items()->count() === 1;

        DB::transaction(function () use ($expenseBudgetItem, $budget, $willDeleteBudget) {
            if ($budget) {
                $this->activityLogger->logItemDeleted($expenseBudgetItem, $budget);

                $budget->update([
                    'budget_amount' => max(0, (float) $budget->budget_amount - (float) $expenseBudgetItem->planned_budget),
                ]);

                $expenseBudgetItem->delete();

                if ($willDeleteBudget) {
                    $this->activityLogger->logBudgetDeleted($budget);
                    $budget->delete();
                }
            } else {
                $expenseBudgetItem->delete();
            }
        });

        return redirect()
            ->route('expense-budget.index')
            ->with('message', 'Expense budget item deleted successfully.');
    }

    public function updateItem(Request $request, ExpenseBudgetItem $expenseBudgetItem): RedirectResponse
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
        $newPlannedBudget = (float) $validated['planned_budget'];

        $duplicateExists = ExpenseBudgetItem::query()
            ->where('id', '!=', $expenseBudgetItem->id)
            ->where('expense_item_id', $validated['expense_item_id'])
            ->whereHas('expenseBudget', function ($query) use ($validated, $departmentId) {
                $query
                    ->where('fiscal_year_id', $validated['fiscal_year_id'])
                    ->where('fiscal_month_id', $validated['fiscal_month_id'])
                    ->where('branch_id', $validated['branch_id'])
                    ->when(
                        $departmentId,
                        fn ($q) => $q->where('department_id', $departmentId),
                        fn ($q) => $q->whereNull('department_id')
                    );
            })
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'expense_item_id' => 'A planned budget has already been set for this expense item.',
            ]);
        }

        $expenseBudgetItem->load([
            'expenseItem',
            'expenseBudget.fiscalYear',
            'expenseBudget.fiscalMonth',
            'expenseBudget.branch',
            'expenseBudget.department',
        ]);

        $oldValues = $this->activityLogger->itemAttributes($expenseBudgetItem);

        DB::transaction(function () use ($expenseBudgetItem, $validated, $departmentId, $newPlannedBudget, $oldValues) {
            $oldBudget = $expenseBudgetItem->expenseBudget;
            $oldPlannedBudget = (float) $expenseBudgetItem->planned_budget;

            $targetBudget = $this->findExpenseBudgetForScope(
                (int) $validated['fiscal_year_id'],
                (int) $validated['fiscal_month_id'],
                (int) $validated['branch_id'],
                $departmentId,
            );

            $targetBudgetWasCreated = false;

            if (! $targetBudget) {
                $targetBudget = ExpenseBudget::create([
                    'fiscal_year_id' => $validated['fiscal_year_id'],
                    'fiscal_month_id' => $validated['fiscal_month_id'],
                    'branch_id' => $validated['branch_id'],
                    'department_id' => $validated['department_id'],
                    'budget_amount' => 0,
                    'created_by' => auth()->id(),
                ]);
                $targetBudgetWasCreated = true;
            }

            if ($oldBudget && $oldBudget->id !== $targetBudget->id) {
                $oldBudget->update([
                    'budget_amount' => max(0, (float) $oldBudget->budget_amount - $oldPlannedBudget),
                ]);
            } elseif ($oldBudget && $oldBudget->id === $targetBudget->id) {
                $targetBudget->update([
                    'budget_amount' => max(0, (float) $targetBudget->budget_amount - $oldPlannedBudget + $newPlannedBudget),
                ]);
            }

            $expenseBudgetItem->update([
                'expense_budget_id' => $targetBudget->id,
                'expense_item_id' => $validated['expense_item_id'],
                'planned_budget' => $newPlannedBudget,
            ]);

            if ($oldBudget && $oldBudget->id !== $targetBudget->id) {
                $targetBudget->update([
                    'budget_amount' => (float) $targetBudget->budget_amount + $newPlannedBudget,
                ]);

                if ($oldBudget->items()->count() === 0) {
                    $this->activityLogger->logBudgetDeleted($oldBudget);
                    $oldBudget->delete();
                }
            }

            if ($targetBudgetWasCreated) {
                $this->activityLogger->logBudgetCreated($targetBudget);
            }

            $newValues = $this->activityLogger->itemAttributes($expenseBudgetItem->fresh());
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
                $this->activityLogger->logItemUpdated($expenseBudgetItem, $changedOld, $changedNew);
            }
        });

        return redirect()
            ->route('expense-budget.index')
            ->with('message', 'Expense budget item updated successfully.');
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

        $prevBudgetItem = ExpenseBudgetItem::query()
            ->where('expense_item_id', $validated['expense_item_id'])
            ->whereHas('expenseBudget', function ($query) use ($validated, $departmentId, $previousFiscalMonth) {
                $query
                    ->where('fiscal_year_id', $previousFiscalMonth->fiscal_year_id)
                    ->where('fiscal_month_id', $previousFiscalMonth->id)
                    ->where('branch_id', $validated['branch_id'])
                    ->when(
                        $departmentId,
                        fn ($q) => $q->where('department_id', $departmentId),
                        fn ($q) => $q->whereNull('department_id')
                    );
            })
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

        $expenseItemIds = ExpenseBudgetItem::query()
            ->whereNotNull('planned_budget')
            ->whereHas('expenseBudget', function ($query) use ($validated, $departmentId) {
                $query
                    ->where('fiscal_year_id', $validated['fiscal_year_id'])
                    ->where('fiscal_month_id', $validated['fiscal_month_id'])
                    ->where('branch_id', $validated['branch_id'])
                    ->when(
                        $departmentId,
                        fn ($q) => $q->where('department_id', $departmentId),
                        fn ($q) => $q->whereNull('department_id')
                    );
            })
            ->pluck('expense_item_id')
            ->unique()
            ->values();

        return response()->json([
            'expense_item_ids' => $expenseItemIds,
        ]);
    }

    public function itemActivityLogs(ExpenseBudgetItem $expenseBudgetItem): JsonResponse
    {
        abort_unless(ExpenseBudgetAccess::canView(), 403);
        abort_unless(
            ExpenseBudgetAccess::canViewItemHistory(auth()->user(), $expenseBudgetItem),
            403,
            ExpenseBudgetAccess::viewHistoryDeniedMessage(),
        );

        $expenseBudgetItem->load([
            'expenseItem',
            'expenseBudget.fiscalYear',
            'expenseBudget.fiscalMonth',
            'expenseBudget.branch',
            'expenseBudget.department',
        ]);

        $budget = $expenseBudgetItem->expenseBudget;

        $logs = ExpenseBudgetActivityLog::query()
            ->where('expense_budget_item_id', $expenseBudgetItem->id)
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
                'id' => $expenseBudgetItem->id,
                'expense_item' => $expenseBudgetItem->expenseItem?->expense_type,
                'planned_budget' => $expenseBudgetItem->planned_budget,
                'fiscal_year' => $budget?->fiscalYear?->name,
                'fiscal_month' => $budget?->fiscalMonth?->name,
                'branch' => $budget?->branch?->name,
                'department' => $budget?->department?->name,
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
        $items = ExpenseBudgetItem::query()
            ->whereNotNull('planned_budget')
            ->whereHas('expenseBudget', function ($query) use ($fiscalMonthId, $fiscalYearId) {
                if ($fiscalMonthId && $fiscalMonthId !== 'all') {
                    $query->where('fiscal_month_id', $fiscalMonthId);
                }

                if ($fiscalYearId && $fiscalYearId !== 'all') {
                    $query->where('fiscal_year_id', $fiscalYearId);
                }
            })
            ->with(['expenseBudget:id,branch_id,department_id'])
            ->get(['id', 'expense_budget_id', 'expense_item_id']);

        $lookup = [];

        foreach ($items as $item) {
            $budget = $item->expenseBudget;

            if (! $budget) {
                continue;
            }

            $departmentKey = $budget->department_id ?? 0;
            $lookupKey = "{$budget->branch_id}|{$departmentKey}|{$item->expense_item_id}";
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

    private function findPreviousFiscalMonth(int $fiscalMonthId): ?FiscalMonth
    {
        $current = FiscalMonth::query()->find($fiscalMonthId);

        if (! $current) {
            return null;
        }

        $previousInYear = FiscalMonth::query()
            ->where('fiscal_year_id', $current->fiscal_year_id)
            ->where('efy_month_number', $current->efy_month_number - 1)
            ->first();

        if ($previousInYear) {
            return $previousInYear;
        }

        $currentYear = FiscalYear::query()->find($current->fiscal_year_id);

        if (! $currentYear) {
            return null;
        }

        $previousYear = FiscalYear::query()
            ->where('gregorian_end_date', '<', $currentYear->gregorian_start_date)
            ->orderByDesc('gregorian_end_date')
            ->first();

        if (! $previousYear) {
            return null;
        }

        return FiscalMonth::query()
            ->where('fiscal_year_id', $previousYear->id)
            ->orderByDesc('efy_month_number')
            ->first();
    }

    /**
     * @return array{fiscal_year_id: int|null, fiscal_month_id: int|null}
     */
    private function resolveDefaultFiscalPeriod(): array
    {
        $today = now()->toDateString();

        $currentMonth = FiscalMonth::query()
            ->whereDate('gregorian_start_date', '<=', $today)
            ->whereDate('gregorian_end_date', '>=', $today)
            ->first();

        if ($currentMonth) {
            return [
                'fiscal_year_id' => $currentMonth->fiscal_year_id,
                'fiscal_month_id' => $currentMonth->id,
            ];
        }

        $activeYear = FiscalYear::query()
            ->where('is_active', true)
            ->orderByDesc('gregorian_start_date')
            ->first()
            ?? FiscalYear::query()->orderByDesc('gregorian_start_date')->first();

        if (! $activeYear) {
            return [
                'fiscal_year_id' => null,
                'fiscal_month_id' => null,
            ];
        }

        $latestMonth = FiscalMonth::query()
            ->where('fiscal_year_id', $activeYear->id)
            ->orderByDesc('efy_month_number')
            ->first();

        return [
            'fiscal_year_id' => $activeYear->id,
            'fiscal_month_id' => $latestMonth?->id,
        ];
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
