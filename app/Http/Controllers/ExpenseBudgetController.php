<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\ExpenseBudget;
use App\Models\ExpenseBudgetItem;
use App\Models\ExpenseItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseBudgetController extends Controller
{
    public function index(): Response
    {
        abort_unless(auth()->user()->can('view expense budgets'), 403);

        $query = ExpenseBudgetItem::query()
            ->with([
                'expenseBudget.branch',
                'expenseBudget.department',
                'expenseBudget.creator',
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

        if ($month = request('month')) {
            $query->whereHas('expenseBudget', function ($q) use ($month) {
                $q->where('month', $month);
            });
        }

        if ($year = request('year')) {
            $query->whereHas('expenseBudget', function ($q) use ($year) {
                $q->where('year', $year);
            });
        }

        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $years = ExpenseBudget::query()
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->values();

        $items = $query
            ->join('expense_budgets', function ($join) {
                $join->on('expense_budget_items.expense_budget_id', '=', 'expense_budgets.id')
                    ->whereNull('expense_budgets.deleted_at');
            })
            ->orderByDesc('expense_budgets.year')
            ->orderByDesc('expense_budgets.month')
            ->orderByDesc('expense_budget_items.created_at')
            ->select('expense_budget_items.*')
            ->paginate(5)
            ->withQueryString()
            ->through(fn (ExpenseBudgetItem $item) => [
                'id' => $item->id,
                'month' => $item->expenseBudget->month,
                'year' => $item->expenseBudget->year,
                'branch_id' => $item->expenseBudget->branch_id,
                'department_id' => $item->expenseBudget->department_id,
                'branch' => $item->expenseBudget->branch?->name,
                'department' => $item->expenseBudget->department?->name,
                'expense_item_id' => $item->expense_item_id,
                'expense_item' => $item->expenseItem?->expense_type,
                'planned_budget' => $item->planned_budget,
                'actual_budget' => 0,
                'status' => $item->status,
                'submitted_by' => $item->expenseBudget->creator?->name,
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
            'years' => $years,
            'request' => request()->only(['search', 'branch_id', 'department_id', 'month', 'year']),
        ]);
    }

    public function submissionTracker(): Response
    {
        abort_unless(auth()->user()->can('view expense budgets'), 403);

        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $years = ExpenseBudget::query()
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->values();

        $frequentExpenseItems = ExpenseItem::query()
            ->where('frequent_expense', true)
            ->orderBy('expense_type')
            ->get(['expense_parent_acc_code', 'expense_type'])
            ->map(fn (ExpenseItem $item) => [
                'id' => $item->expense_parent_acc_code,
                'name' => $item->expense_type,
            ])
            ->values();

        $submissionLookup = $this->buildSubmissionLookup(
            request('month'),
            request('year'),
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
                        $frequentExpenseItems,
                        $submissionLookup,
                    );
                }
            } elseif (! request('department_id')) {
                $rows[] = $this->buildSubmissionTrackerRow(
                    $branch,
                    null,
                    $frequentExpenseItems,
                    $submissionLookup,
                );
            }
        }

        return Inertia::render('Budget/ExpenseBudget/SubmissionTracker', [
            'rows' => $rows,
            'frequentExpenseItems' => $frequentExpenseItems,
            'branches' => $branches,
            'departments' => $departments,
            'years' => $years,
            'request' => request()->only(['branch_id', 'department_id', 'month', 'year']),
        ]);
    }

    public function create(): Response
    {
        abort_unless(auth()->user()->can('manage expense budgets'), 403);

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

        return Inertia::render('Budget/ExpenseBudget/Create', [
            'branches' => $branches,
            'departments' => $departments,
            'frequentExpenseItems' => $frequentExpenseItems,
            'otherExpenseItems' => $otherExpenseItems,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage expense budgets'), 403);

        $validated = $request->validate([
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:1990', 'max:2100'],
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
                    ->where('month', $validated['month'])
                    ->where('year', $validated['year'])
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
                (int) $validated['month'],
                (int) $validated['year'],
                (int) $validated['branch_id'],
                $validated['department_id'] ? (int) $validated['department_id'] : null,
            );

            if ($budget) {
                $budget->update([
                    'budget_amount' => (float) $budget->budget_amount + $newBudgetAmount,
                ]);
            } else {
                $budget = ExpenseBudget::create([
                    'month' => $validated['month'],
                    'year' => $validated['year'],
                    'branch_id' => $validated['branch_id'],
                    'department_id' => $validated['department_id'],
                    'budget_amount' => $newBudgetAmount,
                    'created_by' => auth()->id(),
                ]);
            }

            foreach ($itemsToSave as $item) {
                ExpenseBudgetItem::create([
                    'expense_budget_id' => $budget->id,
                    'expense_item_id' => $item['expense_item_id'],
                    'prev_month_budget' => $item['prev_month_budget'] ?? null,
                    'planned_budget' => $item['planned_budget'],
                    'status' => 'draft',
                ]);
            }
        });

        return redirect()
            ->route('expense-budget.create')
            ->with('message', 'Expense budget saved successfully.');
    }

    public function destroyItem(ExpenseBudgetItem $expenseBudgetItem): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage expense budgets'), 403);

        DB::transaction(function () use ($expenseBudgetItem) {
            $budget = $expenseBudgetItem->expenseBudget;

            if ($budget) {
                $budget->update([
                    'budget_amount' => max(0, (float) $budget->budget_amount - (float) $expenseBudgetItem->planned_budget),
                ]);

                $expenseBudgetItem->delete();

                if ($budget->items()->count() === 0) {
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
        abort_unless(auth()->user()->can('manage expense budgets'), 403);

        $validated = $request->validate([
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:1990', 'max:2100'],
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'expense_item_id' => ['required', 'exists:expenses,expense_parent_acc_code'],
            'planned_budget' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:draft,submitted,approved'],
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
                    ->where('month', $validated['month'])
                    ->where('year', $validated['year'])
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

        DB::transaction(function () use ($expenseBudgetItem, $validated, $departmentId, $newPlannedBudget) {
            $oldBudget = $expenseBudgetItem->expenseBudget;
            $oldPlannedBudget = (float) $expenseBudgetItem->planned_budget;

            $targetBudget = $this->findExpenseBudgetForScope(
                (int) $validated['month'],
                (int) $validated['year'],
                (int) $validated['branch_id'],
                $departmentId,
            );

            if (! $targetBudget) {
                $targetBudget = ExpenseBudget::create([
                    'month' => $validated['month'],
                    'year' => $validated['year'],
                    'branch_id' => $validated['branch_id'],
                    'department_id' => $validated['department_id'],
                    'budget_amount' => 0,
                    'created_by' => auth()->id(),
                ]);
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
                'status' => $validated['status'],
            ]);

            if ($oldBudget && $oldBudget->id !== $targetBudget->id) {
                $targetBudget->update([
                    'budget_amount' => (float) $targetBudget->budget_amount + $newPlannedBudget,
                ]);

                if ($oldBudget->items()->count() === 0) {
                    $oldBudget->delete();
                }
            }
        });

        return redirect()
            ->route('expense-budget.index')
            ->with('message', 'Expense budget item updated successfully.');
    }

    public function getPrevBudget(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->can('manage expense budgets'), 403);

        $validated = $request->validate([
            'expense_item_id' => ['required', 'exists:expenses,expense_parent_acc_code'],
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:1990', 'max:2100'],
        ]);

        $branch = Branch::findOrFail($validated['branch_id']);
        $departmentId = $this->isHeadOfficeBranch($branch)
            ? ($validated['department_id'] ?? null)
            : null;

        [$prevMonth, $prevYear] = $this->previousMonthYear(
            (int) $validated['month'],
            (int) $validated['year']
        );

        $prevBudgetItem = ExpenseBudgetItem::query()
            ->where('expense_item_id', $validated['expense_item_id'])
            ->whereHas('expenseBudget', function ($query) use ($validated, $departmentId, $prevMonth, $prevYear) {
                $query
                    ->where('month', $prevMonth)
                    ->where('year', $prevYear)
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
        abort_unless(auth()->user()->can('manage expense budgets'), 403);

        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:1990', 'max:2100'],
        ]);

        $branch = Branch::findOrFail($validated['branch_id']);
        $departmentId = $this->isHeadOfficeBranch($branch)
            ? ($validated['department_id'] ?? null)
            : null;

        $expenseItemIds = ExpenseBudgetItem::query()
            ->whereNotNull('planned_budget')
            ->whereHas('expenseBudget', function ($query) use ($validated, $departmentId) {
                $query
                    ->where('month', $validated['month'])
                    ->where('year', $validated['year'])
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

    /**
     * @param  \Illuminate\Support\Collection<int, array{id: int, name: string}>  $frequentExpenseItems
     * @return array{branch: string, department: string, submissions: array<string, bool>}
     */
    private function buildSubmissionTrackerRow(
        Branch $branch,
        ?Department $department,
        $frequentExpenseItems,
        array $submissionLookup,
    ): array {
        $departmentKey = $department?->id ?? 0;
        $submissions = [];

        foreach ($frequentExpenseItems as $expenseItem) {
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
    private function buildSubmissionLookup(?string $month, ?string $year): array
    {
        $items = ExpenseBudgetItem::query()
            ->whereNotNull('planned_budget')
            ->whereHas('expenseBudget', function ($query) use ($month, $year) {
                if ($month && $month !== 'all') {
                    $query->where('month', $month);
                }

                if ($year && $year !== 'all') {
                    $query->where('year', $year);
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
        int $month,
        int $year,
        int $branchId,
        ?int $departmentId,
    ): ?ExpenseBudget {
        return ExpenseBudget::query()
            ->where('month', $month)
            ->where('year', $year)
            ->where('branch_id', $branchId)
            ->when(
                $departmentId,
                fn ($query) => $query->where('department_id', $departmentId),
                fn ($query) => $query->whereNull('department_id'),
            )
            ->first();
    }

    private function isHeadOfficeBranch(Branch $branch): bool
    {
        if (strcasecmp($branch->branch_code ?? '', 'HO') === 0) {
            return true;
        }

        return str_contains($branch->name, 'Head Office');
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function previousMonthYear(int $month, int $year): array
    {
        if ($month === 1) {
            return [12, $year - 1];
        }

        return [$month - 1, $year];
    }
}
