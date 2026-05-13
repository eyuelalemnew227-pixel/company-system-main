<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CollectionDay;
use App\Models\OrderType;
use App\Models\PreOrder;
use App\Models\PreOrderItem;
use App\Models\PreOrderProduct;
use App\Models\PreOrderTarget;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PreOrderDashboardController extends Controller
{
    /**
     * Display the pre-order dashboard
     */
    public function index(Request $request): Response
    {
        // Check permission
        if (!auth()->user()->can('view pre-orders')) {
            abort(403, 'You do not have permission to view pre-orders.');
        }

        // Fetch filter options
        $holidays = \App\Models\Holiday::orderByDesc('created_at')->get(['id', 'name', 'date']);
        $latestHoliday = $holidays->first();

        // Get filters from request
        $filters = [
            'date' => $request->query('date'),
            'branch_id' => $request->query('branch_id'),
            'product_id' => $request->query('product_id'),
            'collection_day_id' => $request->query('collection_day_id'),
            'holiday_id' => $request->query('holiday_id', $latestHoliday ? (string) $latestHoliday->id : 'all'),
            'order_type_id' => $request->query('order_type_id'),
        ];


        // Base query
        $query = PreOrder::with([
            'collectionBranch:id,name',
            'collectionDay:id,name',
            'orderType:id,name',
            'items.product',
            'creator:id,name'
        ]);

        // Get dashboard data
        $dashboardData = $this->getDashboardData($filters);



        // Fetch filter options
        // Fetch dynamic filter options based on active filters (excluding self)

        // Branches: Filter by all except branch_id
        $branchesQuery = Branch::whereHas('preOrders', function ($q) use ($filters) {
            $this->applyFilters($q, array_diff_key($filters, ['branch_id' => '']));
        })->orderBy('name')->get(['id', 'name']);

        // Collection Days: Filter by all except collection_day_id
        $collectionDaysQuery = CollectionDay::whereHas('preOrders', function ($q) use ($filters) {
            $this->applyFilters($q, array_diff_key($filters, ['collection_day_id' => '']));
        })->orderBy('name')->get(['id', 'name']);

        // Order Types: Filter by all except order_type_id
        $orderTypesQuery = OrderType::whereHas('preOrders', function ($q) use ($filters) {
            $this->applyFilters($q, array_diff_key($filters, ['order_type_id' => '']));
        })->orderBy('name')->get(['id', 'name']);

        // Products: Filter by all except product_id
        $productsQuery = PreOrderProduct::whereHas('preOrderItems.preOrder', function ($q) use ($filters) {
            $this->applyFilters($q, array_diff_key($filters, ['product_id' => '']));
        })->orderBy('product_name')->get(['id', 'product_name']);

        // Statuses: Get statuses present in current filtered data (excluding status filter)
        $statusQuery = PreOrder::query();
        $this->applyFilters($statusQuery, array_diff_key($filters, ['status' => '']));
        $statuses = $statusQuery->select('status')->distinct()->pluck('status');


        $selectedHoliday = $holidays->firstWhere('id', $filters['holiday_id']);

        return Inertia::render('pre-orders/dashboard', [
            'dashboard' => $dashboardData,
            'filters' => $filters,
            'options' => [
                'branches' => $branchesQuery,
                'collectionDays' => $collectionDaysQuery,
                'orderTypes' => $orderTypesQuery,
                'products' => $productsQuery,
                'statuses' => $statuses,
                'holidays' => $holidays,
            ],
            'targetKpi' => $this->getTargetKpiData($filters),
            'selectedHolidayName' => $selectedHoliday?->name,
        ]);


    }

    /**
     * Get comprehensive dashboard data
     */
    public function getDashboardData($filters): array
    {
        // 1. Main query - respects all filters (used for Funnel and Hourly trends)
        $query = PreOrder::query();
        $this->applyFilters($query, $filters);

        // 2. Sales query - respects all filters EXCEPT status (permanently Paid/Collected)
        $salesFilters = $filters;
        $salesFilters['status'] = ['Paid', 'Collected'];
        $salesQuery = PreOrder::query();
        $this->applyFilters($salesQuery, $salesFilters);

        // KPI Summary (All status, then converted)
        $summary = $this->getSummaryStats($query->clone());

        // Summary table data (All statuses as requested)
        $summaryData = $this->getSummaryTableData($query->clone());



        // Chart Data (Sales only)
        $charts = [
            'orderType' => $this->getOrdersByOrderType($salesQuery->clone()),
            'product' => $this->getTopProducts($salesQuery->clone()),
            'collectionDay' => $this->getOrdersByCollectionDay($salesQuery->clone()),
        ];

        return [
            'summary' => $summary,
            'summaryData' => $summaryData,
            'charts' => $charts,
            'funnel' => $this->getFunnelData($query->clone()), // Funnel shows the leads (all status)
            'orderingTime' => $this->getOrderingTimeData($query->clone()),
            'matrix' => $this->getMatrixData($salesQuery->clone()),
            'productTrend' => $this->getProductTrendData($filters),
            'branchMatrix' => $this->getProductBranchMatrixData($salesQuery->clone()),
            'operatorPerformance' => $this->getOperatorPerformanceData($query->clone()),
            'breakEvenAnalysis' => $this->getBreakEvenData($filters),
            'productByOrderType' => $this->getProductByOrderTypeData($salesQuery->clone()),
            'productByChannel' => $this->getProductByChannelData($salesQuery->clone()),
        ];
    }
    /**
     * Apply filters to the query
     */
    private function applyFilters($query, array $filters): void
    {
        if (!empty($filters['date'])) {
            $query->whereDate('pre_orders.created_at', $filters['date']);
        }


        if (!empty($filters['branch_id'])) {
            $query->where('pre_orders.collection_branch_id', $filters['branch_id']);
        }

        if (!empty($filters['product_id'])) {
            $query->whereHas('items', function ($q) use ($filters) {
                $q->where('pre_order_product_id', $filters['product_id']);
            });
        }

        if (!empty($filters['collection_day_id'])) {
            $query->where('pre_orders.collection_day_id', $filters['collection_day_id']);
        }

        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $query->whereIn('pre_orders.status', $filters['status']);
            } else {
                $query->where('pre_orders.status', $filters['status']);
            }
        }


        if (!empty($filters['order_type_id'])) {
            $query->where('pre_orders.order_type_id', $filters['order_type_id']);
        }

        if (!empty($filters['holiday_id']) && $filters['holiday_id'] !== 'all') {
            $query->where('pre_orders.holiday_id', $filters['holiday_id']);
        }

    }

    /**
     * Get summary statistics
     */
    private function getSummaryStats($query): array
    {
        $stats = $query->join('pre_order_items', 'pre_orders.id', '=', 'pre_order_items.pre_order_id')
            ->selectRaw("
                COUNT(DISTINCT phone_number) as total_leads,
                SUM(pre_order_items.quantity) as total_products,
                SUM(CASE WHEN pre_orders.status IN ('Paid', 'Collected') THEN pre_order_items.quantity ELSE 0 END) as paid_products,
                COUNT(DISTINCT pre_orders.id) as total_order_count,
                SUM(CASE WHEN pre_orders.status IN ('Paid', 'Collected') THEN pre_order_items.quantity * pre_order_items.unit_price ELSE 0 END) as total_revenue,
                COUNT(DISTINCT CASE WHEN pre_orders.status IN ('Paid', 'Collected') THEN phone_number END) as paid_leads,
                COUNT(DISTINCT CASE WHEN pre_orders.status IN ('Paid', 'Collected') THEN pre_orders.id END) as paid_orders_count,
                COUNT(DISTINCT CASE WHEN pre_orders.status = 'Collected' THEN pre_orders.id END) as collected_orders_count
            ")->first();

        $totalLeads = (int) $stats->total_leads;
        $totalProducts = (int) $stats->total_products;
        $paidLeads = (int) $stats->paid_leads;
        $unpaidOnlyLeads = $totalLeads - $paidLeads; // Mutually exclusive: everyone who didn't buy
        $paidOrdersCount = (int) $stats->paid_orders_count;
        $collectedOrdersCount = (int) $stats->collected_orders_count;

        return [
            'total_leads' => $totalLeads,
            'total_orders' => $totalProducts, // This is sum of products
            'paid_products' => (int) $stats->paid_products,
            'total_revenue' => (float) $stats->total_revenue,
            'conversion_rate' => $totalLeads > 0 ? round(($paidLeads / $totalLeads) * 100, 2) : 0,
            'cancellation_rate' => $totalLeads > 0 ? round(($unpaidOnlyLeads / $totalLeads) * 100, 2) : 0,
            'collection_rate' => $paidOrdersCount > 0 ? round(($collectedOrdersCount / $paidOrdersCount) * 100, 2) : 0,
        ];
    }


    /**
     * Get orders by branch (for matrix table)
     */
    private function getOrdersByBranch($query): array
    {
        // Get all orders by branch first
        $ordersByBranch = $query->selectRaw("
            collection_branch_id,
            COUNT(*) as total_orders,
            SUM(total_amount) as total_revenue,
            COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_orders,
            COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
            COUNT(CASE WHEN status = 'Collected' THEN 1 END) as collected_orders
        ")
            ->groupBy('collection_branch_id')
            ->orderByDesc('total_orders')
            ->get()
            ->keyBy('collection_branch_id'); // Key by branch_id for easy lookup

        // Get all available branches
        $allBranches = Branch::orderBy('name')->get(['id', 'name']);

        $result = $allBranches->map(function ($branch) use ($ordersByBranch) {
            $branchOrders = $ordersByBranch->get($branch->id);

            return [
                'branch' => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                ],
                'metrics' => [
                    'total_orders' => (int) ($branchOrders->total_orders ?? 0),
                    'total_revenue' => (float) ($branchOrders->total_revenue ?? 0),
                    'paid_orders' => (int) ($branchOrders->paid_orders ?? 0),
                    'pending_orders' => (int) ($branchOrders->pending_orders ?? 0),
                    'collected_orders' => (int) ($branchOrders->collected_orders ?? 0),
                ],
            ];
        })->toArray();

        // Add unassigned orders if any exist
        if (isset($ordersByBranch[null]) || isset($ordersByBranch[0])) {
            $unassignedOrders = $ordersByBranch->get(null) ?? $ordersByBranch->get(0);
            $result[] = [
                'branch' => [
                    'id' => 0,
                    'name' => 'Unassigned',
                ],
                'metrics' => [
                    'total_orders' => (int) ($unassignedOrders->total_orders ?? 0),
                    'total_revenue' => (float) ($unassignedOrders->total_revenue ?? 0),
                    'paid_orders' => (int) ($unassignedOrders->paid_orders ?? 0),
                    'pending_orders' => (int) ($unassignedOrders->pending_orders ?? 0),
                    'collected_orders' => (int) ($unassignedOrders->collected_orders ?? 0),
                ],
            ];
        }

        // Sort by total orders descending
        usort($result, function ($a, $b) {
            return $b['metrics']['total_orders'] - $a['metrics']['total_orders'];
        });

        return $result;
    }

    /**
     * Get orders by product (for matrix table)
     */
    private function getOrdersByProduct($query): array
    {
        $orders = DB::table('pre_order_items')
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->join('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->selectRaw("
                pre_order_products.id as product_id,
                pre_order_products.product_name,
                COUNT(DISTINCT pre_orders.id) as total_orders,
                SUM(pre_order_items.quantity) as total_quantity,
                SUM(pre_order_items.subtotal) as total_revenue,
                AVG(pre_order_items.quantity) as avg_quantity_per_order
            ")
            ->whereIn('pre_orders.id', $query->select('pre_orders.id'))
            ->groupBy('pre_order_products.id', 'pre_order_products.product_name')
            ->orderByDesc('total_revenue')
            ->limit(20) // Limit to top 20 products
            ->get();

        return $orders->map(function ($product) {
            return [
                'product' => [
                    'id' => $product->product_id,
                    'name' => $product->product_name,
                ],
                'metrics' => [
                    'total_orders' => (int) $product->total_orders,
                    'total_quantity' => (int) $product->total_quantity,
                    'total_revenue' => (float) $product->total_revenue,
                    'avg_quantity_per_order' => (float) $product->avg_quantity_per_order,
                ],
            ];
        })->toArray();
    }

    /**
     * Get orders by collection day (for matrix table)
     */
    private function getOrdersByCollectionDay($query): array
    {
        $orders = $query->join('collection_days', 'pre_orders.collection_day_id', '=', 'collection_days.id')
            ->selectRaw("
                pre_orders.collection_day_id,
                collection_days.name as collection_day_name,
                COUNT(*) as total_orders,
                SUM(pre_orders.total_amount) as total_revenue,
                AVG(pre_orders.total_amount) as avg_order_value,
                COUNT(CASE WHEN pre_orders.status = 'Paid' THEN 1 END) as paid_orders,
                COUNT(CASE WHEN pre_orders.status = 'Pending' THEN 1 END) as pending_orders
            ")
            ->groupBy('pre_orders.collection_day_id', 'collection_days.name', 'collection_days.display_order')
            ->orderByDesc('collection_days.display_order')
            ->get();

        return $orders->map(function ($day) {
            return [
                'collection_day' => [
                    'id' => $day->collection_day_id,
                    'name' => $day->collection_day_name,
                ],
                'metrics' => [
                    'total_orders' => (int) $day->total_orders,
                    'total_revenue' => (float) $day->total_revenue,
                    'avg_order_value' => (float) $day->avg_order_value,
                    'paid_orders' => (int) $day->paid_orders,
                    'pending_orders' => (int) $day->pending_orders,
                ],
            ];
        })->toArray();
    }

    /**
     * Get daily trends
     */
    private function getDailyTrends($query): array
    {
        $trends = $query->selectRaw("
            DATE(created_at) as date,
            COUNT(*) as total_orders,
            SUM(total_amount) as total_revenue,
            COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_orders
        ")
            ->groupBy('date')
            ->orderBy('date')
            ->limit(30) // Last 30 days
            ->get();

        return $trends->map(function ($trend) {
            return [
                'date' => $trend->date,
                'total_orders' => (int) $trend->total_orders,
                'total_revenue' => (float) $trend->total_revenue,
                'paid_orders' => (int) $trend->paid_orders,
            ];
        })->toArray();
    }

    /**
     * Get top selling products
     */
    private function getTopProducts($query): array
    {
        $topProducts = DB::table('pre_order_items')
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->join('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->selectRaw("
                pre_order_products.product_name,
                SUM(pre_order_items.quantity) as total_quantity,
                SUM(pre_order_items.subtotal) as total_revenue,
                COUNT(DISTINCT pre_orders.id) as order_count
            ")
            ->whereIn('pre_orders.id', $query->select('pre_orders.id'))
            ->groupBy('pre_order_products.id', 'pre_order_products.product_name')
            ->orderByDesc('total_quantity')
            ->limit(10)
            ->get();

        return $topProducts->map(function ($product) {
            return [
                'product_name' => $product->product_name,
                'total_quantity' => (int) $product->total_quantity,
                'total_revenue' => (float) $product->total_revenue,
                'order_count' => (int) $product->order_count,
            ];
        })->toArray();
    }

    /**
     * Get status distribution
     */
    private function getStatusDistribution($query): array
    {
        $distribution = $query->selectRaw("
            status,
            COUNT(*) as count,
            SUM(total_amount) as total_amount
        ")
            ->groupBy('status')
            ->orderByDesc('count')
            ->get();

        return $distribution->map(function ($status) {
            return [
                'status' => $status->status,
                'count' => (int) $status->count,
                'total_amount' => (float) $status->total_amount,
            ];
        })->toArray();
    }

    /**
     * Get summary table data with grouped by collection branch
     */
    private function getSummaryTableData($baseQuery): array
    {
        // 1. Get the unique orders count FIRST (e.g. 261 or 223)
        $totalUniqueOrders = (int) $baseQuery->clone()->count();

        // 2. Build the query starting from pre_order_items to ensure we count EVERY line item (345)
        // We filter items by the parent orders that match the current dashboard filters
        $query = DB::table('pre_order_items')
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->leftJoin('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->leftJoin('branches', 'pre_orders.collection_branch_id', '=', 'branches.id')
            ->leftJoin('collection_days', 'pre_orders.collection_day_id', '=', 'collection_days.id')
            ->whereIn('pre_order_items.pre_order_id', $baseQuery->clone()->select('pre_orders.id'))
            ->whereIn('pre_orders.status', ['Paid', 'Collected'])
            ->selectRaw("
                pre_orders.collection_branch_id,
                COALESCE(branches.name, 'Unassigned') as branch_name,
                pre_orders.collection_day_id,
                COALESCE(collection_days.name, 'Not Set') as collection_day_name,
                COALESCE(pre_order_products.product_name, 'Unknown Product') as product_name,
                SUM(pre_order_items.quantity) as total_quantity,
                SUM(pre_order_items.subtotal) as total_amount,
                COUNT(*) as total_orders
            ");

        $branchData = $query->groupBy(
            'pre_orders.collection_branch_id',
            'branches.name',
            'pre_orders.collection_day_id',
            'collection_days.name',
            'pre_order_products.product_name'
        )
            ->orderBy('branches.name')
            ->orderBy('collection_days.name')
            ->orderBy('pre_order_products.product_name')
            ->orderByDesc(DB::raw('SUM(pre_order_items.subtotal)'))
            ->get();



        $summaryData = [];

        foreach ($branchData as $branch) {
            $summaryData[] = [
                'collectionBranch' => $branch->branch_name,
                'collectionDay' => $branch->collection_day_name ?: 'Not Set',
                'product' => $branch->product_name ?: 'Unknown Product',
                'totalQuantity' => (int) $branch->total_quantity,
                'totalAmount' => (float) $branch->total_amount,
                'totalOrders' => (int) $branch->total_orders,
            ];
        }

        return [
            'items' => $summaryData,
            'totalUniqueOrders' => $totalUniqueOrders
        ];
    }


    /**
     * Get orders by order type
     */
    private function getOrdersByOrderType($query): array
    {
        $orders = $query->selectRaw("
            order_type_id,
            COUNT(*) as count
        ")
            ->with('orderType:id,name')
            ->groupBy('order_type_id')
            ->get();

        return $orders->map(function ($type) {
            return [
                'name' => $type->orderType->name ?? 'Unknown',
                'value' => (int) $type->count,
            ];
        })->toArray();
    }

    /**
     * Get data for funnel chart
     */
    private function getFunnelData($query): array
    {
        $stats = $query->selectRaw("
            COUNT(DISTINCT phone_number) as leads,
            COUNT(DISTINCT CASE WHEN status IN ('Paid', 'Collected') THEN phone_number END) as paid,
            COUNT(DISTINCT CASE WHEN status = 'Collected' THEN phone_number END) as collected
        ")->first();

        return [
            ['name' => 'Total leads', 'value' => (int) $stats->leads, 'fill' => '#60A5FA'], // blue-400
            ['name' => 'Paid', 'value' => (int) $stats->paid, 'fill' => '#34D399'], // emerald-400
            ['name' => 'Collected', 'value' => (int) $stats->collected, 'fill' => '#A78BFA'], // violet-400
        ];
    }

    /**
     * Get hourly ordering time data
     */
    private function getOrderingTimeData($query): array
    {
        $hourly = $query->selectRaw("HOUR(created_at) as hour, COUNT(*) as count")
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        $dataMap = $hourly->pluck('count', 'hour')->toArray();
        $result = [];

        for ($i = 0; $i < 24; $i++) {
            $hourLabel = $i < 12 ? ($i == 0 ? '12 AM' : $i . ' AM') : ($i == 12 ? '12 PM' : ($i - 12) . ' PM');
            $result[] = [
                'hour' => $hourLabel,
                'count' => $dataMap[$i] ?? 0
            ];
        }
        return $result;
    }

    /**
     * Get matrix data (Product vs Collection Day)
     */
    private function getMatrixData($query): array
    {
        $data = DB::table('pre_order_items')
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->join('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->join('collection_days', 'pre_orders.collection_day_id', '=', 'collection_days.id')
            ->selectRaw("
                pre_order_products.product_name,
                collection_days.name as collection_day_name,
                collection_days.display_order,
                SUM(pre_order_items.quantity) as total_quantity
            ")
            ->whereIn('pre_orders.id', $query->select('pre_orders.id'))
            ->whereIn('pre_orders.status', ['Paid', 'Collected'])
            ->groupBy('pre_order_products.product_name', 'collection_days.name', 'collection_days.display_order')
            ->orderBy('collection_days.display_order')
            ->get();


        $products = $data->pluck('product_name')->unique()->values();
        $days = $data->pluck('collection_day_name')->unique()->values();

        $matrix = [];
        foreach ($products as $product) {
            $row = ['name' => $product];
            foreach ($days as $day) {
                // Find matching value or default to 0
                $val = 0;
                foreach ($data as $item) {
                    if ($item->product_name === $product && $item->collection_day_name === $day) {
                        $val = (int) $item->total_quantity;
                        break;
                    }
                }
                $row[$day] = $val;
            }
            $matrix[] = $row;
        }


        return [
            'columns' => $days,
            'rows' => $matrix
        ];
    }
    /**
     * Get product trend data (Grouped Column Chart)
     */
    private function getProductTrendData($filters): array
    {
        // 1. Build base query with filters (ignore date-specific filters only)
        $trendFilters = $filters;
        unset($trendFilters['date']);

        $baseQuery = PreOrder::query();
        $this->applyFilters($baseQuery, $trendFilters);

        // 2. Identify the latest 7 dates with activity
        $activeDates = (clone $baseQuery)
            ->selectRaw('DATE(created_at) as order_date')
            ->groupBy('order_date')
            ->orderByDesc('order_date')
            ->limit(7)
            ->pluck('order_date')
            ->sort()
            ->values();

        if ($activeDates->isEmpty()) {
            return ['products' => [], 'data' => []];
        }

        $startDate = $activeDates->first();
        $endDate = $activeDates->last();

        // 3. Get Top 5 Products for this period
        $topProducts = PreOrderItem::query()
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->join('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->whereIn('pre_orders.id', (clone $baseQuery)->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()])->select('id'))
            ->selectRaw('pre_order_products.product_name, SUM(pre_order_items.quantity) as total')
            ->groupBy('pre_order_products.id', 'pre_order_products.product_name')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('product_name')
            ->toArray();

        // 4. Get Daily Data
        $data = PreOrderItem::query()
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->join('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->whereIn('pre_orders.id', (clone $baseQuery)->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()])->select('id'))
            ->whereIn('pre_order_products.product_name', $topProducts)
            ->selectRaw("
                DATE(pre_orders.created_at) as order_date,
                pre_order_products.product_name,
                SUM(pre_order_items.quantity) as total_quantity
            ")
            ->groupBy('order_date', 'pre_order_products.product_name')
            ->get();

        // 5. Format for Recharts
        $result = [];
        foreach ($activeDates as $dateString) {
            $dateObj = Carbon::parse($dateString);
            $formattedDate = $dateObj->format('M d');

            $row = ['date' => $formattedDate];
            foreach ($topProducts as $product) {
                $item = $data->where('order_date', $dateString)->where('product_name', $product)->first();
                $row[$product] = $item ? (int) $item->total_quantity : 0;
            }
            $result[] = $row;
        }

        return [
            'products' => $topProducts,
            'data' => $result
        ];
    }
    /**
     * Get Product vs Branch matrix data
     */
    private function getProductBranchMatrixData($query): array
    {
        $data = DB::table('pre_order_items')
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->join('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->join('branches', 'pre_orders.collection_branch_id', '=', 'branches.id')
            ->selectRaw("
                pre_order_products.product_name,
                branches.name as branch_name,
                SUM(pre_order_items.quantity) as total_quantity
            ")
            ->whereIn('pre_orders.id', $query->select('pre_orders.id'))
            ->whereIn('pre_orders.status', ['Paid', 'Collected'])
            ->groupBy('pre_order_products.product_name', 'branches.name')

            ->get();

        $branches = $data->pluck('branch_name')->unique()->sort()->values();
        $products = $data->pluck('product_name')->unique()->sort()->values()->toArray();

        $matrix = [];
        foreach ($branches as $branch) {
            $row = ['name' => $branch, 'total' => 0];
            foreach ($products as $product) {
                $val = $data->where('branch_name', $branch)->where('product_name', $product)->first();
                $qty = $val ? (int) $val->total_quantity : 0;
                $row[$product] = $qty;
                $row['total'] += $qty;
            }
            $matrix[] = $row;
        }

        return [
            'columns' => $products,
            'rows' => $matrix
        ];
    }


    /**
     * Get Break-Even Analysis Data
     */
    private function getBreakEvenData($filters): array
    {
        // Get current holiday
        $holidayId = $filters['holiday_id'] ?? null;
        if (!$holidayId || $holidayId === 'all') {
            return [
                'breakEven' => null,
                'chartData' => [],
                'summary' => [
                    'fixedCosts' => 0,
                    'variableCosts' => 0,
                    'revenue' => 0,
                    'profit' => 0,
                    'breakEvenOrders' => 0,
                    'currentOrders' => 0,
                    'ordersToBreakEven' => 0,
                    'isProfitable' => false,
                ]
            ];
        }

        // 1. Get General (Fixed) Costs - costs NOT linked to a specific product
        $fixedCostsData = DB::table('pre_order_costs as poc')
            ->join('pre_order_cost_categories as pocc', 'poc.category_id', '=', 'pocc.id')
            ->where('poc.holiday_id', $holidayId)
            ->whereNull('poc.pre_order_product_id')
            ->selectRaw("
                pocc.name as category_name,
                SUM(poc.amount) as total_amount
            ")
            ->groupBy('pocc.name')
            ->pluck('total_amount', 'category_name')
            ->toArray();

        // Convert to numerical values
        $costBreakdown = array_map('floatval', $fixedCostsData);
        $totalNonProductFixedCosts = array_sum($costBreakdown);

        // 2. Get Product (Variable) Costs - costs LINKED to specific products
        $variableCostsData = DB::table('pre_order_costs as poc')
            ->join('pre_order_items as poi', function ($join) use ($holidayId) {
                $join->on('poc.pre_order_product_id', '=', 'poi.pre_order_product_id')
                    ->whereExists(function ($query) use ($holidayId) {
                        $query->select(DB::raw(1))
                            ->from('pre_orders as po')
                            ->whereRaw('po.id = poi.pre_order_id')
                            ->where('po.holiday_id', $holidayId)
                            ->whereIn('po.status', ['Paid', 'Collected']);
                    });
            })
            ->where('poc.holiday_id', $holidayId)
            ->whereNotNull('poc.pre_order_product_id')
            ->selectRaw("SUM(poc.amount * poi.quantity) as total_variable_cost")
            ->first();

        $totalVariableCosts = (float) ($variableCostsData->total_variable_cost ?? 0);

        // 3. Get Sales Data (Revenue and Orders)
        $preOrderData = DB::table('pre_orders as po')
            ->where('po.holiday_id', $holidayId)
            ->whereIn('po.status', ['Paid', 'Collected'])
            ->selectRaw("
                COUNT(DISTINCT po.id) as total_orders,
                SUM(po.total_amount) as total_revenue
            ")
            ->first();

        $totalRevenue = (float) $preOrderData->total_revenue;
        $totalOrders = (int) $preOrderData->total_orders;

        // 4. Calculate Margins
        $avgRevenuePerOrder = $totalOrders > 0 ? ($totalRevenue / $totalOrders) : 0;
        $avgVariableCostPerOrder = $totalOrders > 0 ? ($totalVariableCosts / $totalOrders) : 0;
        $contributionMargin = $avgRevenuePerOrder - $avgVariableCostPerOrder;

        // 5. Calculate Break-Even
        // Condition: BEP = Fixed Costs / contribution margin
        // If margin <= 0, break-even is unreachable (losing money per order)
        $isUnreachable = $contributionMargin <= 0;
        $breakEvenOrders = (!$isUnreachable && $contributionMargin > 0)
            ? ceil($totalNonProductFixedCosts / $contributionMargin)
            : null;

        $currentProfit = $totalRevenue - ($totalNonProductFixedCosts + $totalVariableCosts);
        $ordersToBreakEven = ($breakEvenOrders !== null) ? max(0, $breakEvenOrders - $totalOrders) : null;
        $isProfitable = $currentProfit > 0;

        // 6. Generate Chart Data (slope-based costs simulation)
        $chartData = [];
        $displayMax = max($totalOrders, (int) ($breakEvenOrders ?? 0)) + 20;
        $step = max(1, floor($displayMax / 15));

        for ($i = 0; $i <= $displayMax; $i += $step) {
            $cumulativeRevenue = $i * $avgRevenuePerOrder;
            $cumulativeVariableCosts = $i * $avgVariableCostPerOrder;
            $cumulativeTotalCosts = $totalNonProductFixedCosts + $cumulativeVariableCosts;
            $profit = $cumulativeRevenue - $cumulativeTotalCosts;

            $chartData[] = [
                'orders' => $i,
                'revenue' => round($cumulativeRevenue, 2),
                'fixedCosts' => round($totalNonProductFixedCosts, 2),
                'totalCosts' => round($cumulativeTotalCosts, 2),
                'profit' => round($profit, 2),
                'isBreakEven' => $breakEvenOrders !== null && $i >= $breakEvenOrders && ($i - $step < $breakEvenOrders),
                'isCurrent' => $i >= $totalOrders && ($i - $step < $totalOrders),
            ];
        }

        // 7. Generate Historical Trends (Daily Aggregates)
        $dailyData = DB::table('pre_orders as po')
            ->where('po.holiday_id', $holidayId)
            ->whereIn('po.status', ['Paid', 'Collected'])
            ->selectRaw("
                DATE(po.created_at) as date,
                COUNT(po.id) as daily_orders,
                SUM(po.total_amount) as daily_revenue
            ")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $historicalTrends = [];
        $runningTotalOrders = 0;
        $runningTotalRevenue = 0;
        $runningTotalContribution = 0;
        $runningTotalQuantity = 0;

        foreach ($dailyData as $day) {
            // Calculate daily variable (product) costs for this day's orders
            $dailyVariableCosts = DB::table('pre_order_costs as poc')
                ->join('pre_order_items as poi', function ($join) use ($day) {
                    $join->on('poc.pre_order_product_id', '=', 'poi.pre_order_product_id')
                        ->whereExists(function ($query) use ($day) {
                            $query->select(DB::raw(1))
                                ->from('pre_orders as po')
                                ->whereRaw('po.id = poi.pre_order_id')
                                ->whereDate('po.created_at', $day->date)
                                ->whereIn('po.status', ['Paid', 'Collected']);
                        });
                })
                ->where('poc.holiday_id', $holidayId)
                ->whereNotNull('poc.pre_order_product_id')
                ->sum(DB::raw('poc.amount * poi.quantity'));

            $dayRevenue = (float) $day->daily_revenue;
            $dayOrders = (int) $day->daily_orders;
            $dayContribution = $dayRevenue - $dailyVariableCosts;

            // Get quantity for the day
            $dayQuantity = DB::table('pre_order_items as poi')
                ->join('pre_orders as po', 'poi.pre_order_id', '=', 'po.id')
                ->where('po.holiday_id', $holidayId)
                ->whereIn('po.status', ['Paid', 'Collected'])
                ->whereDate('po.created_at', $day->date)
                ->sum('poi.quantity');

            $runningTotalOrders += $dayOrders;
            $runningTotalRevenue += $dayRevenue;
            $runningTotalContribution += $dayContribution;
            $runningTotalQuantity += $dayQuantity;

            $historicalTrends[] = [
                'date' => $day->date,
                'cumulative_orders' => $runningTotalOrders,
                'cumulative_quantity' => (int) $runningTotalQuantity,
                'cumulative_contribution' => round($runningTotalContribution, 2),
                'avg_contribution' => $runningTotalOrders > 0 ? round($runningTotalContribution / $runningTotalOrders, 2) : 0,
            ];
        }

        $progressToGoal = ($breakEvenOrders !== null && $breakEvenOrders > 0)
            ? (float) min(100, round(($totalOrders / $breakEvenOrders) * 100, 1))
            : ($totalOrders > 0 && ($breakEvenOrders === null || $breakEvenOrders === 0) ? 100 : 0);

        return [
            'breakEven' => [
                'ordersNeeded' => $breakEvenOrders,
                'isUnreachable' => $isUnreachable,
                'contributionMargin' => round($contributionMargin, 2),
                'marginPercentage' => $avgRevenuePerOrder > 0 ? round(($contributionMargin / $avgRevenuePerOrder) * 100, 2) : 0,
            ],
            'chartData' => $chartData,
            'summary' => [
                'fixedCosts' => round($totalNonProductFixedCosts, 2),
                'variableCosts' => round($totalVariableCosts, 2),
                'revenue' => round($totalRevenue, 2),
                'profit' => round($currentProfit, 2),
                'breakEvenOrders' => $breakEvenOrders,
                'currentOrders' => $totalOrders,
                'ordersToBreakEven' => $ordersToBreakEven,
                'isProfitable' => $isProfitable,
                'isUnreachable' => $isUnreachable,
                'avgRevenuePerOrder' => round($avgRevenuePerOrder, 2),
                'avgProductCostPerOrder' => round($avgVariableCostPerOrder, 2),
                'costBreakdown' => $costBreakdown,
                'progressToGoal' => $progressToGoal,
                'isProfitZone' => $totalOrders >= ($breakEvenOrders ?? 1) && ($breakEvenOrders !== null),
            ],
            'historicalTrends' => $historicalTrends,
        ];
    }

    /**
     * Get Operator Performance stats
     */

    private function getOperatorPerformanceData($query): array
    {
        return DB::table('pre_orders')
            ->join('users', 'pre_orders.created_by', '=', 'users.id')
            ->leftJoin('pre_order_items', 'pre_orders.id', '=', 'pre_order_items.pre_order_id')
            ->leftJoin('employees', 'users.employee_id', '=', 'employees.id')
            ->leftJoin('branches', 'employees.branch_id', '=', 'branches.id')
            ->selectRaw("
                users.name,
                COALESCE(branches.name, 'Admin') as branch_name,
                COUNT(DISTINCT pre_orders.phone_number) as leads,
                COUNT(DISTINCT pre_orders.id) as orders,
                SUM(pre_order_items.quantity) as served_items,
                SUM(CASE WHEN pre_orders.status IN ('Paid', 'Collected') THEN pre_order_items.quantity ELSE 0 END) as sold_items,
                SUM(CASE WHEN pre_orders.status IN ('Paid', 'Collected') THEN pre_orders.total_amount ELSE 0 END) as revenue
            ")
            ->whereIn('pre_orders.id', $query->select('pre_orders.id'))
            ->groupBy('users.id', 'users.name', 'branches.name')
            ->orderByDesc('orders')
            ->get()
            ->map(function ($item) {
                $totalServed = (int) $item->served_items;
                $totalSold = (int) $item->sold_items;

                return [
                    'name' => $item->name,
                    'branch' => $item->branch_name,
                    'leads' => (int) $item->leads,
                    'orders' => (int) $item->orders,
                    'items' => $totalServed,
                    'revenue' => (float) $item->revenue,
                    'conversion_rate' => $totalServed > 0 ? round(($totalSold / $totalServed) * 100, 1) : 0
                ];
            })
            ->toArray();
    }

    /**
     * Get target KPI data for progress bars (paid orders vs. target per order type)
     */
    private function getTargetKpiData(array $filters): array
    {
        $holidayId = $filters['holiday_id'] ?? null;
        if (!$holidayId || $holidayId === 'all') {
            return [];
        }

        $targets = PreOrderTarget::with('orderType:id,name')
            ->where('holiday_id', $holidayId)
            ->get();

        if ($targets->isEmpty()) {
            return [];
        }

        $result = [];

        foreach ($targets as $target) {
            // Count paid/collected orders for this holiday (+ optional order type filter)
            $q = PreOrder::where('holiday_id', $holidayId)
                ->whereIn('status', ['Paid', 'Collected']);

            if ($target->order_type_id) {
                $q->where('order_type_id', $target->order_type_id);
            }

            $paidCount = $q->count();
            $pct = $target->target_count > 0
                ? round(($paidCount / $target->target_count) * 100, 1)
                : 0;

            $result[] = [
                'order_type_id' => $target->order_type_id,
                'order_type_name' => $target->orderType?->name ?? 'All Order Types',
                'target' => $target->target_count,
                'paid_count' => $paidCount,
                'percentage' => $pct,
            ];
        }

        // Sort: specific order types first, then "All" entries
        usort($result, fn($a, $b) => ($b['order_type_id'] !== null) <=> ($a['order_type_id'] !== null));

        return $result;
    }

    /**
     * Product vs Order Type matrix — qty and amount per product per order type (Paid/Collected only)
     */
    private function getProductByOrderTypeData($query): array
    {
        $orderTypes = OrderType::orderBy('name')->get(['id', 'name']);

        $data = DB::table('pre_order_items as poi')
            ->join('pre_orders as po', 'poi.pre_order_id', '=', 'po.id')
            ->join('pre_order_products as pop', 'poi.pre_order_product_id', '=', 'pop.id')
            ->whereIn('po.id', $query->select('pre_orders.id'))
            ->selectRaw("
                pop.product_name,
                po.order_type_id,
                SUM(poi.quantity) as total_qty,
                SUM(poi.subtotal) as total_amount
            ")
            ->groupBy('pop.product_name', 'po.order_type_id')
            ->get();

        $products = $data->pluck('product_name')->unique()->sort()->values();

        $rows = $products->map(function ($product) use ($data, $orderTypes) {
            $row = ['name' => $product, 'total_qty' => 0, 'total_amount' => 0];
            foreach ($orderTypes as $ot) {
                $item = $data->where('product_name', $product)->where('order_type_id', $ot->id)->first();
                $row['qty_' . $ot->id] = $item ? (int) $item->total_qty : 0;
                $row['amount_' . $ot->id] = $item ? (float) $item->total_amount : 0;
                $row['total_qty'] += $row['qty_' . $ot->id];
                $row['total_amount'] += $row['amount_' . $ot->id];
            }
            return $row;
        })->values()->toArray();

        return [
            'orderTypes' => $orderTypes->map(fn($ot) => ['id' => $ot->id, 'name' => $ot->name])->values()->toArray(),
            'rows' => $rows,
        ];
    }

    /**
     * Product vs Channel matrix — qty and amount per product per sales channel (TR / Telegram / Walk-in)
     * Channel detection:
     *  TR         = transaction_reference NOT NULL AND payment_slip IS NULL AND voucher_code IS NULL
     *  Telegram   = payment_slip IS NOT NULL
     *  Walk-in    = voucher_code IS NOT NULL AND voucher_code != ''
     */
    private function getProductByChannelData($query): array
    {
        // Get all paid/collected order IDs from the base query
        $baseIds = $query->select('pre_orders.id')->pluck('id');

        $raw = DB::table('pre_order_items as poi')
            ->join('pre_orders as po', 'poi.pre_order_id', '=', 'po.id')
            ->join('pre_order_products as pop', 'poi.pre_order_product_id', '=', 'pop.id')
            ->whereIn('po.id', $baseIds)
            ->selectRaw("
                pop.product_name,
                CASE
                    WHEN po.payment_slip IS NOT NULL THEN 'telegram'
                    WHEN po.voucher_code IS NOT NULL AND po.voucher_code != '' THEN 'walkin'
                    WHEN po.transaction_reference IS NOT NULL THEN 'tr'
                    ELSE 'other'
                END as channel,
                SUM(poi.quantity) as total_qty,
                SUM(poi.subtotal) as total_amount
            ")
            ->groupBy('pop.product_name', 'channel')
            ->get();

        $products = $raw->pluck('product_name')->unique()->sort()->values();
        $channels = ['tr' => 'TR Order', 'telegram' => 'Telegram Bot', 'walkin' => 'Walk-in', 'other' => 'Other'];

        $rows = $products->map(function ($product) use ($raw, $channels) {
            $row = ['name' => $product, 'total_qty' => 0, 'total_amount' => 0];
            foreach (array_keys($channels) as $ch) {
                $item = $raw->where('product_name', $product)->where('channel', $ch)->first();
                $row['qty_' . $ch] = $item ? (int) $item->total_qty : 0;
                $row['amount_' . $ch] = $item ? (float) $item->total_amount : 0;
                $row['total_qty'] += $row['qty_' . $ch];
                $row['total_amount'] += $row['amount_' . $ch];
            }
            return $row;
        })->values()->toArray();

        return [
            'channels' => $channels,
            'rows' => $rows,
        ];
    }
}

