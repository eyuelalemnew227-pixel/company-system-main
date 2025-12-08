<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Branch;
use App\Models\ChildCategory;
use App\Models\InventoryPeriod;

class InventoryCountSummaryController extends Controller
{
    public function summary(Request $request)
    {
        $branchId = $request->query('branch_id');
        $childCategoryId = $request->query('child_category_id');
        $fiscalYearId = $request->query('fiscal_year_id');
        $periodId = $request->query('period_id');
        
        if ($branchId === 'all' || $branchId === '') {
            $branchId = null;
        }
        if ($childCategoryId === 'all' || $childCategoryId === '') {
            $childCategoryId = null;
        }
        
        $fiscalYears = \App\Models\FiscalYear::select('id', 'name')->orderByDesc('id')->get();
        
        $periods = InventoryPeriod::select('id', 'inventory_period_name', 'fiscal_year_id')
            ->orderByDesc('id')
            ->get();
        
        if (!$periodId && $periods->isNotEmpty()) {
            $periodId = $periods->first()->id;
        }
        
        if (!$fiscalYearId && $periodId && $periods->isNotEmpty()) {
            $selectedPeriod = $periods->firstWhere('id', $periodId);
            if ($selectedPeriod) {
                $fiscalYearId = $selectedPeriod->fiscal_year_id;
            }
        } elseif (!$fiscalYearId && $fiscalYears->isNotEmpty()) {
            $fiscalYearId = $fiscalYears->first()->id;
        }

        $result = $this->computeSummaryData($branchId, $childCategoryId, $fiscalYearId, $periodId);

        return Inertia::render('reports/inventory-count-summary', [
            'data' => $result,
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'childCategories' => ChildCategory::select('id', 'child_name')->orderBy('child_name')->get(),
            'fiscalYears' => $fiscalYears,
            'periods' => $periods,
            'request' => $request->only('branch_id', 'child_category_id', 'fiscal_year_id', 'period_id'),
        ]);
    }

