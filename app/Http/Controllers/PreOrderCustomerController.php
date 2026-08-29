<?php

namespace App\Http\Controllers;

use App\Models\PreOrder;
use App\Models\TelegramCustomer;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;

class PreOrderCustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TelegramCustomer::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%")
                    ->orWhere('chat_id', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 15);
        $customers = $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();

        // Calculate order analytics per customer phone
        $phoneNumbers = $customers->pluck('phone_number')->filter()->toArray();
        $orderStats = [];

        if (!empty($phoneNumbers)) {
            $stats = PreOrder::whereIn('phone_number', $phoneNumbers)
                ->selectRaw('phone_number, COUNT(*) as order_count, SUM(total_amount) as total_spent, MAX(created_at) as last_order_date')
                ->groupBy('phone_number')
                ->get()
                ->keyBy('phone_number');

            foreach ($stats as $phone => $stat) {
                $orderStats[$phone] = [
                    'order_count' => (int)$stat->order_count,
                    'total_spent' => (float)$stat->total_spent,
                    'last_order_date' => $stat->last_order_date,
                ];
            }
        }

        $customers->getCollection()->transform(function ($cust) use ($orderStats) {
            $phone = $cust->phone_number;
            $cust->order_count = $orderStats[$phone]['order_count'] ?? 0;
            $cust->total_spent = $orderStats[$phone]['total_spent'] ?? 0.0;
            $cust->last_order_date = $orderStats[$phone]['last_order_date'] ?? null;
            return $cust;
        });

        $totalCustomers = TelegramCustomer::count();
        $totalTelegramOrders = PreOrder::where('order_number', 'like', 'ORD-%')->count();
        $totalTelegramRevenue = PreOrder::where('order_number', 'like', 'ORD-%')->whereIn('status', ['Paid', 'Collected'])->sum('total_amount');

        return Inertia::render('pre-orders/customers/index', [
            'customers' => $customers,
            'stats' => [
                'total_customers' => $totalCustomers,
                'total_orders' => $totalTelegramOrders,
                'total_revenue' => (float)$totalTelegramRevenue,
            ],
            'filters' => [
                'search' => $request->query('search'),
                'per_page' => $request->query('per_page'),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = TelegramCustomer::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderByDesc('created_at')->get();

        $response = new StreamedResponse(function () use ($customers) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Chat ID', 'First Name', 'Last Name', 'Username', 'Phone Number', 'Joined Date']);

            foreach ($customers as $cust) {
                fputcsv($handle, [
                    $cust->id,
                    $cust->chat_id,
                    $cust->first_name ?? '',
                    $cust->last_name ?? '',
                    $cust->username ? '@' . $cust->username : '',
                    $cust->phone_number ?? '',
                    $cust->created_at->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="telegram_preorder_customers_' . date('Y-m-d') . '.csv"');

        return $response;
    }
}
