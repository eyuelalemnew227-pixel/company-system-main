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

        // Filter by tier if requested
        $tier = $request->query('tier', 'all');
        if ($tier === 'active') {
            $filtered = $customers->getCollection()->filter(fn($c) => ($c->order_count ?? 0) > 0)->values();
            $customers->setCollection($filtered);
        } elseif ($tier === 'vip') {
            $filtered = $customers->getCollection()->filter(fn($c) => ($c->total_spent ?? 0) >= 3000 || ($c->order_count ?? 0) >= 3)->values();
            $customers->setCollection($filtered);
        }

        // Calculate Top Customers across all pre-orders
        $topCustomersRaw = PreOrder::whereNotNull('phone_number')
            ->where('phone_number', '!=', '')
            ->selectRaw('phone_number, MAX(CONCAT(COALESCE(first_name,""), " ", COALESCE(father_name,""))) as full_name, COUNT(*) as order_count, SUM(total_amount) as total_spent, MAX(created_at) as last_order_date')
            ->groupBy('phone_number')
            ->orderByDesc('total_spent')
            ->limit(5)
            ->get();

        $topCustomers = $topCustomersRaw->map(function ($item, $index) {
            $tgCust = TelegramCustomer::where('phone_number', $item->phone_number)->first();
            $fullName = trim($item->full_name);
            if (empty($fullName) && $tgCust) {
                $fullName = trim(($tgCust->first_name ?? '') . ' ' . ($tgCust->last_name ?? ''));
            }
            return [
                'rank' => $index + 1,
                'full_name' => !empty($fullName) ? $fullName : 'Valued Customer',
                'phone_number' => $item->phone_number,
                'username' => $tgCust?->username,
                'order_count' => (int)$item->order_count,
                'total_spent' => (float)$item->total_spent,
                'last_order_date' => $item->last_order_date,
            ];
        });

        $totalCustomers = TelegramCustomer::count();
        $totalTelegramOrders = PreOrder::where('order_number', 'like', 'ORD-%')->count();
        $totalTelegramRevenue = PreOrder::where('order_number', 'like', 'ORD-%')->whereIn('status', ['Paid', 'Collected'])->sum('total_amount');

        return Inertia::render('pre-orders/customers/index', [
            'customers' => $customers,
            'top_customers' => $topCustomers,
            'stats' => [
                'total_customers' => $totalCustomers,
                'total_orders' => $totalTelegramOrders,
                'total_revenue' => (float)$totalTelegramRevenue,
            ],
            'filters' => [
                'search' => $request->query('search'),
                'per_page' => $request->query('per_page'),
                'tier' => $tier,
            ],
        ]);
    }

    public function orders(Request $request, string $phone): \Illuminate\Http\JsonResponse
    {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        
        $orders = PreOrder::with(['collectionBranch:id,name', 'collectionDay:id,name', 'items.product:id,product_name'])
            ->where(function ($q) use ($phone, $cleanPhone) {
                $q->where('phone_number', $phone)
                    ->orWhere('phone_number', '+' . $cleanPhone)
                    ->orWhere('phone_number', 'like', "%{$cleanPhone}%");
            })
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'orders' => $orders,
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