    public function export(Request $request)
    {
        $branchId = $request->query('branch_id');
        $childCategoryId = $request->query('child_category_id');
        $fiscalYearId = $request->query('fiscal_year_id');
        $periodId = $request->query('period_id');
        
        $expandedBranches = $request->query('expanded_branches', '');
        $expandedCategories = $request->query('expanded_categories', '');
        
        if ($branchId === 'all' || $branchId === '') {
            $branchId = null;
        }
        if ($childCategoryId === 'all' || $childCategoryId === '') {
            $childCategoryId = null;
        }
        
        if (!$periodId) {
            $latestPeriod = InventoryPeriod::orderByDesc('id')->first();
            $periodId = $latestPeriod?->id;
        }
        
        if (!$fiscalYearId && $periodId) {
            $selectedPeriod = InventoryPeriod::find($periodId);
            if ($selectedPeriod) {
                $fiscalYearId = $selectedPeriod->fiscal_year_id;
            }
        } elseif (!$fiscalYearId) {
            $latestFiscalYear = \App\Models\FiscalYear::orderByDesc('id')->first();
            $fiscalYearId = $latestFiscalYear?->id;
        }

        $data = $this->computeSummaryData($branchId, $childCategoryId, $fiscalYearId, $periodId);
        
        $expandedBranchIds = $expandedBranches ? array_map('intval', explode(',', $expandedBranches)) : [];
        $expandedCategoryKeys = $expandedCategories ? explode(',', $expandedCategories) : [];

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="inventory-count-summary.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($data, $expandedBranchIds, $expandedCategoryKeys) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }

            fputcsv($out, ['Branch', 'Child Category', 'Product', 'Product Code', 'Count', 'Measurement', 'Adjusted Count', 'Unit Cost', 'Total Cost']);

            foreach ($data as $branch) {
                $isBranchExpanded = in_array($branch['branch_id'], $expandedBranchIds);
                
                if (!$isBranchExpanded) {
                    fputcsv($out, [
                        $branch['branch_name'],
                        '',
                        '',
                        '',
                        '',
                        '',
                        $branch['total_count'],
                        '',
                        $branch['total_cost'],
                    ]);
                    continue;
                }
                
                fputcsv($out, [
                    $branch['branch_name'],
                    '',
                    '',
                    '',
                    '',
                    '',
                    $branch['total_count'],
                    '',
                    $branch['total_cost'],
                ]);
                
                foreach ($branch['categories'] as $category) {
                    $categoryKey = $branch['branch_id'] . '-' . $category['category_id'];
                    $isCategoryExpanded = in_array($categoryKey, $expandedCategoryKeys);
                    
                    if (!$isCategoryExpanded) {
                        fputcsv($out, [
                            '',
                            $category['category_name'],
                            '',
                            '',
                            '',
                            '',
                            $category['total_count'],
                            '',
                            $category['total_cost'],
                        ]);
                        continue;
                    }
                    
                    fputcsv($out, [
                        '',
                        $category['category_name'],
                        '',
                        '',
                        '',
                        '',
                        $category['total_count'],
                        '',
                        $category['total_cost'],
                    ]);
                    
                    foreach ($category['products'] as $product) {
                        fputcsv($out, [
                            '',
                            '',
                            $product['product_name'],
                            $product['product_code'] ?? '',
                            $product['count'],
                            $product['measurement'],
                            $product['adjusted_count'],
                            $product['unit_cost'],
                            $product['total_cost'],
                        ]);
                    }
                }
            }

            fclose($out);
        }, 200, $headers);
    }

    private function computeSummaryData($branchId, $childCategoryId, $fiscalYearId, $periodId)
    {
        $query = DB::table('inventory_counts as ic')
            ->join('branches as b', 'b.id', '=', 'ic.branch_id')
            ->join('child_categories as cc', 'cc.id', '=', 'ic.child_category_id')
            ->join('products as p', 'p.id', '=', 'ic.product_id')
            ->join('inventory_periods as ip', 'ip.id', '=', 'ic.inventory_period_id')
            ->selectRaw('
                b.id as branch_id,
                b.name as branch_name,
                cc.id as child_category_id,
                cc.child_name as category_name,
                p.id as product_id,
                p.product_name,
                p.product_code,
                p.unit_cost,
                p.measurement,
                SUM(ic.count) as total_count
            ')
            ->when($branchId, function ($q) use ($branchId) {
                $q->where('ic.branch_id', $branchId);
            })
            ->when($childCategoryId, function ($q) use ($childCategoryId) {
                $q->where('ic.child_category_id', $childCategoryId);
            })
            ->when($fiscalYearId, function ($q) use ($fiscalYearId) {
                $q->where('ip.fiscal_year_id', $fiscalYearId);
            })
            ->when($periodId, function ($q) use ($periodId) {
                $q->where('ic.inventory_period_id', $periodId);
            })
            ->groupBy('b.id', 'b.name', 'cc.id', 'cc.child_name', 'p.id', 'p.product_name', 'p.product_code', 'p.unit_cost', 'p.measurement')
            ->orderBy('b.name')
            ->orderBy('cc.child_name')
            ->orderBy('p.product_name')
            ->get();

        $structured = [];
        $branchIndex = [];

        foreach ($query as $row) {
            $branchKey = $row->branch_id;
            $categoryKey = $row->child_category_id;
            $productKey = $row->product_id;

            if (!isset($branchIndex[$branchKey])) {
                $branchIndex[$branchKey] = count($structured);
                $structured[] = [
                    'branch_id' => $row->branch_id,
                    'branch_name' => $row->branch_name,
                    'categories' => [],
                    'total_count' => 0,
                    'total_cost' => 0,
                ];
            }

            $branchIdx = $branchIndex[$branchKey];
            $branch = &$structured[$branchIdx];

            $categoryIdx = null;
            foreach ($branch['categories'] as $idx => $cat) {
                if ($cat['category_id'] === $categoryKey) {
                    $categoryIdx = $idx;
                    break;
                }
            }

            if ($categoryIdx === null) {
                $categoryIdx = count($branch['categories']);
                $branch['categories'][] = [
                    'category_id' => $row->child_category_id,
                    'category_name' => $row->category_name,
                    'products' => [],
                    'total_count' => 0,
                    'total_cost' => 0,
                ];
            }

            $category = &$branch['categories'][$categoryIdx];

            $unitCost = $row->unit_cost ? (float) $row->unit_cost : 0;
            $count = (float) $row->total_count;
            $measurement = $row->measurement && $row->measurement > 0 ? (float) $row->measurement : 1;
            $adjustedCount = $count / $measurement;
            $totalCost = $unitCost * $adjustedCount;

            $category['products'][] = [
                'product_id' => $row->product_id,
                'product_name' => $row->product_name,
                'product_code' => $row->product_code,
                'unit_cost' => number_format($unitCost, 2, '.', ''),
                'count' => number_format($count, 2, '.', ''),
                'measurement' => number_format($measurement, 2, '.', ''),
                'adjusted_count' => number_format($adjustedCount, 2, '.', ''),
                'total_cost' => number_format($totalCost, 2, '.', ''),
            ];

            $category['total_count'] += $adjustedCount;
            $category['total_cost'] += $totalCost;
            $branch['total_count'] += $adjustedCount;
            $branch['total_cost'] += $totalCost;
        }

        foreach ($structured as &$branch) {
            $branch['total_count'] = number_format($branch['total_count'], 2, '.', '');
            $branch['total_cost'] = number_format($branch['total_cost'], 2, '.', '');
            foreach ($branch['categories'] as &$category) {
                $category['total_count'] = number_format($category['total_count'], 2, '.', '');
                $category['total_cost'] = number_format($category['total_cost'], 2, '.', '');
            }
        }

        return $structured;
    }
}
