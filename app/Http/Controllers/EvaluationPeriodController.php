<?php

namespace App\Http\Controllers;

use App\Models\EvaluationPeriod;
use App\Models\FiscalYear;
use App\Models\FiscalMonth;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EvaluationPeriodController extends Controller
{
    public function index(Request $request)
    {
        $evaluationPeriods = EvaluationPeriod::query()
            ->with(['fiscalYear', 'fiscalMonth'])
            ->when($request->search, function ($query, $search) {
                $query->where('evaluation_period_name', 'like', "%{$search}%")
                      ->orWhereHas('fiscalYear', function ($q) use ($search) {
                          $q->where('name', 'like', "%{$search}%");
                      })
                      ->orWhereHas('fiscalMonth', function ($q) use ($search) {
                          $q->where('name', 'like', "%{$search}%");
                      });
            })
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('evaluation-periods/index', [
            'evaluationPeriods' => $evaluationPeriods,
            'request' => $request->only('search'),
        ]);
    }

    public function create()
    {
        $fiscalYears = FiscalYear::select('id', 'name')->orderBy('name', 'desc')->get();
        $fiscalMonths = FiscalMonth::select('id', 'name', 'fiscal_year_id')->orderBy('fiscal_year_id', 'desc')->orderBy('efy_month_number')->get();

        return Inertia::render('evaluation-periods/create', [
            'fiscalYears' => $fiscalYears,
            'fiscalMonths' => $fiscalMonths,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'evaluation_period_name' => 'required|string|max:255',
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'fiscal_month_id' => 'required|exists:fiscal_months,id',
            'status' => 'required|in:active,inactive',
        ]);

        EvaluationPeriod::create($validated);

        return redirect()->route('evaluation-periods.index')
            ->with('message', 'Evaluation Period created successfully!');
    }

    public function edit(EvaluationPeriod $evaluationPeriod)
    {
        $fiscalYears = FiscalYear::select('id', 'name')->orderBy('name', 'desc')->get();
        $fiscalMonths = FiscalMonth::select('id', 'name', 'fiscal_year_id')->orderBy('fiscal_year_id', 'desc')->orderBy('efy_month_number')->get();

        return Inertia::render('evaluation-periods/edit', [
            'evaluationPeriod' => $evaluationPeriod->load(['fiscalYear', 'fiscalMonth']),
            'fiscalYears' => $fiscalYears,
            'fiscalMonths' => $fiscalMonths,
        ]);
    }

    public function update(Request $request, EvaluationPeriod $evaluationPeriod)
    {
        $validated = $request->validate([
            'evaluation_period_name' => 'required|string|max:255',
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'fiscal_month_id' => 'required|exists:fiscal_months,id',
            'status' => 'required|in:active,inactive',
        ]);

        $evaluationPeriod->update($validated);

        return redirect()->route('evaluation-periods.index')
            ->with('message', 'Evaluation Period updated successfully!');
    }

    public function destroy(EvaluationPeriod $evaluationPeriod)
    {
        $evaluationPeriod->delete();

        return redirect()->route('evaluation-periods.index')
            ->with('message', 'Evaluation Period deleted successfully!');
    }
}
