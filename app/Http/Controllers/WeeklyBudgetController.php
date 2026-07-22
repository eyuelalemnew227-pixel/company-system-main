<?php

namespace App\Http\Controllers;

use App\Enums\WeeklyBudgetRequestType;
use App\Enums\WeeklyBudgetStatusCeo;
use App\Enums\WeeklyBudgetStatusDepartment;
use App\Enums\WeeklyBudgetStatusFinance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\ExpenseItem;
use App\Models\WeeklyBudget;
use App\Models\WeeklyBudgetActivityLog;
use App\Services\WeeklyBudgetActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WeeklyBudgetController extends Controller
{
    public function __construct(
        private readonly WeeklyBudgetActivityLogger $activityLogger,
    ) {}

    public function index(): Response
    {
        abort_unless(auth()->user()->can('view weekly budgets'), 403);

        [$today, $currentFiscalYear, $currentFiscalMonth] = $this->currentFiscalPeriod();
        $hasFiscalYearFilter = request()->has('fiscal_year_id');
        $fiscalYearFilter = $hasFiscalYearFilter
            ? request('fiscal_year_id')
            : $currentFiscalYear?->id;
        $fiscalMonthFilter = request()->has('fiscal_month_id')
            ? request('fiscal_month_id')
            : ($hasFiscalYearFilter ? null : $currentFiscalMonth?->id);

        $query = WeeklyBudget::query()->with([
            'branch',
            'department',
            'fiscalYear',
            'fiscalMonth',
            'creator',
        ]);

        $query
            ->when(request('request_type'), fn ($q, $v) => $q->where('request_type', $v))
            ->when(request('status_finance'), fn ($q, $v) => $q->where('status_finance', $v))
            ->when(request('status_department'), fn ($q, $v) => $q->where('status_department', $v))
            ->when(request('status_ceo'), fn ($q, $v) => $q->where('status_ceo', $v))
            ->when(request('branch_id'), fn ($q, $v) => $q->where('branch_id', $v))
            ->when(request('department_id'), fn ($q, $v) => $q->where('department_id', $v))
            ->when($fiscalYearFilter && $fiscalYearFilter !== 'all', fn ($q) => $q->where('fiscal_year_id', $fiscalYearFilter))
            ->when($fiscalMonthFilter && $fiscalMonthFilter !== 'all', fn ($q) => $q->where('fiscal_month_id', $fiscalMonthFilter))
            ->when(request('week_start_date'), fn ($q, $v) => $q->where('week_start_date', $v));

        $items = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (WeeklyBudget $wb) => [
                'id'             => $wb->id,
                'branch_id'      => $wb->branch_id,
                'department_id'  => $wb->department_id,
                'fiscal_year_id' => $wb->fiscal_year_id,
                'fiscal_month_id' => $wb->fiscal_month_id,
                'branch'         => $wb->branch?->name,
                'department'     => $wb->department?->name,
                'fiscal_year'    => $wb->fiscalYear?->name,
                'fiscal_month'   => $wb->fiscalMonth?->name,
                'week_number'    => $wb->week_number,
                'week_start_date' => $wb->week_start_date?->toDateString(),
                'week_end_date'   => $wb->week_end_date?->toDateString(),
                'request_type'   => $wb->request_type?->value,
                'status_finance' => $wb->status_finance?->value,
                'status_department' => $wb->status_department?->value,
                'status_ceo'     => $wb->status_ceo?->value,
                'amount'         => $wb->amount,
                'description'    => $wb->description,
                'note'           => $wb->note,
                'can_view_history' => auth()->user()->can('view weekly budget activity logs'),
            ]);

        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->where('is_active_on_weekly_budget', 1)
            ->orderBy('name')
            ->get(['id', 'name']);

        $filters = request()->only([
            'request_type',
            'status_finance',
            'status_department',
            'status_ceo',
            'branch_id',
            'department_id',
            'fiscal_year_id',
            'fiscal_month_id',
            'week_start_date',
        ]);

        if (! request()->has('fiscal_year_id') && $currentFiscalYear) {
            $filters['fiscal_year_id'] = (string) $currentFiscalYear->id;
        }
        if (! request()->has('fiscal_month_id') && ! $hasFiscalYearFilter && $currentFiscalMonth) {
            $filters['fiscal_month_id'] = (string) $currentFiscalMonth->id;
        }

        return Inertia::render('Budget/WeeklyBudget/Index', [
            'items'       => $items,
            'branches'    => $branches,
            'departments' => $departments,
            'fiscalYears' => $this->fiscalYearOptions(),
            'fiscalMonths' => $this->fiscalMonthOptions(),
            'requestTypes'  => array_column(WeeklyBudgetRequestType::cases(), 'value'),
            'statusFinances' => array_column(WeeklyBudgetStatusFinance::cases(), 'value'),
            'statusDepartments' => array_column(WeeklyBudgetStatusDepartment::cases(), 'value'),
            'statusCeos'    => array_column(WeeklyBudgetStatusCeo::cases(), 'value'),
            'today'         => $today,
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
            'request'     => $filters,
        ]);
    }

    public function create(): Response
    {
        abort_unless(auth()->user()->can('manage weekly budgets'), 403);

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
            ->where('is_active_on_weekly_budget', 1)
            ->orderBy('name')
            ->get(['id', 'name']);

        $today = now()->toDateString();

        $currentFiscalYear = FiscalYear::query()
            ->where('gregorian_start_date', '<=', $today)
            ->where('gregorian_end_date', '>=', $today)
            ->first();

        $currentFiscalMonth = $currentFiscalYear
            ? FiscalMonth::query()
                ->where('fiscal_year_id', $currentFiscalYear->id)
                ->where('gregorian_start_date', '<=', $today)
                ->where('gregorian_end_date', '>=', $today)
                ->first()
            : null;

        return Inertia::render('Budget/WeeklyBudget/Create', [
            'branches'             => $branches,
            'departments'          => $departments,
            'fiscalYears'          => $this->fiscalYearOptions(),
            'fiscalMonths'         => $this->fiscalMonthOptions(),
            'today'                => $today,
            'currentFiscalYearId'  => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
            'request'              => request()->only(['department_id', 'branch_id']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage weekly budgets'), 403);

        $validated = $request->validate([
            'department_id'  => ['required', 'exists:departments,id'],
            'branch_id'      => ['nullable', 'exists:branches,id'],
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => [
                'required',
                'integer',
                Rule::exists('fiscal_months', 'id')->where(
                    fn ($query) => $query->where('fiscal_year_id', $request->input('fiscal_year_id'))
                ),
            ],
            'week_number'    => ['required', 'integer', 'min:1', 'max:53'],
            'week_start_date' => ['required', 'date'],
            'week_end_date'  => ['required', 'date', 'after_or_equal:week_start_date'],
            'request_type'   => ['required', Rule::enum(WeeklyBudgetRequestType::class)],
            'amount'         => ['required', 'numeric', 'min:0'],
            'description'    => ['required', 'string'],
            'note'           => ['nullable', 'string'],
        ]);

        $department = Department::findOrFail($validated['department_id']);
        $deptName = strtolower($department->name);
        $isBranchEnabled = str_contains($deptName, 'operation') || str_contains($deptName, 'hr') || str_contains($deptName, 'human resource');

        if ($isBranchEnabled && empty($validated['branch_id'])) {
            return back()->withErrors([
                'branch_id' => 'The branch field is required for the selected department.',
            ])->withInput();
        }

        if (! $isBranchEnabled) {
            $validated['branch_id'] = null;
        }

        $weeklyBudget = WeeklyBudget::create([
            ...$validated,
            'status_finance'    => WeeklyBudgetStatusFinance::Pending->value,
            'status_department' => WeeklyBudgetStatusDepartment::Pending->value,
            'status_ceo'        => WeeklyBudgetStatusCeo::Pending->value,
            'created_by'        => auth()->id(),
        ]);
        $this->activityLogger->logCreated($weeklyBudget);

        return redirect()
            ->route('weekly-budget.index')
            ->with('message', 'Weekly budget request submitted successfully.');
    }

    public function update(Request $request, WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage weekly budgets'), 403);

        $validated = $request->validate([
            'department_id'  => ['required', 'exists:departments,id'],
            'branch_id'      => ['nullable', 'exists:branches,id'],
            'fiscal_year_id' => ['required', 'integer', 'exists:fiscal_years,id'],
            'fiscal_month_id' => [
                'required',
                'integer',
                Rule::exists('fiscal_months', 'id')->where(
                    fn ($query) => $query->where('fiscal_year_id', $request->input('fiscal_year_id'))
                ),
            ],
            'week_number'    => ['required', 'integer', 'min:1', 'max:53'],
            'week_start_date' => ['required', 'date'],
            'week_end_date'  => ['required', 'date', 'after_or_equal:week_start_date'],
            'request_type'   => ['required', Rule::enum(WeeklyBudgetRequestType::class)],
            'amount'         => ['required', 'numeric', 'min:0'],
            'description'    => ['required', 'string'],
            'note'           => ['nullable', 'string'],
        ]);

        $department = Department::findOrFail($validated['department_id']);
        $deptName = strtolower($department->name);
        $isBranchEnabled = str_contains($deptName, 'operation') || str_contains($deptName, 'hr') || str_contains($deptName, 'human resource');

        if ($isBranchEnabled && empty($validated['branch_id'])) {
            return back()->withErrors([
                'branch_id' => 'The branch field is required for the selected department.',
            ])->withInput();
        }

        if (! $isBranchEnabled) {
            $validated['branch_id'] = null;
        }

        $oldValues = $this->activityLogger->attributes($weeklyBudget);
        $weeklyBudget->update($validated);
        $this->activityLogger->logChanges($weeklyBudget, $oldValues);

        return redirect()
            ->route('weekly-budget.index')
            ->with('message', 'Weekly budget updated successfully.');
    }

    public function destroy(WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage weekly budgets'), 403);

        $this->activityLogger->logDeleted($weeklyBudget);
        $weeklyBudget->delete();

        return redirect()
            ->route('weekly-budget.index')
            ->with('message', 'Weekly budget deleted successfully.');
    }

    public function activityLogs(WeeklyBudget $weeklyBudget): JsonResponse
    {
        abort_unless(
            auth()->user()->can('view weekly budgets')
            && auth()->user()->can('view weekly budget activity logs'),
            403,
        );

        $weeklyBudget->load([
            'branch',
            'department',
            'fiscalYear',
            'fiscalMonth',
        ]);

        $logs = WeeklyBudgetActivityLog::query()
            ->where('weekly_budget_id', $weeklyBudget->id)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (WeeklyBudgetActivityLog $log) => [
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
                'id' => $weeklyBudget->id,
                'department' => $weeklyBudget->department?->name,
                'branch' => $weeklyBudget->branch?->name,
                'fiscal_year' => $weeklyBudget->fiscalYear?->name,
                'fiscal_month' => $weeklyBudget->fiscalMonth?->name,
                'week_number' => $weeklyBudget->week_number,
                'amount' => $weeklyBudget->amount,
            ],
            'logs' => $logs,
        ]);
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string}>
     */
    private function fiscalYearOptions()
    {
        return FiscalYear::query()
            ->orderByDesc('gregorian_start_date')
            ->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date'])
            ->map(fn (FiscalYear $year) => [
                'id'                   => $year->id,
                'name'                 => $year->name,
                'gregorian_start_date' => $year->gregorian_start_date?->toDateString(),
                'gregorian_end_date'   => $year->gregorian_end_date?->toDateString(),
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
            ->get(['id', 'name', 'fiscal_year_id', 'gregorian_start_date', 'gregorian_end_date'])
            ->map(fn (FiscalMonth $month) => [
                'id'                   => $month->id,
                'name'                 => $month->name,
                'fiscal_year_id'       => $month->fiscal_year_id,
                'gregorian_start_date' => $month->gregorian_start_date?->toDateString(),
                'gregorian_end_date'   => $month->gregorian_end_date?->toDateString(),
            ])
            ->values();
    }

    /**
     * @return array{0: string, 1: ?FiscalYear, 2: ?FiscalMonth}
     */
    private function currentFiscalPeriod(): array
    {
        $today = now()->toDateString();
        $currentFiscalYear = FiscalYear::query()
            ->where('gregorian_start_date', '<=', $today)
            ->where('gregorian_end_date', '>=', $today)
            ->first();

        $currentFiscalMonth = $currentFiscalYear
            ? FiscalMonth::query()
                ->where('fiscal_year_id', $currentFiscalYear->id)
                ->where('gregorian_start_date', '<=', $today)
                ->where('gregorian_end_date', '>=', $today)
                ->first()
            : null;

        return [$today, $currentFiscalYear, $currentFiscalMonth];
    }

    private function isHeadOfficeBranch(Branch $branch): bool
    {
        if (strcasecmp($branch->branch_code ?? '', 'HO') === 0) {
            return true;
        }

        return str_contains($branch->name, 'Head Office');
    }

    public function financeView(): Response
    {
        abort_unless(auth()->user()->can('view finance budgets'), 403);

        [$today, $currentFiscalYear, $currentFiscalMonth] = $this->currentFiscalPeriod();
        $hasFiscalYearFilter = request()->has('fiscal_year_id');
        $fiscalYearFilter = $hasFiscalYearFilter
            ? request('fiscal_year_id')
            : $currentFiscalYear?->id;
        $fiscalMonthFilter = request()->has('fiscal_month_id')
            ? request('fiscal_month_id')
            : ($hasFiscalYearFilter ? null : $currentFiscalMonth?->id);

        $query = WeeklyBudget::query()->with([
            'branch',
            'department',
            'fiscalYear',
            'fiscalMonth',
            'creator',
        ]);

        // Load all expense items upfront for payment type name resolution
        $expenseItems = ExpenseItem::query()->orderBy('expense_type')->get();

        $query
            ->when(request('request_type'), fn ($q, $v) => $q->where('request_type', $v))
            ->when(request('status_finance'), fn ($q, $v) => $q->where('status_finance', $v))
            ->when(request('status_department'), fn ($q, $v) => $q->where('status_department', $v))
            ->when(request('status_ceo'), fn ($q, $v) => $q->where('status_ceo', $v))
            ->when(request('branch_id'), fn ($q, $v) => $q->where('branch_id', $v))
            ->when(request('department_id'), fn ($q, $v) => $q->where('department_id', $v))
            ->when($fiscalYearFilter && $fiscalYearFilter !== 'all', fn ($q) => $q->where('fiscal_year_id', $fiscalYearFilter))
            ->when($fiscalMonthFilter && $fiscalMonthFilter !== 'all', fn ($q) => $q->where('fiscal_month_id', $fiscalMonthFilter))
            ->when(request('week_start_date'), fn ($q, $v) => $q->where('week_start_date', $v))
            ->when(request('payment_category_id'), fn ($q, $v) => $q->where('payment_category_id', $v))
            ->when(request('payment_type_id'), fn ($q, $v) => $q->where('payment_type_id', $v));

        $items = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (WeeklyBudget $wb) => [
                'id'             => $wb->id,
                'branch_id'      => $wb->branch_id,
                'department_id'  => $wb->department_id,
                'fiscal_year_id' => $wb->fiscal_year_id,
                'fiscal_month_id' => $wb->fiscal_month_id,
                'branch'         => $wb->branch?->name,
                'department'     => $wb->department?->name,
                'fiscal_year'    => $wb->fiscalYear?->name,
                'fiscal_month'   => $wb->fiscalMonth?->name,
                'week_number'    => $wb->week_number,
                'week_start_date' => $wb->week_start_date?->toDateString(),
                'week_end_date'   => $wb->week_end_date?->toDateString(),
                'request_type'   => $wb->request_type?->value,
                'status_finance' => $wb->status_finance?->value,
                'status_department' => $wb->status_department?->value,
                'status_ceo'     => $wb->status_ceo?->value,
                'amount'         => $wb->amount,
                'description'    => $wb->description,
                'note'           => $wb->note,
                'payment_category_id' => $wb->payment_category_id,
                'payment_type_id' => $wb->payment_type_id,
                'payment_category' => $wb->payment_category_id === 1 ? 'Expense' : ($wb->payment_category_id === 2 ? 'Cost of Sales' : null),
                'payment_type' => $expenseItems->firstWhere('expense_parent_acc_code', $wb->payment_type_id)?->expense_type,
            ]);



        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->where('is_active_on_weekly_budget', 1)
            ->orderBy('name')
            ->get(['id', 'name']);

        $paymentCategories = [
            ['id' => 1, 'name' => 'Expense'],
            ['id' => 2, 'name' => 'Cost of Sales'],
        ];

        // Map expenses to payment types: category_id 1 = Expense (is_expense=true), 2 = Cost of Sales (is_expense=false)
        $paymentTypes = $expenseItems->map(fn ($e) => [
            'id'                  => $e->expense_parent_acc_code,
            'name'                => $e->expense_type,
            'payment_category_id' => $e->is_expense ? 1 : 2,
        ])->values()->toArray();

        $filters = request()->only([
            'request_type',
            'status_finance',
            'status_department',
            'status_ceo',
            'branch_id',
            'department_id',
            'fiscal_year_id',
            'fiscal_month_id',
            'week_start_date',
            'payment_category_id',
            'payment_type_id',
        ]);

        if (! request()->has('fiscal_year_id') && $currentFiscalYear) {
            $filters['fiscal_year_id'] = (string) $currentFiscalYear->id;
        }
        if (! request()->has('fiscal_month_id') && ! $hasFiscalYearFilter && $currentFiscalMonth) {
            $filters['fiscal_month_id'] = (string) $currentFiscalMonth->id;
        }

        return Inertia::render('Budget/WeeklyBudget/Finance', [
            'items'       => $items,
            'branches'    => $branches,
            'departments' => $departments,
            'paymentCategories' => $paymentCategories,
            'paymentTypes' => $paymentTypes,
            'fiscalYears' => $this->fiscalYearOptions(),
            'fiscalMonths' => $this->fiscalMonthOptions(),
            'requestTypes'  => array_column(WeeklyBudgetRequestType::cases(), 'value'),
            'statusFinances' => array_column(WeeklyBudgetStatusFinance::cases(), 'value'),
            'statusDepartments' => array_column(WeeklyBudgetStatusDepartment::cases(), 'value'),
            'statusCeos'    => array_column(WeeklyBudgetStatusCeo::cases(), 'value'),
            'today'         => $today,
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
            'request'     => $filters,
        ]);
    }

    public function updateFinance(Request $request, WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage finance budgets'), 403);

        $validated = $request->validate([
            'status_finance' => ['required', Rule::enum(WeeklyBudgetStatusFinance::class)],
            'payment_category_id' => [
                Rule::requiredIf(fn () => $request->input('status_finance') === WeeklyBudgetStatusFinance::Paid->value),
                'nullable', 'integer'
            ],
            'payment_type_id' => [
                Rule::requiredIf(fn () => $request->input('status_finance') === WeeklyBudgetStatusFinance::Paid->value),
                'nullable', 'integer'
            ],
            'request_type' => ['nullable', Rule::enum(WeeklyBudgetRequestType::class)],
            'amount'       => ['nullable', 'numeric', 'min:0'],
            'description'  => ['nullable', 'string'],
        ]);

        if ($validated['status_finance'] === WeeklyBudgetStatusFinance::Paid->value) {
            if ($weeklyBudget->status_ceo !== WeeklyBudgetStatusCeo::Approved) {
                return back()->withErrors(['status_finance' => 'Cannot change Finance Status to Paid because CEO Status is not Approved.']);
            }
        }

        if ($weeklyBudget->status_ceo === WeeklyBudgetStatusCeo::Approved) {
            if (in_array($validated['status_finance'], [WeeklyBudgetStatusFinance::OnHold->value, WeeklyBudgetStatusFinance::Pending->value])) {
                return back()->withErrors(['status_finance' => 'Cannot change Finance Status to "On Hold" or "Pending" if CEO Status is Approved.']);
            }
        }

        if ($weeklyBudget->status_department !== WeeklyBudgetStatusDepartment::Approved) {
            return back()->withErrors(['status_finance' => 'Finance Status change only allowed if Department Status is Approved.']);
        }

        $currentFinanceStatus = $weeklyBudget->status_finance->value;
        $newFinanceStatus = $validated['status_finance'];

        if ($currentFinanceStatus === WeeklyBudgetStatusFinance::Paid->value && $newFinanceStatus !== $currentFinanceStatus) {
            if (! auth()->user()->can('override_paid_status')) {
                return back()->withErrors(['status_finance' => 'Cannot revert Paid status.']);
            }
            if ($newFinanceStatus !== WeeklyBudgetStatusFinance::Approved->value) {
                return back()->withErrors(['status_finance' => 'Paid status can only be reverted to Approved.']);
            }
        }

        $updateData = [
            'status_finance' => $validated['status_finance'],
            'payment_category_id' => array_key_exists('payment_category_id', $validated) ? $validated['payment_category_id'] : $weeklyBudget->payment_category_id,
            'payment_type_id' => array_key_exists('payment_type_id', $validated) ? $validated['payment_type_id'] : $weeklyBudget->payment_type_id,
        ];

        // Finance can edit request_type, amount, and description before CEO approval
        if ($weeklyBudget->status_ceo !== WeeklyBudgetStatusCeo::Approved) {
            if (!empty($validated['request_type'])) {
                $updateData['request_type'] = $validated['request_type'];
            }
            if (isset($validated['amount'])) {
                $updateData['amount'] = $validated['amount'];
            }
            if (array_key_exists('description', $validated)) {
                $updateData['description'] = $validated['description'];
            }
        }

        $oldValues = $this->activityLogger->attributes($weeklyBudget);
        $weeklyBudget->update($updateData);
        $action = ($oldValues['status_finance'] ?? null) === $validated['status_finance']
            ? WeeklyBudgetActivityLog::ACTION_REQUEST_UPDATED
            : WeeklyBudgetActivityLog::ACTION_FINANCE_STATUS_UPDATED;
        $this->activityLogger->logChanges(
            $weeklyBudget,
            $oldValues,
            $action,
            'finance review',
        );

        return back()->with('message', 'Finance status updated successfully.');
    }

    public function bulkUpdateFinance(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage finance budgets'), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:weekly_budgets,id'],
            'status_finance' => ['required', Rule::enum(WeeklyBudgetStatusFinance::class)],
        ]);

        if ($validated['status_finance'] === WeeklyBudgetStatusFinance::Paid->value) {
             return back()->withErrors(['status_finance' => 'Bulk update to Paid is not allowed because payment category/type is required.']);
        }

        $budgets = WeeklyBudget::whereIn('id', $validated['ids'])->get();

        foreach ($budgets as $budget) {
            if ($budget->status_department !== WeeklyBudgetStatusDepartment::Approved) {
                continue;
            }
            if ($budget->status_ceo === WeeklyBudgetStatusCeo::Approved && in_array($validated['status_finance'], [WeeklyBudgetStatusFinance::OnHold->value, WeeklyBudgetStatusFinance::Pending->value])) {
                continue;
            }
            if ($budget->status_finance === WeeklyBudgetStatusFinance::Paid) {
                continue;
            }

            $oldValues = $this->activityLogger->attributes($budget);
            $budget->update(['status_finance' => $validated['status_finance']]);
            $this->activityLogger->logChanges(
                $budget,
                $oldValues,
                WeeklyBudgetActivityLog::ACTION_FINANCE_STATUS_UPDATED,
                'finance status',
                meta: ['bulk' => true],
            );
        }

        return back()->with('message', 'Selected budgets updated successfully.');
    }

    public function overridePaid(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->can('override_paid_status'), 403);

        $validated = $request->validate([
            'id' => ['required', 'exists:weekly_budgets,id'],
            'status_finance' => ['required', Rule::enum(WeeklyBudgetStatusFinance::class)],
        ]);

        $budget = WeeklyBudget::findOrFail($validated['id']);

        if ($budget->status_finance !== WeeklyBudgetStatusFinance::Paid) {
            return back()->withErrors(['status_finance' => 'Override is only allowed for Paid finance status.']);
        }

        if ($validated['status_finance'] !== WeeklyBudgetStatusFinance::Approved->value) {
            return back()->withErrors(['status_finance' => 'Paid status can only be reverted to Approved.']);
        }

        $oldValues = $this->activityLogger->attributes($budget);
        $budget->update([
            'status_finance' => $validated['status_finance'],
        ]);
        $this->activityLogger->logChanges(
            $budget,
            $oldValues,
            WeeklyBudgetActivityLog::ACTION_PAID_STATUS_OVERRIDDEN,
            'paid status override',
        );

        return back()->with('message', 'Paid status overridden successfully.');
    }

    // ─────────────────────────────────────────────
    // Department View
    // ─────────────────────────────────────────────

    public function departmentView(): Response
    {
        abort_unless(auth()->user()->can('view department budgets'), 403);

        [$today, $currentFiscalYear, $currentFiscalMonth] = $this->currentFiscalPeriod();
        $hasFiscalYearFilter = request()->has('fiscal_year_id');
        $fiscalYearFilter = $hasFiscalYearFilter
            ? request('fiscal_year_id')
            : $currentFiscalYear?->id;
        $fiscalMonthFilter = request()->has('fiscal_month_id')
            ? request('fiscal_month_id')
            : ($hasFiscalYearFilter ? null : $currentFiscalMonth?->id);

        $expenseItems = ExpenseItem::query()->orderBy('expense_type')->get();

        $query = WeeklyBudget::query()->with([
            'branch',
            'department',
            'fiscalYear',
            'fiscalMonth',
        ]);

        $query
            ->when(request('request_type'),     fn ($q, $v) => $q->where('request_type', $v))
            ->when(request('status_finance'),   fn ($q, $v) => $q->where('status_finance', $v))
            ->when(request('status_department'),fn ($q, $v) => $q->where('status_department', $v))
            ->when(request('status_ceo'),       fn ($q, $v) => $q->where('status_ceo', $v))
            ->when(request('branch_id'),        fn ($q, $v) => $q->where('branch_id', $v))
            ->when(request('department_id'),    fn ($q, $v) => $q->where('department_id', $v))
            ->when($fiscalYearFilter && $fiscalYearFilter !== 'all', fn ($q) => $q->where('fiscal_year_id', $fiscalYearFilter))
            ->when($fiscalMonthFilter && $fiscalMonthFilter !== 'all', fn ($q) => $q->where('fiscal_month_id', $fiscalMonthFilter))
            ->when(request('week_start_date'),  fn ($q, $v) => $q->where('week_start_date', $v))
            ->when(request('payment_category_id'), fn ($q, $v) => $q->where('payment_category_id', $v))
            ->when(request('payment_type_id'),  fn ($q, $v) => $q->where('payment_type_id', $v));

        $items = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (WeeklyBudget $wb) => [
                'id'               => $wb->id,
                'branch_id'        => $wb->branch_id,
                'department_id'    => $wb->department_id,
                'fiscal_year_id'   => $wb->fiscal_year_id,
                'fiscal_month_id'  => $wb->fiscal_month_id,
                'branch'           => $wb->branch?->name,
                'department'       => $wb->department?->name,
                'fiscal_year'      => $wb->fiscalYear?->name,
                'fiscal_month'     => $wb->fiscalMonth?->name,
                'week_number'      => $wb->week_number,
                'week_start_date'  => $wb->week_start_date?->toDateString(),
                'week_end_date'    => $wb->week_end_date?->toDateString(),
                'request_type'     => $wb->request_type?->value,
                'status_finance'   => $wb->status_finance?->value,
                'status_department'=> $wb->status_department?->value,
                'status_ceo'       => $wb->status_ceo?->value,
                'amount'           => $wb->amount,
                'description'      => $wb->description,
                'note'             => $wb->note,
                'payment_category_id' => $wb->payment_category_id,
                'payment_type_id'  => $wb->payment_type_id,
                'payment_category' => $wb->payment_category_id === 1 ? 'Expense' : ($wb->payment_category_id === 2 ? 'Cost of Sales' : null),
                'payment_type'     => $expenseItems->firstWhere('expense_parent_acc_code', $wb->payment_type_id)?->expense_type,
                // submission timestamp — used by the frontend to compute the edit-window deadline
                'submitted_at'     => $wb->created_at?->toDateString(),
            ]);

        $branches = Branch::query()->orderBy('name')->get(['id', 'name', 'branch_code']);
        $departments = Department::query()->where('is_active', true)->where('is_active_on_weekly_budget', 1)->orderBy('name')->get(['id', 'name']);

        $paymentCategories = [
            ['id' => 1, 'name' => 'Expense'],
            ['id' => 2, 'name' => 'Cost of Sales'],
        ];

        $paymentTypes = $expenseItems->map(fn ($e) => [
            'id'                  => $e->expense_parent_acc_code,
            'name'                => $e->expense_type,
            'payment_category_id' => $e->is_expense ? 1 : 2,
        ])->values()->toArray();

        $filters = request()->only([
            'request_type', 'status_finance', 'status_department', 'status_ceo',
            'branch_id', 'department_id', 'fiscal_year_id', 'fiscal_month_id',
            'week_start_date', 'payment_category_id', 'payment_type_id',
        ]);

        if (! request()->has('fiscal_year_id') && $currentFiscalYear) {
            $filters['fiscal_year_id'] = (string) $currentFiscalYear->id;
        }
        if (! request()->has('fiscal_month_id') && ! $hasFiscalYearFilter && $currentFiscalMonth) {
            $filters['fiscal_month_id'] = (string) $currentFiscalMonth->id;
        }

        return Inertia::render('Budget/WeeklyBudget/DepartmentView', [
            'items'             => $items,
            'branches'          => $branches,
            'departments'       => $departments,
            'paymentCategories' => $paymentCategories,
            'paymentTypes'      => $paymentTypes,
            'fiscalYears'       => $this->fiscalYearOptions(),
            'fiscalMonths'      => $this->fiscalMonthOptions(),
            'requestTypes'      => array_column(WeeklyBudgetRequestType::cases(), 'value'),
            'statusFinances'    => array_column(WeeklyBudgetStatusFinance::cases(), 'value'),
            'statusDepartments' => array_column(WeeklyBudgetStatusDepartment::cases(), 'value'),
            'statusCeos'        => array_column(WeeklyBudgetStatusCeo::cases(), 'value'),
            'today'             => $today,
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
            'request'           => $filters,
        ]);
    }

    public function updateDepartment(Request $request, WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage department budgets'), 403);

        $validated = $request->validate([
            'status_department' => ['required', Rule::enum(WeeklyBudgetStatusDepartment::class)],
            'note'              => ['nullable', 'string', 'max:1000'],
            'payment_category_id' => ['nullable', 'integer'],
            'payment_type_id'   => ['nullable', 'integer'],
            'request_type'      => ['nullable', Rule::enum(WeeklyBudgetRequestType::class)],
            'amount'            => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($weeklyBudget->isDepartmentStatusLocked()) {
            return back()->withErrors(['status_department' => 'Editing is locked because Finance Status is Paid or CEO Status is Approved.']);
        }

        $withinEditWindow = $weeklyBudget->isWithinDepartmentEditWindow();

        $amountChanging = array_key_exists('amount', $validated)
            && (string) $validated['amount'] !== (string) $weeklyBudget->amount;
        $requestTypeChanging = ! empty($validated['request_type'])
            && $validated['request_type'] !== $weeklyBudget->request_type?->value;
        $paymentCategoryChanging = array_key_exists('payment_category_id', $validated)
            && (int) ($validated['payment_category_id'] ?? 0) !== (int) $weeklyBudget->payment_category_id;
        $paymentTypeChanging = array_key_exists('payment_type_id', $validated)
            && (int) ($validated['payment_type_id'] ?? 0) !== (int) $weeklyBudget->payment_type_id;

        if (! $withinEditWindow && ($amountChanging || $requestTypeChanging || $paymentCategoryChanging || $paymentTypeChanging)) {
            return back()->withErrors(['edit' => 'Submission data can only be edited until Friday EOD of the submission week.']);
        }

        // Downgrade note: approved → pending requires a reason
        if (
            $weeklyBudget->status_department === WeeklyBudgetStatusDepartment::Approved &&
            $validated['status_department'] === WeeklyBudgetStatusDepartment::Pending->value
        ) {
            if (empty($validated['note'])) {
                return back()->withErrors(['note' => 'A reason is required when downgrading from Approved to Pending.']);
            }
        }

        $updateData = [
            'status_department' => $validated['status_department'],
            'note'              => array_key_exists('note', $validated) ? $validated['note'] : $weeklyBudget->note,
        ];

        if ($withinEditWindow) {
            if (array_key_exists('payment_category_id', $validated)) {
                $updateData['payment_category_id'] = $validated['payment_category_id'];
            }
            if (array_key_exists('payment_type_id', $validated)) {
                $updateData['payment_type_id'] = $validated['payment_type_id'];
            }
            if (! empty($validated['request_type'])) {
                $updateData['request_type'] = $validated['request_type'];
            }
            if (array_key_exists('amount', $validated)) {
                $updateData['amount'] = $validated['amount'];
            }
        }

        $oldValues = $this->activityLogger->attributes($weeklyBudget);
        $weeklyBudget->update($updateData);
        $action = ($oldValues['status_department'] ?? null) === $validated['status_department']
            ? WeeklyBudgetActivityLog::ACTION_REQUEST_UPDATED
            : WeeklyBudgetActivityLog::ACTION_DEPARTMENT_STATUS_UPDATED;
        $this->activityLogger->logChanges(
            $weeklyBudget,
            $oldValues,
            $action,
            'department review',
        );

        return back()->with('message', 'Department status updated successfully.');
    }

    public function bulkUpdateDepartment(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage department budgets'), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:weekly_budgets,id'],
            'status_department' => ['required', Rule::enum(WeeklyBudgetStatusDepartment::class)],
        ]);

        $budgets = WeeklyBudget::whereIn('id', $validated['ids'])->get();
        $updatedCount = 0;
        $skippedCount = 0;

        foreach ($budgets as $budget) {
            $requiresDowngradeNote =
                $budget->status_department === WeeklyBudgetStatusDepartment::Approved
                && $validated['status_department'] === WeeklyBudgetStatusDepartment::Pending->value;

            if ($budget->isDepartmentStatusLocked() || $requiresDowngradeNote) {
                $skippedCount++;
                continue;
            }

            $oldValues = $this->activityLogger->attributes($budget);
            $budget->update([
                'status_department' => $validated['status_department'],
            ]);
            $this->activityLogger->logChanges(
                $budget,
                $oldValues,
                WeeklyBudgetActivityLog::ACTION_DEPARTMENT_STATUS_UPDATED,
                'department status',
                meta: ['bulk' => true],
            );
            $updatedCount++;
        }

        $message = "{$updatedCount} selected budget(s) updated successfully.";

        if ($skippedCount > 0) {
            $message .= " {$skippedCount} locked or note-required budget(s) were skipped.";
        }

        return back()->with('message', $message);
    }

    public function departmentDelete(WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage department budgets'), 403);

        if ($weeklyBudget->isDepartmentStatusLocked()) {
            return back()->withErrors(['delete' => 'Deleting is locked because Finance Status is Paid or CEO Status is Approved.']);
        }

        if (! $weeklyBudget->isWithinDepartmentEditWindow()) {
            return back()->withErrors(['delete' => 'This entry can no longer be deleted — the edit window (Friday EOD of submission week) has passed.']);
        }

        $this->activityLogger->logDeleted($weeklyBudget);
        $weeklyBudget->delete();

        return back()->with('message', 'Weekly budget entry deleted successfully.');
    }

    // ─────────────────────────────────────────────
    // CEO View
    // ─────────────────────────────────────────────

    public function ceoView(): Response
    {
        abort_unless(auth()->user()->can('view ceo budgets'), 403);

        [$today, $currentFiscalYear, $currentFiscalMonth] = $this->currentFiscalPeriod();
        $hasFiscalYearFilter = request()->has('fiscal_year_id');
        $fiscalYearFilter = $hasFiscalYearFilter
            ? request('fiscal_year_id')
            : $currentFiscalYear?->id;
        $fiscalMonthFilter = request()->has('fiscal_month_id')
            ? request('fiscal_month_id')
            : ($hasFiscalYearFilter ? null : $currentFiscalMonth?->id);

        $query = WeeklyBudget::query()->with([
            'branch',
            'department',
            'fiscalYear',
            'fiscalMonth',
        ]);

        // Permanently filter to where both are approved
        $query->where('status_finance', WeeklyBudgetStatusFinance::Approved->value)
              ->where('status_department', WeeklyBudgetStatusDepartment::Approved->value);

        $query
            ->when(request('request_type'), fn ($q, $v) => $q->where('request_type', $v))
            ->when(request('status_ceo'), fn ($q, $v) => $q->where('status_ceo', $v))
            ->when(request('branch_id'), fn ($q, $v) => $q->where('branch_id', $v))
            ->when(request('department_id'), fn ($q, $v) => $q->where('department_id', $v))
            ->when($fiscalYearFilter && $fiscalYearFilter !== 'all', fn ($q) => $q->where('fiscal_year_id', $fiscalYearFilter))
            ->when($fiscalMonthFilter && $fiscalMonthFilter !== 'all', fn ($q) => $q->where('fiscal_month_id', $fiscalMonthFilter))
            ->when(request('week_start_date'), fn ($q, $v) => $q->where('week_start_date', $v))
            ->when(request('payment_category_id'), fn ($q, $v) => $q->where('payment_category_id', $v))
            ->when(request('payment_type_id'), fn ($q, $v) => $q->where('payment_type_id', $v));

        $items = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (WeeklyBudget $wb) => [
                'id'               => $wb->id,
                'branch_id'        => $wb->branch_id,
                'fiscal_year_id'   => $wb->fiscal_year_id,
                'fiscal_month_id'  => $wb->fiscal_month_id,
                'branch'           => $wb->branch?->name,
                'department'       => $wb->department?->name,
                'fiscal_year'      => $wb->fiscalYear?->name,
                'fiscal_month'     => $wb->fiscalMonth?->name,
                'week_number'      => $wb->week_number,
                'week_start_date'  => $wb->week_start_date?->toDateString(),
                'week_end_date'    => $wb->week_end_date?->toDateString(),
                'request_type'     => $wb->request_type?->value,
                'status_finance'   => $wb->status_finance?->value,
                'status_department'=> $wb->status_department?->value,
                'status_ceo'       => $wb->status_ceo?->value,
                'amount'           => $wb->amount,
                'description'      => $wb->description,
                'note'             => $wb->note,
                'payment_category_id' => $wb->payment_category_id,
                'payment_type_id'  => $wb->payment_type_id,
            ]);

        $expenseItems = ExpenseItem::query()->orderBy('expense_type')->get();
        $paymentCategories = [
            ['id' => 1, 'name' => 'Expense'],
            ['id' => 2, 'name' => 'Cost of Sales'],
        ];
        $paymentTypes = $expenseItems->map(fn ($expenseItem) => [
            'id' => $expenseItem->expense_parent_acc_code,
            'name' => $expenseItem->expense_type,
            'payment_category_id' => $expenseItem->is_expense ? 1 : 2,
        ])->values()->toArray();

        $filters = request()->only([
            'request_type',
            'status_ceo',
            'branch_id',
            'department_id',
            'fiscal_year_id',
            'fiscal_month_id',
            'week_start_date',
            'payment_category_id',
            'payment_type_id',
        ]);

        if (! request()->has('fiscal_year_id') && $currentFiscalYear) {
            $filters['fiscal_year_id'] = (string) $currentFiscalYear->id;
        }
        if (! request()->has('fiscal_month_id') && ! $hasFiscalYearFilter && $currentFiscalMonth) {
            $filters['fiscal_month_id'] = (string) $currentFiscalMonth->id;
        }

        return Inertia::render('Budget/WeeklyBudget/CeoView', [
            'items'             => $items,
            'branches'          => Branch::query()->orderBy('name')->get(['id', 'name', 'branch_code']),
            'departments'       => Department::query()
                ->where('is_active', true)
                ->where('is_active_on_weekly_budget', 1)
                ->orderBy('name')
                ->get(['id', 'name']),
            'paymentCategories' => $paymentCategories,
            'paymentTypes'      => $paymentTypes,
            'fiscalYears'       => $this->fiscalYearOptions(),
            'fiscalMonths'      => $this->fiscalMonthOptions(),
            'requestTypes'      => array_column(WeeklyBudgetRequestType::cases(), 'value'),
            'statusCeos'        => array_column(WeeklyBudgetStatusCeo::cases(), 'value'),
            'today'             => $today,
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
            'request'           => $filters,
        ]);
    }

    public function updateCeo(Request $request, WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage ceo budgets'), 403);

        $validated = $request->validate([
            'status_ceo' => ['required', Rule::enum(WeeklyBudgetStatusCeo::class)],
        ]);

        if ($weeklyBudget->status_finance === WeeklyBudgetStatusFinance::Paid) {
            return back()->withErrors(['status_ceo' => 'CEO Status cannot be changed once Finance Status is Paid.']);
        }

        if ($validated['status_ceo'] === WeeklyBudgetStatusCeo::Approved->value) {
            if ($weeklyBudget->status_finance !== WeeklyBudgetStatusFinance::Approved || 
                $weeklyBudget->status_department !== WeeklyBudgetStatusDepartment::Approved) {
                return back()->withErrors(['status_ceo' => 'Can only change to Approved if both Finance and Department Status are Approved.']);
            }
        }

        $oldValues = $this->activityLogger->attributes($weeklyBudget);
        $weeklyBudget->update([
            'status_ceo' => $validated['status_ceo'],
        ]);
        $this->activityLogger->logChanges(
            $weeklyBudget,
            $oldValues,
            WeeklyBudgetActivityLog::ACTION_CEO_STATUS_UPDATED,
            'CEO status',
        );

        return back()->with('message', 'CEO status updated successfully.');
    }

    public function bulkUpdateCeo(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage ceo budgets'), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:weekly_budgets,id'],
            'status_ceo' => ['required', Rule::enum(WeeklyBudgetStatusCeo::class)],
        ]);

        $budgets = WeeklyBudget::whereIn('id', $validated['ids'])->get();

        foreach ($budgets as $budget) {
            if ($budget->status_finance === WeeklyBudgetStatusFinance::Paid) {
                continue;
            }

            if ($validated['status_ceo'] === WeeklyBudgetStatusCeo::Approved->value) {
                if (
                    $budget->status_finance !== WeeklyBudgetStatusFinance::Approved ||
                    $budget->status_department !== WeeklyBudgetStatusDepartment::Approved
                ) {
                    continue;
                }
            }

            $oldValues = $this->activityLogger->attributes($budget);
            $budget->update(['status_ceo' => $validated['status_ceo']]);
            $this->activityLogger->logChanges(
                $budget,
                $oldValues,
                WeeklyBudgetActivityLog::ACTION_CEO_STATUS_UPDATED,
                'CEO status',
                meta: ['bulk' => true],
            );
        }

        return back()->with('message', 'Selected budgets updated successfully.');
    }

}

