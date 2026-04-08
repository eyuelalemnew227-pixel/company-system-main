<?php

namespace App\Http\Controllers;

use App\Models\PreOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class MyBranchOrdersController extends Controller
{
    /**
     * Display orders for the user's branch (collection branch)
     */
    public function index(Request $request): Response
    {
        // Check permission
        if (!auth()->user()->can('view my branch orders')) {
            abort(403, 'You do not have permission to view branch orders.');
        }

        // Get user's branch through employee relationship
        $user = auth()->user();
        $userBranch = $user->employee?->branch_id;

        if (!$userBranch) {
            return Inertia::render('my-branch-orders/index', [
                'orders' => ['data' => [], 'links' => [], 'from' => 0, 'to' => 0, 'total' => 0],
                'filters' => [
                    'search' => null,
                    'status' => null,
                    'collection_status' => null,
                    'sort' => 'created_at',
                    'direction' => 'desc',
                ],
                'userBranch' => 'Not Assigned',
                'message' => 'You are not assigned to any branch.',
            ]);
        }

        // Query orders where collection_branch_id matches user's branch
        // Show Paid and Collected orders
        $query = PreOrder::query()
            ->with([
                'orderType:id,name',
                'collectionDay:id,name',
                'collectionBranch:id,name',
                'registeringBranch:id,name',
                'creator:id,name',
                'collector:id,name',
                'items:id,pre_order_id,pre_order_product_id,quantity',
                'items.product:id,product_name',
            ])
            ->where('collection_branch_id', $userBranch)
            ->whereIn('status', ['Paid', 'Collected']);

        // Filter by search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        // Filter by collection day
        if ($collectionDayId = $request->query('collection_day_id')) {
            $query->where('collection_day_id', $collectionDayId);
        }

        // Filter by order type
        if ($orderTypeId = $request->query('order_type_id')) {
            $query->where('order_type_id', $orderTypeId);
        }

        // Filter by collection status
        if ($collectionStatus = $request->query('collection_status')) {
            if ($collectionStatus === 'collected') {
                $query->whereNotNull('collected_at');
            } elseif ($collectionStatus === 'not_collected') {
                $query->whereNull('collected_at');
            }
        }

        // Sorting
        $sortField = $request->query('sort', 'created_at');
        $sortDirection = $request->query('direction', 'desc');

        $allowedSorts = ['id', 'order_number', 'first_name', 'last_name', 'status', 'total_amount', 'created_at', 'collected_at'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'created_at';
        }

        if (!in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $perPage = (int) $request->query('per_page', 15);
        $orders = $query->orderBy($sortField, $sortDirection)->paginate($perPage)->withQueryString();

        // Calculate KPIs for all orders (not just paginated)
        $allOrdersQuery = PreOrder::query()
            ->where('collection_branch_id', $userBranch)
            ->whereIn('status', ['Paid', 'Collected']);

        $totalOrders = $allOrdersQuery->count();
        $collectedOrders = $allOrdersQuery->whereNotNull('collected_at')->count();
        $pendingOrders = $totalOrders - $collectedOrders;
        $totalAmount = $allOrdersQuery->sum('total_amount');
        $collectedAmount = PreOrder::query()
            ->where('collection_branch_id', $userBranch)
            ->whereNotNull('collected_at')
            ->sum('total_amount');

        // Get product statistics
        $productStats = \DB::table('pre_order_items')
            ->join('pre_orders', 'pre_order_items.pre_order_id', '=', 'pre_orders.id')
            ->join('pre_order_products', 'pre_order_items.pre_order_product_id', '=', 'pre_order_products.id')
            ->where('pre_orders.collection_branch_id', $userBranch)
            ->whereIn('pre_orders.status', ['Paid', 'Collected'])
            ->select(
                'pre_order_products.product_name',
                \DB::raw('SUM(pre_order_items.quantity) as total_quantity'),
                \DB::raw('SUM(CASE WHEN pre_orders.collected_at IS NOT NULL THEN pre_order_items.quantity ELSE 0 END) as collected_quantity')
            )
            ->groupBy('pre_order_products.product_name')
            ->orderBy('total_quantity', 'desc')
            ->limit(10)
            ->get();

        // Get order type statistics
        $orderTypeStats = PreOrder::query()
            ->where('collection_branch_id', $userBranch)
            ->whereIn('status', ['Paid', 'Collected'])
            ->with('orderType:id,name')
            ->select('order_type_id', \DB::raw('COUNT(*) as count'), \DB::raw('SUM(CASE WHEN collected_at IS NOT NULL THEN 1 ELSE 0 END) as collected'))
            ->groupBy('order_type_id')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->orderType->name ?? 'Unknown',
                    'total' => $item->count,
                    'collected' => $item->collected,
                    'pending' => $item->count - $item->collected,
                ];
            });

        // Get all collection days for the filter
        $collectionDays = \App\Models\CollectionDay::where('status', 'Active')
            ->orderBy('display_order')
            ->get(['id', 'name']);

        // Get all order types for the filter
        $orderTypes = \App\Models\OrderType::where('status', 'Active')
            ->get(['id', 'name']);

        return Inertia::render('my-branch-orders/index', [
            'orders' => $orders,
            'collectionDays' => $collectionDays,
            'orderTypes' => $orderTypes,
            'kpis' => [
                'totalOrders' => $totalOrders,
                'collectedOrders' => $collectedOrders,
                'pendingOrders' => $pendingOrders,
                'totalAmount' => $totalAmount,
                'collectedAmount' => $collectedAmount,
                'collectionRate' => $totalOrders > 0 ? round(($collectedOrders / $totalOrders) * 100, 1) : 0,
            ],
            'productStats' => $productStats,
            'orderTypeStats' => $orderTypeStats,
            'filters' => [
                'search' => $search,
                'collection_day_id' => $request->query('collection_day_id'),
                'order_type_id' => $request->query('order_type_id'),
                'collection_status' => $collectionStatus,
                'sort' => $sortField,
                'direction' => $sortDirection,
            ],
            'userBranch' => auth()->user()->employee?->branch?->name ?? 'Unknown',
        ]);
    }

    /**
     * Mark an order as collected
     */
    public function collect(PreOrder $order): RedirectResponse
    {
        // Check permission
        if (!auth()->user()->can('collect branch orders')) {
            abort(403, 'You do not have permission to collect orders.');
        }

        // Verify the order belongs to user's branch
        $userBranch = auth()->user()->employee?->branch_id;
        if ($order->collection_branch_id !== $userBranch) {
            abort(403, 'This order does not belong to your branch.');
        }

        // Check if already collected
        if ($order->collected_at) {
            return back()->withErrors(['error' => 'This order has already been collected.']);
        }

        // Mark as collected and update status
        $order->update([
            'collected_at' => now(),
            'collected_by' => auth()->id(),
            'status' => 'Collected',
        ]);

        return back()->with('success', "Order {$order->order_number} marked as collected.");
    }

    /**
     * Mark an order as not collected (uncollect)
     */
    public function uncollect(PreOrder $order): RedirectResponse
    {
        // Check permission
        if (!auth()->user()->can('collect branch orders')) {
            abort(403, 'You do not have permission to uncollect orders.');
        }

        // Verify the order belongs to user's branch
        $userBranch = auth()->user()->employee?->branch_id;
        if ($order->collection_branch_id !== $userBranch) {
            abort(403, 'This order does not belong to your branch.');
        }

        // Check if not collected
        if (!$order->collected_at) {
            return back()->withErrors(['error' => 'This order has not been collected yet.']);
        }

        // Mark as not collected and revert status back to Paid
        $order->update([
            'collected_at' => null,
            'collected_by' => null,
            'status' => 'Paid',
        ]);

        return back()->with('success', "Order {$order->order_number} marked as not collected.");
    }

    /**
     * Export orders to PDF or Excel (CSV)
     */
    public function export(Request $request): HttpResponse
    {
        // Check permission
        if (!auth()->user()->can('view my branch orders')) {
            abort(403, 'You do not have permission to export branch orders.');
        }

        // Get user's branch through employee relationship
        $user = auth()->user();
        $userBranch = $user->employee?->branch_id;
        $branchName = $user->employee?->branch?->name ?? 'Unknown Branch';

        if (!$userBranch) {
            abort(403, 'You are not assigned to any branch.');
        }

        // Query orders with same filters as index page
        $query = PreOrder::query()
            ->with([
                'orderType:id,name',
                'collectionDay:id,name',
                'collectionBranch:id,name',
                'registeringBranch:id,name',
                'creator:id,name',
                'collector:id,name',
                'items:id,pre_order_id,pre_order_product_id,quantity',
                'items.product:id,product_name',
            ])
            ->where('collection_branch_id', $userBranch)
            ->whereIn('status', ['Paid', 'Collected']);

        // Apply same filters as index
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        if ($collectionDayId = $request->query('collection_day_id')) {
            $query->where('collection_day_id', $collectionDayId);
        }

        if ($orderTypeId = $request->query('order_type_id')) {
            $query->where('order_type_id', $orderTypeId);
        }

        if ($collectionStatus = $request->query('collection_status')) {
            if ($collectionStatus === 'collected') {
                $query->whereNotNull('collected_at');
            } elseif ($collectionStatus === 'not_collected') {
                $query->whereNull('collected_at');
            }
        }

        // Sorting
        $sortField = $request->query('sort', 'created_at');
        $sortDirection = $request->query('direction', 'desc');

        $allowedSorts = ['id', 'order_number', 'first_name', 'last_name', 'status', 'total_amount', 'created_at', 'collected_at'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'created_at';
        }

        if (!in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        // Get all orders (no pagination for export)
        $orders = $query->orderBy($sortField, $sortDirection)->get();

        $format = $request->query('format', 'pdf');

        if ($format === 'excel') {
            return $this->exportCsv($orders);
        }
        // Calculate totals
        $totalAmount = $orders->sum('total_amount');
        $collectedCount = $orders->whereNotNull('collected_at')->count();
        $notCollectedCount = $orders->whereNull('collected_at')->count();

        // Generate PDF
        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.branch-orders', [
            'orders' => $orders,
            'branchName' => $branchName,
            'totalAmount' => $totalAmount,
            'collectedCount' => $collectedCount,
            'notCollectedCount' => $notCollectedCount,
            'totalOrders' => $orders->count(),
            'exportDate' => now()->format('F d, Y h:i A'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('branch-orders-' . now()->format('Y-m-d-His') . '.pdf');
    }

    private function exportCsv($orders)
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="branch-orders-' . date('Y-m-d-His') . '.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($orders) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }

            // BOM for UTF-8 Excel compatibility
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header row
            fputcsv($out, [
                'Order #',
                'First Name',
                'Last Name',
                'Phone Number',
                'Order Type',
                'Collection Day',
                'Products',
                'Status',
                'Total Amount',
                'Collection Status',
                'Date Created'
            ]);

            // Data rows
            foreach ($orders as $order) {
                $products = $order->items->map(function ($item) {
                    return ($item->product->product_name ?? 'Unknown') . " (" . $item->quantity . ")";
                })->implode(', ');

                fputcsv($out, [
                    $order->order_number,
                    $order->first_name,
                    $order->last_name,
                    $order->phone_number,
                    $order->orderType->name ?? '-',
                    $order->collectionDay->name ?? '-',
                    $products,
                    $order->status,
                    $order->total_amount,
                    $order->collected_at ? 'Collected' : 'Pending',
                    $order->created_at->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }
}
