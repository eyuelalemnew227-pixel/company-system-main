<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CollectionDay;
use App\Models\OrderType;
use App\Models\PreOrder;
use App\Models\PreOrderItem;
use App\Models\PreOrderPaymentSetting;
use App\Models\PreOrderProduct;
use App\Models\TelegramSettings;
use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PreOrderMiniAppApiController extends Controller
{
    public function getData(Request $request): JsonResponse
    {
        try {
            $responseData = Cache::remember('miniapp_init_data', 30, function () {
                $bot = \App\Models\TelegramBot::whereIn('slug', ['pre_order', 'pre-order', 'pre-order-bot'])->first();
                $maintenanceMode = $bot ? !$bot->is_active : false;

                $collectionDays = CollectionDay::where('status', 'Active')
                    ->orderBy('display_order')
                    ->get(['id', 'name', 'date']);

                $products = PreOrderProduct::where('status', 'Active')
                    ->orderBy('id')
                    ->get(['id', 'product_name', 'unit_price', 'walkin_price', 'description']);

                $branches = Branch::where('status', 'active')
                    ->where('is_pre_order_branch', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'location', 'contact_phone']);

                $paymentMethods = PreOrderPaymentSetting::where('is_active', true)
                    ->orderBy('id')
                    ->get(['id', 'payment_method', 'account_name', 'account_number', 'instructions', 'example'])
                    ->map(function ($pm) {
                        return [
                            'id' => $pm->id,
                            'name' => $pm->payment_method,
                            'payment_method' => $pm->payment_method,
                            'account_name' => $pm->account_name ?: "Kaldi's Coffee",
                            'account_number' => $pm->account_number ?: '',
                            'instructions' => $pm->instructions,
                        ];
                    });

                return [
                    'success' => true,
                    'maintenance_mode' => $maintenanceMode,
                    'site_title' => "Kaldi's Coffee Pre-Order",
                    'collection_days' => $collectionDays,
                    'products' => $products,
                    'branches' => $branches,
                    'payment_methods' => $paymentMethods,
                ];
            });

            return response()->json($responseData);
        } catch (\Throwable $e) {
            Log::error("MiniApp getData error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load initial data: ' . $e->getMessage()], 500);
        }
    }

    public function storeOrder(Request $request, TelegramBotService $botService): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'father_name' => ['nullable', 'string', 'max:100'],
            'surname' => ['nullable', 'string', 'max:100'],
            'phone_number' => ['required', 'string', 'max:50'],
            'collection_branch_id' => ['required', 'exists:branches,id'],
            'collection_day_id' => ['required', 'exists:collection_days,id'],
            'payment_method' => ['required', 'string', 'max:100'],
            'transaction_reference' => ['nullable', 'string', 'max:100', 'unique:pre_orders,transaction_reference'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:pre_order_products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'payment_slip' => ['nullable', 'string'], // Base64 or uploaded file
            'chat_id' => ['nullable', 'string'],
        ]);

        try {
            DB::beginTransaction();

            $orderType = OrderType::firstOrCreate(['name' => 'Telegram Bot']);
            
            // Generate Order Number
            $prefix = 'ORD-';
            $maxSeq = PreOrder::where('order_number', 'like', 'ORD-%')->count();
            $orderNumber = $prefix . str_pad($maxSeq + 1, 6, '0', STR_PAD_LEFT);

            // Process Payment Slip image/PDF if base64
            $paymentSlipPath = null;
            if (!empty($validated['payment_slip']) && str_contains($validated['payment_slip'], 'base64,')) {
                $imageParts = explode('base64,', $validated['payment_slip']);
                $imageDecoded = base64_decode($imageParts[1]);
                
                $extension = 'jpg';
                if (str_contains($validated['payment_slip'], 'data:application/pdf')) {
                    $extension = 'pdf';
                } elseif (str_contains($validated['payment_slip'], 'data:image/png')) {
                    $extension = 'png';
                } elseif (str_contains($validated['payment_slip'], 'data:image/webp')) {
                    $extension = 'webp';
                }
                
                $fileName = 'slip_' . time() . '_' . uniqid() . '.' . $extension;

                // Save into storage/app/public/preorder
                $storageDir = storage_path('app/public/preorder');
                if (!is_dir($storageDir)) {
                    mkdir($storageDir, 0777, true);
                }
                file_put_contents($storageDir . '/' . $fileName, $imageDecoded);

                // Also save into public/storage/preorder for direct web access
                $publicStorageDir = public_path('storage/preorder');
                if (!is_dir($publicStorageDir)) {
                    mkdir($publicStorageDir, 0777, true);
                }
                file_put_contents($publicStorageDir . '/' . $fileName, $imageDecoded);

                $paymentSlipPath = 'storage/preorder/' . $fileName;
            }

            // Calculate total amount
            $totalAmount = 0;
            $itemsToCreate = [];

            foreach ($validated['items'] as $item) {
                $prod = PreOrderProduct::findOrFail($item['product_id']);
                $unitPrice = $prod->unit_price;
                $itemSubtotal = $unitPrice * $item['quantity'];
                $totalAmount += $itemSubtotal;

                $itemsToCreate[] = [
                    'pre_order_product_id' => $prod->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'subtotal' => $itemSubtotal,
                ];
            }

            // Format phone number to standard +251XXXXXXXXX format
            $rawPhone = preg_replace('/[^0-9]/', '', $validated['phone_number']);
            if (str_starts_with($rawPhone, '251')) {
                $rawPhone = substr($rawPhone, 3);
            }
            if (str_starts_with($rawPhone, '0')) {
                $rawPhone = substr($rawPhone, 1);
            }
            $formattedPhone = '+251' . $rawPhone;

            // Scrap / extract transaction reference from slip text if reference was left blank
            $txRef = $validated['transaction_reference'] ?? null;
            if (empty($txRef) && !empty($paymentSlipPath) && file_exists(public_path($paymentSlipPath))) {
                $rawContent = @file_get_contents(public_path($paymentSlipPath));
                if ($rawContent) {
                    if (preg_match('/(FT|ET)[0-9A-Z]{8,14}/i', $rawContent, $m)) {
                        $txRef = strtoupper($m[0]);
                    } elseif (preg_match('/(?:Txn|Ref|Transaction|Id|No)[:\s#]*([A-Z0-9]{10,16})/i', $rawContent, $m)) {
                        $txRef = strtoupper($m[1]);
                    }
                }
            }

            $preOrder = PreOrder::create([
                'order_number' => $orderNumber,
                'first_name' => $validated['first_name'],
                'father_name' => $validated['father_name'] ?? null,
                'surname' => $validated['surname'] ?? null,
                'phone_number' => $formattedPhone,
                'collection_branch_id' => $validated['collection_branch_id'],
                'collection_day_id' => $validated['collection_day_id'],
                'holiday_id' => CollectionDay::find($validated['collection_day_id'])?->holiday_id,
                'order_type_id' => $orderType->id,
                'total_amount' => $totalAmount,
                'payment_method' => $validated['payment_method'],
                'transaction_reference' => $txRef,
                'payment_slip' => $paymentSlipPath,
                'status' => 'Pending',
                'chat_id' => $validated['chat_id'] ?? null,
                'created_by' => auth()->id() ?? null,
            ]);

            foreach ($itemsToCreate as $itemData) {
                $itemData['pre_order_id'] = $preOrder->id;
                PreOrderItem::create($itemData);
            }

            // Upsert into telegram_customers table so chat_id is linked to customer phone
            if (!empty($validated['chat_id'])) {
                try {
                    DB::table('telegram_customers')->updateOrInsert(
                        ['chat_id' => (string) $validated['chat_id']],
                        [
                            'phone_number' => $formattedPhone,
                            'first_name' => $validated['first_name'],
                            'last_name' => $validated['father_name'] ?? null,
                            'updated_at' => now(),
                        ]
                    );
                } catch (\Throwable $e) {
                    Log::warning("Failed to upsert telegram_customer: " . $e->getMessage());
                }
            }

            DB::commit();

            // Asynchronously dispatch notifications after response so client gets lighting fast (<100ms) order confirmation
            app()->terminating(function () use ($botService, $validated, $preOrder, $orderNumber, $totalAmount, $paymentSlipPath, $formattedPhone) {
                // Customer Notification
                $chatId = $validated['chat_id'] ?? $preOrder->chat_id;
                if (!empty($chatId)) {
                    try {
                        $branch = Branch::find($validated['collection_branch_id']);
                        $branchName = $branch ? $branch->name : 'N/A';
                        $branchLoc = $branch ? $branch->location : '';
                        $branchPhone = $branch ? $branch->contact_phone : '';

                        $collDay = CollectionDay::find($validated['collection_day_id']);
                        $collDateStr = $collDay ? ($collDay->name . ($collDay->date ? ' (' . date('M d, Y', strtotime($collDay->date)) . ')' : '')) : '';
                        $collDateLine = !empty($collDateStr) ? "📅 <b>Collection Date:</b> {$collDateStr}\n" : "";

                        $itemsList = [];
                        foreach ($validated['items'] as $item) {
                            $prod = PreOrderProduct::find($item['product_id']);
                            if ($prod) {
                                $itemsList[] = "  • <b>{$prod->product_name}</b> × {$item['quantity']} — " . number_format($prod->unit_price * $item['quantity'], 2) . " ETB";
                            }
                        }
                        $itemsText = !empty($itemsList) ? "<b>🎂 Ordered Items:</b>\n" . implode("\n", $itemsList) . "\n\n" : "";

                        $mapLine = '';
                        if (!empty($branchLoc)) {
                            if (str_starts_with($branchLoc, 'http://') || str_starts_with($branchLoc, 'https://')) {
                                $mapLine = "🗺️ <b>Map Location:</b> <a href=\"{$branchLoc}\">Open Google Maps</a>\n";
                            } else {
                                $mapLine = "🗺️ <b>Location:</b> {$branchLoc}\n";
                            }
                        }
                        $phoneLine = !empty($branchPhone) ? "📞 <b>Branch Phone:</b> <code>{$branchPhone}</code>\n" : "";

                        $fullName = trim($validated['first_name'] . ' ' . ($validated['father_name'] ?? '') . ' ' . ($validated['surname'] ?? ''));

                        $msg = "<b>☕ Kaldi's Coffee - Pre-Order Placed!</b>\n\n" .
                               "📋 <b>Order Number:</b> <code>{$orderNumber}</code>\n" .
                               "👤 <b>Customer:</b> {$fullName}\n" .
                               "📞 <b>Phone:</b> <code>{$formattedPhone}</code>\n\n" .
                               $itemsText .
                               "💳 <b>Payment Method:</b> {$validated['payment_method']}\n" .
                               "💰 <b>Total Amount:</b> ETB " . number_format($totalAmount, 2) . "\n\n" .
                               "📍 <b>Collection Branch:</b> <b>{$branchName}</b>\n" .
                               $collDateLine .
                               $mapLine .
                               $phoneLine . "\n" .
                               "Status: <b>Pending Payment Verification</b>\n\n" .
                               "Thank you for choosing Kaldi's Coffee!";
                        $botService->sendPreOrderMessage($chatId, $msg);
                    } catch (\Throwable $e) {
                        Log::error("Customer order notification error: " . $e->getMessage());
                    }
                }

                // Admin Group Notification
                $adminGroupChatId = TelegramSettings::getInstance()->pre_order_admin_group_chat_id;
                if (!empty($adminGroupChatId)) {
                    try {
                        $branch = Branch::find($validated['collection_branch_id']);
                        $branchName = $branch ? $branch->name : 'N/A';
                        $collDay = CollectionDay::find($validated['collection_day_id']);
                        $collDateStr = $collDay ? ($collDay->name . ($collDay->date ? ' (' . date('M d, Y', strtotime($collDay->date)) . ')' : '')) : 'N/A';

                        $itemsList = [];
                        foreach ($validated['items'] as $item) {
                            $prod = PreOrderProduct::find($item['product_id']);
                            if ($prod) {
                                $itemsList[] = "  • <b>{$prod->product_name}</b> × {$item['quantity']} — " . number_format($prod->unit_price * $item['quantity'], 2) . " ETB";
                            }
                        }
                        $itemsText = !empty($itemsList) ? implode("\n", $itemsList) : "N/A";
                        $fullName = trim($validated['first_name'] . ' ' . ($validated['father_name'] ?? '') . ' ' . ($validated['surname'] ?? ''));

                        $slipUrl = !empty($paymentSlipPath) ? url($paymentSlipPath) : null;
                        $slipLine = $slipUrl ? "📷 <b>Payment Slip:</b> <a href=\"{$slipUrl}\">View Receipt File</a>\n" : "";

                        $refText = !empty($preOrder->transaction_reference) ? "🔖 <b>Ref:</b> <code>{$preOrder->transaction_reference}</code>\n" : "";

                        $adminMsg = "🚨 <b>NEW PRE-ORDER PLACED</b> 🚨\n\n" .
                                    "📋 <b>Order Number:</b> <code>{$orderNumber}</code>\n" .
                                    "👤 <b>Customer:</b> {$fullName}\n" .
                                    "📞 <b>Phone:</b> <code>{$formattedPhone}</code>\n" .
                                    "📍 <b>Branch:</b> <b>{$branchName}</b>\n" .
                                    "📅 <b>Date:</b> {$collDateStr}\n" .
                                    "💳 <b>Payment Method:</b> {$validated['payment_method']}\n" .
                                    $refText .
                                    "💰 <b>Total:</b> ETB " . number_format($totalAmount, 2) . "\n" .
                                    $slipLine . "\n" .
                                    "🎂 <b>Items:</b>\n" . $itemsText . "\n\n" .
                                    "Status: <b>Pending Verification</b>";

                        $botService->sendPreOrderMessage($adminGroupChatId, $adminMsg);
                    } catch (\Throwable $e) {
                        Log::error("Failed to send Admin Group Chat order notification: " . $e->getMessage());
                    }
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully!',
                'order_number' => $orderNumber,
                'total_amount' => $totalAmount,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("MiniApp storeOrder error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to create order: ' . $e->getMessage()], 500);
        }
    }

    public function getOrderStatus(Request $request): JsonResponse
    {
        $orderNumber = $request->query('order_number');
        $phone = $request->query('phone_number');

        if (!$orderNumber && !$phone) {
            return response()->json(['success' => false, 'message' => 'Please provide order number or phone number.'], 400);
        }

        $query = PreOrder::with(['collectionBranch:id,name', 'collectionDay:id,name', 'items.product:id,product_name']);

        if ($orderNumber) {
            $query->where('order_number', $orderNumber);
        }

        if ($phone) {
            $query->where('phone_number', 'like', "%{$phone}%");
        }

        $orders = $query->orderByDesc('created_at')->limit(5)->get();

        return response()->json([
            'success' => true,
            'orders' => $orders,
        ]);
    }
}
