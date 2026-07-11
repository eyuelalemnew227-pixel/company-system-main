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
            'description'    => ['nullable', 'string'],
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
            'description'    => ['nullable', 'string'],
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
}
