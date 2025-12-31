<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CollectionDay;
use App\Models\OrderType;
use App\Models\PreOrder;
use App\Models\PreOrderItem;
use App\Models\PreOrderProduct;
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
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'branch_id' => $request->query('branch_id'),
            'product_id' => $request->query('product_id'),
            'collection_day_id' => $request->query('collection_day_id'),
            'holiday_id' => $request->query('holiday_id', $latestHoliday ? (string)$latestHoliday->id : 'all'),
            'status' => $request->query('status'),
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

        // Apply filters
        $this->applyFilters($query, $filters);

        // Get dashboard data
        $dashboardData = $this->getDashboardData($query, $filters);

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
        ]);
    }

    /**
     * Get comprehensive dashboard data
     */
    private function getDashboardData($query, array $filters): array
    {
        // Summary Statistics
        $summary = $this->getSummaryStats($query->clone());

        // Status distribution (keep for now if needed, or remove if fully replaced)
        $statusDistribution = $this->getStatusDistribution($query->clone());

        // Summary table data
        $summaryData = $this->getSummaryTableData($query->clone(), $filters);

        // Chart Data
        $charts = [
            'orderType' => $this->getOrdersByOrderType($query->clone()),
            'product' => $this->getTopProducts($query->clone()),
            'collectionDay' => $this->getOrdersByCollectionDay($query->clone()),
        ];

        return [
            'summary' => $summary,
            'statusDistribution' => $statusDistribution,
            'summaryData' => $summaryData,
            'charts' => $charts,
        ];
    }

    /**
     * Apply filters to the query
     */
    private function applyFilters($query, array $filters): void
    {
        if (!empty($filters['date_from'])) {
            $query->whereDate('pre_orders.created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('pre_orders.created_at', '<=', $filters['date_to']);
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
            $query->where('pre_orders.status', $filters['status']);
        }

        if (!empty($filters['order_type_id'])) {
            $query->where('pre_orders.order_type_id', $filters['order_type_id']);
        }

        if (!empty($filters['holiday_id']) && $filters['holiday_id'] !== 'all') {
            $query->whereHas('collectionDay', function ($q) use ($filters) {
                $q->where('holiday_id', $filters['holiday_id']);
            });
        }
    }

    /**
     * Get summary statistics
     */
    private function getSummaryStats($query): array
    {
        $stats = $query->selectRaw("
            COUNT(*) as total_orders,
            COUNT(DISTINCT pre_orders.collection_branch_id) as unique_branches,
            COUNT(DISTINCT pre_orders.client_name) as unique_customers,
            SUM(pre_orders.total_amount) as total_revenue,
            AVG(pre_orders.total_amount) as avg_order_value,
            COUNT(CASE WHEN pre_orders.status = 'Paid' THEN 1 END) as paid_orders,
            COUNT(CASE WHEN pre_orders.status = 'Pending' THEN 1 END) as pending_orders,
            COUNT(CASE WHEN pre_orders.status = 'Collected' THEN 1 END) as collected_orders,
            COUNT(CASE WHEN pre_orders.status = 'Cancelled' THEN 1 END) as cancelled_orders
        ")->first();

        return [
            'total_orders' => (int) $stats->total_orders,
            'unique_branches' => (int) $stats->unique_branches,
            'unique_customers' => (int) $stats->unique_customers,
            'total_revenue' => (float) $stats->total_revenue,
            'avg_order_value' => (float) $stats->avg_order_value,
            'paid_orders' => (int) $stats->paid_orders,
            'pending_orders' => (int) $stats->pending_orders,
            'collected_orders' => (int) $stats->collected_orders,
            'cancelled_orders' => (int) $stats->cancelled_orders,
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
    private function getSummaryTableData($unusedQuery, array $filters): array
    {
        // Build query from scratch to ensure clean state and correct joins for summary table
        $query = DB::table('pre_orders')
            ->selectRaw("
                pre_orders.collection_branch_id,
                COALESCE(branches.name, 'Unassigned') as branch_name,
                pre_orders.collection_day_id,
                COALESCE(collection_days.name, 'Not Set') as collection_day_name,
                COALESCE(pre_order_products.product_name, 'Unknown Product') as product_name,
                SUM(pre_order_items.quantity) as total_quantity,
                SUM(pre_order_items.subtotal) as total_amount,
                COUNT(DISTINCT pre_orders.id) as total_orders
            ")
            ->leftJoin('pre_order_items', 'pre_orders.id', '=', 'pre_order_items.pre_order_id')
            ->leftJoin('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->leftJoin('branches', 'pre_orders.collection_branch_id', '=', 'branches.id')
            ->leftJoin('collection_days', 'pre_orders.collection_day_id', '=', 'collection_days.id');

        // Apply filters directly to this query
        if (!empty($filters['date_from'])) {
            $query->whereDate('pre_orders.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('pre_orders.created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['branch_id']) && $filters['branch_id'] !== 'all') {
            $query->where('pre_orders.collection_branch_id', $filters['branch_id']);
        }
        if (!empty($filters['product_id']) && $filters['product_id'] !== 'all') {
            // Filter by product_id on the joined item/product
            $query->where('pre_order_products.id', $filters['product_id']);
        }
        if (!empty($filters['collection_day_id']) && $filters['collection_day_id'] !== 'all') {
            $query->where('pre_orders.collection_day_id', $filters['collection_day_id']);
        }
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('pre_orders.status', $filters['status']);
        }
        if (!empty($filters['order_type_id']) && $filters['order_type_id'] !== 'all') {
            $query->where('pre_orders.order_type_id', $filters['order_type_id']);
        }
        if (!empty($filters['holiday_id']) && $filters['holiday_id'] !== 'all') {
            $query->where('collection_days.holiday_id', $filters['holiday_id']);
        }

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

        return $summaryData;
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
}
