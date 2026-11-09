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
        @ini_set('memory_limit', '512M');

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

        $departments = Cache::remember('dashboard_departments', 3600, function () {
            return \App\Models\Department::select('id', 'name')
                ->orderBy('name')
                ->get();
        });

        // Determine current fiscal month and year
        $now = now();
        $currentMonth = $fiscalMonths->first(function ($m) use ($now) {
            return $m->gregorian_start_date && $m->gregorian_end_date
                && $now->between(Carbon::parse($m->gregorian_start_date)->startOfDay(), Carbon::parse($m->gregorian_end_date)->endOfDay());
        });

        $currentYear = $fiscalYears->first(function ($y) use ($now) {
            return $y->gregorian_start_date && $y->gregorian_end_date
                && $now->between(Carbon::parse($y->gregorian_start_date)->startOfDay(), Carbon::parse($y->gregorian_end_date)->endOfDay());
        });

        // Filters with smart defaults: default to current month if not explicitly specified and no custom date range
        $hasCustomDate = $request->filled('start_date') || $request->filled('end_date');
        $defaultYear = $hasCustomDate ? 'all' : ($currentYear ? (string) $currentYear->id : 'all');
        $defaultMonth = $hasCustomDate ? 'all' : ($currentMonth ? (string) $currentMonth->id : 'all');

        $filters = [
            'fiscal_year_id' => $request->input('fiscal_year_id', $defaultYear),
            'fiscal_month_id' => $request->input('fiscal_month_id', $defaultMonth),
            'branch_id' => $request->input('branch_id', 'all'),
            'department_id' => $request->input('department_id', 'all'),
            'completion_status' => $request->input('completion_status', 'all'),
            'search' => $request->input('search', ''),
            'start_date' => $request->input('start_date', ''),
            'end_date' => $request->input('end_date', ''),
        ];

        $ver = Cache::get('checklist_summary_ver', 2);
        $cacheKey = "checklist_summary_v{$ver}_" . md5(json_encode($filters));

        $summaryData = Cache::remember($cacheKey, 300, function () use ($filters) {
            return $this->scoringService->getEmployeeChecklistSummary($filters);
        });

        return Inertia::render('reports/checklist-summary', [
            'summaryRows' => $summaryData['rows'],
            'summaryMetrics' => $summaryData['metrics'],
            'filters' => $filters,
            'branches' => $branches,
            'departments' => $departments,
            'fiscalYears' => $fiscalYears,
            'fiscalMonths' => $fiscalMonths,
            'currentFiscalYearId' => $currentYear?->id,
            'currentFiscalMonthId' => $currentMonth?->id,
        ]);
    }

    public function export(Request $request)
    {
        @ini_set('memory_limit', '512M');

        $filters = [
            'fiscal_year_id' => $request->input('fiscal_year_id', 'all'),
            'fiscal_month_id' => $request->input('fiscal_month_id', 'all'),
            'branch_id' => $request->input('branch_id', 'all'),
            'department_id' => $request->input('department_id', 'all'),
            'completion_status' => $request->input('completion_status', 'all'),
            'search' => $request->input('search', ''),
            'start_date' => $request->input('start_date', ''),
            'end_date' => $request->input('end_date', ''),
        ];

        $level = $request->input('level', $request->input('export_type', 'employee'));

        $ver = Cache::get('checklist_summary_ver', 2);
        $cacheKey = "checklist_summary_v{$ver}_" . md5(json_encode($filters));

        $summaryData = Cache::remember($cacheKey, 300, function () use ($filters) {
            return $this->scoringService->getEmployeeChecklistSummary($filters);
        });
        $rows = $summaryData['rows'];

        $timestamp = date('Y_m_d_His');

        if ($level === 'branch') {
            $filename = "Branch_Checklist_Summary_{$timestamp}.csv";
            return $this->exportBranchSummary($rows, $filename);
        }

        if ($level === 'department') {
            $filename = "Department_Checklist_Summary_{$timestamp}.csv";
            return $this->exportDepartmentSummary($rows, $filename);
        }

        if ($level === 'branch_department') {
            $filename = "Branch_Department_Checklist_Summary_{$timestamp}.csv";
            return $this->exportBranchDepartmentSummary($rows, $filename);
        }

        $filename = "Employee_Checklist_Summary_{$timestamp}.csv";
        return $this->exportEmployeeSummary($rows, $filename);
    }

    protected function exportEmployeeSummary(array $rows, string $filename)
    {
        return response()->stream(function () use ($rows) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF"); // UTF-8 BOM
            fputcsv($file, [
                'Branch',
                'Department',
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
                    $row['department'] ?? '—',
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
        }, 200, $this->csvHeaders($filename));
    }

    protected function exportBranchSummary(array $rows, string $filename)
    {
        $branchMap = [];
        foreach ($rows as $row) {
            $branchName = $row['branch'] ?: 'Unassigned';
            $branchMap[$branchName][] = $row;
        }

        $summary = [];
        foreach ($branchMap as $bName => $emps) {
            $summary[] = $this->aggregateGroup($bName, $emps);
        }

        usort($summary, fn($a, $b) => strcmp($a['name'], $b['name']));

        return response()->stream(function () use ($summary) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");
            fputcsv($file, [
                'Branch',
                'Total Employees',
                'Both Completed Count',
                'Completion Rate (%)',
                'Score Type 1 Average (%)',
                'Score Type 2 Average (%)',
                'Overall Average Score (%)',
            ]);

            foreach ($summary as $item) {
                fputcsv($file, [
                    $item['name'],
                    $item['total_employees'],
                    $item['both_completed'],
                    $item['completion_rate'],
                    $item['avg_type_1'],
                    $item['avg_type_2'],
                    $item['overall_avg'],
                ]);
            }

            fclose($file);
        }, 200, $this->csvHeaders($filename));
    }

    protected function exportDepartmentSummary(array $rows, string $filename)
    {
        $deptMap = [];
        foreach ($rows as $row) {
            $deptName = $row['department'] ?: 'Unassigned';
            $deptMap[$deptName][] = $row;
        }

        $summary = [];
        foreach ($deptMap as $dName => $emps) {
            $summary[] = $this->aggregateGroup($dName, $emps);
        }

        usort($summary, fn($a, $b) => strcmp($a['name'], $b['name']));

        return response()->stream(function () use ($summary) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");
            fputcsv($file, [
                'Department',
                'Total Employees',
                'Both Completed Count',
                'Completion Rate (%)',
                'Score Type 1 Average (%)',
                'Score Type 2 Average (%)',
                'Overall Average Score (%)',
            ]);

            foreach ($summary as $item) {
                fputcsv($file, [
                    $item['name'],
                    $item['total_employees'],
                    $item['both_completed'],
                    $item['completion_rate'],
                    $item['avg_type_1'],
                    $item['avg_type_2'],
                    $item['overall_avg'],
                ]);
            }

            fclose($file);
        }, 200, $this->csvHeaders($filename));
    }

    protected function exportBranchDepartmentSummary(array $rows, string $filename)
    {
        $groupMap = [];
        foreach ($rows as $row) {
            $bName = $row['branch'] ?: 'Unassigned';
            $dName = $row['department'] ?: 'Unassigned';
            $key = "{$bName}|||{$dName}";
            $groupMap[$key][] = $row;
        }

        $summary = [];
        foreach ($groupMap as $key => $emps) {
            [$bName, $dName] = explode('|||', $key, 2);
            $agg = $this->aggregateGroup($bName, $emps);
            $agg['department'] = $dName;
            $summary[] = $agg;
        }

        usort($summary, function ($a, $b) {
            $cmp = strcmp($a['name'], $b['name']);
            if ($cmp !== 0) return $cmp;
            return strcmp($a['department'], $b['department']);
        });

        return response()->stream(function () use ($summary) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");
            fputcsv($file, [
                'Branch',
                'Department',
                'Total Employees',
                'Both Completed Count',
                'Completion Rate (%)',
                'Score Type 1 Average (%)',
                'Score Type 2 Average (%)',
                'Overall Average Score (%)',
            ]);

            foreach ($summary as $item) {
                fputcsv($file, [
                    $item['name'],
                    $item['department'],
                    $item['total_employees'],
                    $item['both_completed'],
                    $item['completion_rate'],
                    $item['avg_type_1'],
                    $item['avg_type_2'],
                    $item['overall_avg'],
                ]);
            }

            fclose($file);
        }, 200, $this->csvHeaders($filename));
    }

    protected function aggregateGroup(string $name, array $emps): array
    {
        $total = count($emps);
        $both = 0;
        $t1Sum = 0; $t1Count = 0;
        $t2Sum = 0; $t2Count = 0;
        $avgSum = 0; $avgCount = 0;

        foreach ($emps as $e) {
            if ($e['score_type_1'] !== null && $e['score_type_2'] !== null) {
                $both++;
            }
            if ($e['score_type_1'] !== null) {
                $t1Sum += $e['score_type_1'];
                $t1Count++;
            }
            if ($e['score_type_2'] !== null) {
                $t2Sum += $e['score_type_2'];
                $t2Count++;
            }
            if ($e['avg_score'] !== null) {
                $avgSum += $e['avg_score'];
                $avgCount++;
            }
        }

        $avg1 = $t1Count > 0 ? round($t1Sum / $t1Count, 1) : null;
        $avg2 = $t2Count > 0 ? round($t2Sum / $t2Count, 1) : null;
        $overall = null;
        if ($avg1 !== null && $avg2 !== null) {
            $overall = round(($avg1 + $avg2) / 2, 1);
        } elseif ($avgCount > 0) {
            $overall = round($avgSum / $avgCount, 1);
        }

        return [
            'name' => $name,
            'total_employees' => $total,
            'both_completed' => $both,
            'completion_rate' => $total > 0 ? round(($both / $total) * 100, 1) . '%' : '0%',
            'avg_type_1' => $avg1 !== null ? $avg1 . '%' : '—',
            'avg_type_2' => $avg2 !== null ? $avg2 . '%' : '—',
            'overall_avg' => $overall !== null ? $overall . '%' : '—',
        ];
    }

    protected function csvHeaders(string $filename): array
    {
        return [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];
    }
}
