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

        $ver = Cache::get('checklist_summary_ver', 3);
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

        $ver = Cache::get('checklist_summary_ver', 3);
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
                'Form Type 1 - Inspector (%)',
                'Form Type 1 - QA Inspection (%)',
                'Form Type 2 - Inspector (%)',
                'Form Type 2 - QA Inspection (%)',
                'Inspector Avg (%)',
                'QA Inspection Avg (%)',
                'Combined Avg (%)',
                'Status',
                'Type 1 (Inspector) Count',
                'Type 1 (QA) Count',
                'Type 2 (Inspector) Count',
                'Type 2 (QA) Count',
            ]);

            foreach ($rows as $row) {
                $status = ($row['score_type_1'] !== null && $row['score_type_2'] !== null) ? 'Complete' : 'Partial';
                fputcsv($file, [
                    $row['branch'],
                    $row['department'] ?? '—',
                    $row['employee_name'],
                    $row['employee_code'] ?? '—',
                    $row['score_type_1_inspector'] !== null ? $row['score_type_1_inspector'] . '%' : '—',
                    $row['score_type_1_qa'] !== null ? $row['score_type_1_qa'] . '%' : '—',
                    $row['score_type_2_inspector'] !== null ? $row['score_type_2_inspector'] . '%' : '—',
                    $row['score_type_2_qa'] !== null ? $row['score_type_2_qa'] . '%' : '—',
                    $row['avg_inspector'] !== null ? $row['avg_inspector'] . '%' : '—',
                    $row['avg_qa'] !== null ? $row['avg_qa'] . '%' : '—',
                    $row['avg_score'] !== null ? $row['avg_score'] . '%' : '—',
                    $status,
                    $row['type_1_inspector_count'] ?? 0,
                    $row['type_1_qa_count'] ?? 0,
                    $row['type_2_inspector_count'] ?? 0,
                    $row['type_2_qa_count'] ?? 0,
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
                'Form 1 - Inspector (%)',
                'Form 1 - QA (%)',
                'Form 2 - Inspector (%)',
                'Form 2 - QA (%)',
                'Inspector Overall Avg (%)',
                'QA Overall Avg (%)',
                'Combined Avg (%)',
            ]);

            foreach ($summary as $item) {
                fputcsv($file, [
                    $item['name'],
                    $item['total_employees'],
                    $item['both_completed'],
                    $item['completion_rate'],
                    $item['avg_type_1_inspector'],
                    $item['avg_type_1_qa'],
                    $item['avg_type_2_inspector'],
                    $item['avg_type_2_qa'],
                    $item['overall_avg_inspector'],
                    $item['overall_avg_qa'],
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
                'Form 1 - Inspector (%)',
                'Form 1 - QA (%)',
                'Form 2 - Inspector (%)',
                'Form 2 - QA (%)',
                'Inspector Overall Avg (%)',
                'QA Overall Avg (%)',
                'Combined Avg (%)',
            ]);

            foreach ($summary as $item) {
                fputcsv($file, [
                    $item['name'],
                    $item['total_employees'],
                    $item['both_completed'],
                    $item['completion_rate'],
                    $item['avg_type_1_inspector'],
                    $item['avg_type_1_qa'],
                    $item['avg_type_2_inspector'],
                    $item['avg_type_2_qa'],
                    $item['overall_avg_inspector'],
                    $item['overall_avg_qa'],
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
                'Form 1 - Inspector (%)',
                'Form 1 - QA (%)',
                'Form 2 - Inspector (%)',
                'Form 2 - QA (%)',
                'Inspector Overall Avg (%)',
                'QA Overall Avg (%)',
                'Combined Avg (%)',
            ]);

            foreach ($summary as $item) {
                fputcsv($file, [
                    $item['name'],
                    $item['department'],
                    $item['total_employees'],
                    $item['both_completed'],
                    $item['completion_rate'],
                    $item['avg_type_1_inspector'],
                    $item['avg_type_1_qa'],
                    $item['avg_type_2_inspector'],
                    $item['avg_type_2_qa'],
                    $item['overall_avg_inspector'],
                    $item['overall_avg_qa'],
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

        $t1InspSum = 0; $t1InspCount = 0;
        $t1QaSum = 0; $t1QaCount = 0;
        $t2InspSum = 0; $t2InspCount = 0;
        $t2QaSum = 0; $t2QaCount = 0;
        $avgInspSum = 0; $avgInspCount = 0;
        $avgQaSum = 0; $avgQaCount = 0;

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

            if (($e['score_type_1_inspector'] ?? null) !== null) {
                $t1InspSum += $e['score_type_1_inspector'];
                $t1InspCount++;
            }
            if (($e['score_type_1_qa'] ?? null) !== null) {
                $t1QaSum += $e['score_type_1_qa'];
                $t1QaCount++;
            }
            if (($e['score_type_2_inspector'] ?? null) !== null) {
                $t2InspSum += $e['score_type_2_inspector'];
                $t2InspCount++;
            }
            if (($e['score_type_2_qa'] ?? null) !== null) {
                $t2QaSum += $e['score_type_2_qa'];
                $t2QaCount++;
            }
            if (($e['avg_inspector'] ?? null) !== null) {
                $avgInspSum += $e['avg_inspector'];
                $avgInspCount++;
            }
            if (($e['avg_qa'] ?? null) !== null) {
                $avgQaSum += $e['avg_qa'];
                $avgQaCount++;
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

        $avg1Insp = $t1InspCount > 0 ? round($t1InspSum / $t1InspCount, 1) : null;
        $avg1Qa = $t1QaCount > 0 ? round($t1QaSum / $t1QaCount, 1) : null;
        $avg2Insp = $t2InspCount > 0 ? round($t2InspSum / $t2InspCount, 1) : null;
        $avg2Qa = $t2QaCount > 0 ? round($t2QaSum / $t2QaCount, 1) : null;
        $overallInsp = $avgInspCount > 0 ? round($avgInspSum / $avgInspCount, 1) : null;
        $overallQa = $avgQaCount > 0 ? round($avgQaSum / $avgQaCount, 1) : null;

        return [
            'name' => $name,
            'total_employees' => $total,
            'both_completed' => $both,
            'completion_rate' => $total > 0 ? round(($both / $total) * 100, 1) . '%' : '0%',
            'avg_type_1' => $avg1 !== null ? $avg1 . '%' : '—',
            'avg_type_2' => $avg2 !== null ? $avg2 . '%' : '—',
            'overall_avg' => $overall !== null ? $overall . '%' : '—',
            'avg_type_1_inspector' => $avg1Insp !== null ? $avg1Insp . '%' : '—',
            'avg_type_1_qa' => $avg1Qa !== null ? $avg1Qa . '%' : '—',
            'avg_type_2_inspector' => $avg2Insp !== null ? $avg2Insp . '%' : '—',
            'avg_type_2_qa' => $avg2Qa !== null ? $avg2Qa . '%' : '—',
            'overall_avg_inspector' => $overallInsp !== null ? $overallInsp . '%' : '—',
            'overall_avg_qa' => $overallQa !== null ? $overallQa . '%' : '—',
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
