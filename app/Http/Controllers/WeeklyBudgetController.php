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
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WeeklyBudgetController extends Controller
{
    public function index(): Response
    {
        abort_unless(auth()->user()->can('view weekly budgets'), 403);

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
            ->when(request('fiscal_year_id'), fn ($q, $v) => $q->where('fiscal_year_id', $v))
            ->when(request('fiscal_month_id'), fn ($q, $v) => $q->where('fiscal_month_id', $v))
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
            ]);

        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code']);

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $today = now()->toDateString();
        $currentFiscalYear = FiscalYear::query()
            ->where('gregorian_start_date', '<=', $today)
            ->where('gregorian_end_date', '>=', $today)
            ->first();

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
            'request'     => request()->only([
                'request_type',
                'status_finance',
                'status_department',
                'status_ceo',
                'branch_id',
                'department_id',
                'fiscal_year_id',
                'fiscal_month_id',
                'week_start_date',
            ]),
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

        WeeklyBudget::create([
            ...$validated,
            'status_finance'    => WeeklyBudgetStatusFinance::Pending->value,
            'status_department' => WeeklyBudgetStatusDepartment::Pending->value,
            'status_ceo'        => WeeklyBudgetStatusCeo::Pending->value,
            'created_by'        => auth()->id(),
        ]);

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

        $weeklyBudget->update($validated);

        return redirect()
            ->route('weekly-budget.index')
            ->with('message', 'Weekly budget updated successfully.');
    }

    public function destroy(WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage weekly budgets'), 403);

        $weeklyBudget->delete();

        return redirect()
            ->route('weekly-budget.index')
            ->with('message', 'Weekly budget deleted successfully.');
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
            ->when(request('fiscal_year_id'), fn ($q, $v) => $q->where('fiscal_year_id', $v))
            ->when(request('fiscal_month_id'), fn ($q, $v) => $q->where('fiscal_month_id', $v))
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

        $today = now()->toDateString();
        $currentFiscalYear = FiscalYear::query()
            ->where('gregorian_start_date', '<=', $today)
            ->where('gregorian_end_date', '>=', $today)
            ->first();

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
            'request'     => request()->only([
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
            ]),
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

        if ($weeklyBudget->status_finance === WeeklyBudgetStatusFinance::Paid && !auth()->user()->can('override_paid_status')) {
            return back()->withErrors(['status_finance' => 'Cannot revert Paid status.']);
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

        $weeklyBudget->update($updateData);

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

            $budget->update(['status_finance' => $validated['status_finance']]);
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
        $budget->update([
            'status_finance' => $validated['status_finance'],
        ]);

        return back()->with('message', 'Paid status overridden successfully.');
    }

    // ─────────────────────────────────────────────
    // Department View
    // ─────────────────────────────────────────────

    public function departmentView(): Response
    {
        abort_unless(auth()->user()->can('view department budgets'), 403);

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
            ->when(request('fiscal_year_id'),   fn ($q, $v) => $q->where('fiscal_year_id', $v))
            ->when(request('fiscal_month_id'),  fn ($q, $v) => $q->where('fiscal_month_id', $v))
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
        $departments = Department::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        $paymentCategories = [
            ['id' => 1, 'name' => 'Expense'],
            ['id' => 2, 'name' => 'Cost of Sales'],
        ];

        $paymentTypes = $expenseItems->map(fn ($e) => [
            'id'                  => $e->expense_parent_acc_code,
            'name'                => $e->expense_type,
            'payment_category_id' => $e->is_expense ? 1 : 2,
        ])->values()->toArray();

        $today = now()->toDateString();
        $currentFiscalYear = FiscalYear::query()
            ->where('gregorian_start_date', '<=', $today)
            ->where('gregorian_end_date', '>=', $today)
            ->first();

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
            'request'           => request()->only([
                'request_type', 'status_finance', 'status_department', 'status_ceo',
                'branch_id', 'department_id', 'fiscal_year_id', 'fiscal_month_id',
                'week_start_date', 'payment_category_id', 'payment_type_id',
            ]),
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

        // Lock: Finance paid or CEO approved
        if (
            $weeklyBudget->status_finance === WeeklyBudgetStatusFinance::Paid ||
            $weeklyBudget->status_ceo === WeeklyBudgetStatusCeo::Approved
        ) {
            return back()->withErrors(['status_department' => 'Department Status is locked because Finance Status is Paid or CEO Status is Approved.']);
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

        // Build update payload — always update status and note
        $updateData = [
            'status_department'   => $validated['status_department'],
            'note'                => array_key_exists('note', $validated) ? $validated['note'] : $weeklyBudget->note,
            'payment_category_id' => array_key_exists('payment_category_id', $validated)
                ? $validated['payment_category_id']
                : $weeklyBudget->payment_category_id,
            'payment_type_id'     => array_key_exists('payment_type_id', $validated)
                ? $validated['payment_type_id']
                : $weeklyBudget->payment_type_id,
        ];

        // request_type and amount are only updated within the edit window (Friday EOD of submission week)
        $submittedAt = $weeklyBudget->created_at;
        $dayOfWeek   = (int) $submittedAt->format('N');
        $daysToFriday = (5 - $dayOfWeek + 7) % 7;
        $fridayEod   = $submittedAt->copy()->addDays($daysToFriday)->endOfDay();

        if (now()->lte($fridayEod)) {
            if (!empty($validated['request_type'])) {
                $updateData['request_type'] = $validated['request_type'];
            }
            if (isset($validated['amount'])) {
                $updateData['amount'] = $validated['amount'];
            }
        }

        $weeklyBudget->update($updateData);

        return back()->with('message', 'Department status updated successfully.');
    }

    public function departmentDelete(WeeklyBudget $weeklyBudget): RedirectResponse
    {
        abort_unless(auth()->user()->can('manage department budgets'), 403);

        // Server-side edit-window check: only deletable until Friday EOD of submission week
        $submittedAt = $weeklyBudget->created_at;
        $dayOfWeek = (int) $submittedAt->format('N'); // 1=Mon … 7=Sun
        $daysToFriday = (5 - $dayOfWeek + 7) % 7;
        $fridayEod = $submittedAt->copy()->addDays($daysToFriday)->endOfDay();

        if (now()->gt($fridayEod)) {
            return back()->withErrors(['delete' => 'This entry can no longer be deleted — the edit window (Friday EOD of submission week) has passed.']);
        }

        $weeklyBudget->delete();

        return back()->with('message', 'Weekly budget entry deleted successfully.');
    }

    // ─────────────────────────────────────────────
    // CEO View
    // ─────────────────────────────────────────────

    public function ceoView(): Response
    {
        abort_unless(auth()->user()->can('view ceo budgets'), 403);

        $query = WeeklyBudget::query()->with([
            'branch',
            'department',
        ]);

        // Permanently filter to where both are approved
        $query->where('status_finance', WeeklyBudgetStatusFinance::Approved->value)
              ->where('status_department', WeeklyBudgetStatusDepartment::Approved->value);

        $query->when(request('status_ceo'), fn ($q, $v) => $q->where('status_ceo', $v));

        $items = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (WeeklyBudget $wb) => [
                'id'               => $wb->id,
                'branch'           => $wb->branch?->name,
                'department'       => $wb->department?->name,
                'request_type'     => $wb->request_type?->value,
                'status_finance'   => $wb->status_finance?->value,
                'status_department'=> $wb->status_department?->value,
                'status_ceo'       => $wb->status_ceo?->value,
                'amount'           => $wb->amount,
                'description'      => $wb->description,
                'note'             => $wb->note,
            ]);

        return Inertia::render('Budget/WeeklyBudget/CeoView', [
            'items'             => $items,
            'statusCeos'        => array_column(WeeklyBudgetStatusCeo::cases(), 'value'),
            'request'           => request()->only(['status_ceo']),
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

        $weeklyBudget->update([
            'status_ceo' => $validated['status_ceo'],
        ]);

        return back()->with('message', 'CEO status updated successfully.');
    }
}

