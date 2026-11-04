<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Services\ChecklistScoringService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class ChecklistSummaryReportController extends Controller
{
    protected ChecklistScoringService $scoringService;

    public function __construct(ChecklistScoringService $scoringService)
    {
        $this->scoringService = $scoringService;
    }

    public function index(Request $request)
    {
        $fiscalYears = Cache::remember('dashboard_fiscal_years', 3600, function () {
            return FiscalYear::select('id', 'name', 'gregorian_start_date', 'gregorian_end_date')
                ->orderBy('gregorian_start_date', 'desc')
                ->get();
        });

        $fiscalMonths = Cache::remember('dashboard_fiscal_months', 3600, function () {
            return FiscalMonth::select('id', 'fiscal_year_id', 'name', 'gregorian_start_date', 'gregorian_end_date')
                ->orderBy('gregorian_start_date', 'asc')
                ->get();
        });

        $branches = Cache::remember('dashboard_branches', 3600, function () {
            return Branch::where('is_sales_generating', 1)
                ->orWhereNull('is_sales_generating')
                ->select('id', 'name')
                ->orderBy('name')
                ->get();
        });

        // Determine current fiscal month and year
        $now = now();
        $currentMonth = $fiscalMonths->first(function ($m) use ($now) {
            return $m->gregorian_start_date && $m->gregorian_end_date
                && $now->between(Carbon::parse($m->gregorian_start_date), Carbon::parse($m->gregorian_end_date));
        });

        $currentYear = $fiscalYears->first(function ($y) use ($now) {
            return $y->gregorian_start_date && $y->gregorian_end_date
                && $now->between(Carbon::parse($y->gregorian_start_date), Carbon::parse($y->gregorian_end_date));
        });

        // Filters with smart defaults: default to current month if not explicitly specified and no custom date range
        $hasCustomDate = $request->filled('start_date') || $request->filled('end_date');
        $defaultYear = $hasCustomDate ? 'all' : ($currentYear ? (string) $currentYear->id : 'all');
        $defaultMonth = $hasCustomDate ? 'all' : ($currentMonth ? (string) $currentMonth->id : 'all');

        $filters = [
            'fiscal_year_id' => $request->input('fiscal_year_id', $defaultYear),
            'fiscal_month_id' => $request->input('fiscal_month_id', $defaultMonth),
            'branch_id' => $request->input('branch_id', 'all'),
            'completion_status' => $request->input('completion_status', 'all'),
            'search' => $request->input('search', ''),
            'start_date' => $request->input('start_date', ''),
            'end_date' => $request->input('end_date', ''),
        ];

        $ver = Cache::get('checklist_summary_ver', 1);
        $cacheKey = "checklist_summary_v{$ver}_" . md5(json_encode($filters));

        $summaryData = Cache::remember($cacheKey, 300, function () use ($filters) {
            return $this->scoringService->getEmployeeChecklistSummary($filters);
        });

        return Inertia::render('reports/checklist-summary', [
            'summaryRows' => $summaryData['rows'],
            'summaryMetrics' => $summaryData['metrics'],
            'filters' => $filters,
            'branches' => $branches,
            'fiscalYears' => $fiscalYears,
            'fiscalMonths' => $fiscalMonths,
            'currentFiscalYearId' => $currentYear?->id,
            'currentFiscalMonthId' => $currentMonth?->id,
        ]);
    }

    public function export(Request $request)
    {
        $filters = [
            'fiscal_year_id' => $request->input('fiscal_year_id', 'all'),
            'fiscal_month_id' => $request->input('fiscal_month_id', 'all'),
            'branch_id' => $request->input('branch_id', 'all'),
            'completion_status' => $request->input('completion_status', 'all'),
            'search' => $request->input('search', ''),
            'start_date' => $request->input('start_date', ''),
            'end_date' => $request->input('end_date', ''),
        ];

        $ver = Cache::get('checklist_summary_ver', 1);
        $cacheKey = "checklist_summary_v{$ver}_" . md5(json_encode($filters));

        $summaryData = Cache::remember($cacheKey, 300, function () use ($filters) {
            return $this->scoringService->getEmployeeChecklistSummary($filters);
        });
        $rows = $summaryData['rows'];

        $timestamp = date('Y_m_d_His');
        $filename = "Employee_Checklist_Summary_{$timestamp}.csv";

        return response()->stream(function () use ($rows) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF"); // UTF-8 BOM
            fputcsv($file, [
                'Branch',
                'Employee Name',
                'Employee Code',
                'Score Type 1 (%)',
                'Score Type 2 (%)',
                'Average Score (%)',
                'Type 1 Evaluations Count',
                'Type 2 Evaluations Count',
            ]);

            foreach ($rows as $row) {
                fputcsv($file, [
                    $row['branch'],
                    $row['employee_name'],
                    $row['employee_code'] ?? '—',
                    $row['score_type_1'] !== null ? $row['score_type_1'] . '%' : '—',
                    $row['score_type_2'] !== null ? $row['score_type_2'] . '%' : '—',
                    $row['avg_score'] !== null ? $row['avg_score'] . '%' : '—',
                    $row['type_1_count'],
                    $row['type_2_count'],
                ]);
            }

            fclose($file);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }
}
