<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CollectionDay;
use App\Models\OrderType;
use App\Models\PreOrder;
use App\Models\PreOrderItem;
use App\Models\PreOrderProduct;
use App\Models\SmsSettings;
use App\Notifications\PreOrderCancelledGeezSMSNotification;
use App\Notifications\PreOrderPaidGeezSMSNotification;
use App\Rules\EthiopianPhoneNumber;
use App\Services\GeezSMSService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PreOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PreOrder::query()
            ->with([
                'orderType:id,name',
                'collectionDay:id,name',
                'collectionBranch:id,name',
                'registeringBranch:id,name',
                'creator:id,name',
                'items:id,pre_order_id,pre_order_product_id,quantity',
                'items.product:id,product_name',
            ]);

        // Filter by creator unless user has permission to view all
        if (!auth()->user()->can('view all pre-orders')) {
            $query->where('created_by', auth()->id());
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($branchId = $request->query('branch_id')) {
            $query->where('collection_branch_id', $branchId);
        }

        if ($collectionDayId = $request->query('collection_day_id')) {
            $query->where('collection_day_id', $collectionDayId);
        }

        if ($orderTypeId = $request->query('order_type_id')) {
            $query->where('order_type_id', $orderTypeId);
        }

        // Sorting
        $sortField = $request->query('sort', 'created_at');
        $sortDirection = $request->query('direction', 'desc');

        // Validate sort fields
        $allowedSorts = ['id', 'order_number', 'client_name', 'phone_number', 'status', 'total_amount', 'created_at'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'created_at';
        }

        if (!in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $perPage = (int) $request->query('per_page', 15);
        $preOrders = $query->orderBy($sortField, $sortDirection)->paginate($perPage)->withQueryString();

        $branches = Branch::all(['id', 'name']);
        $collectionDays = CollectionDay::where('status', 'Active')->orderBy('display_order')->get(['id', 'name']);
        $orderTypes = OrderType::where('status', 'Active')->get(['id', 'name']);

        // Get SMS balance data for users with permission
        $smsBalance = null;
        $smsLastUpdated = null;
        if (auth()->user()->can('view sms balance')) {
            try {
                $geeSmsService = app(GeezSMSService::class);
                $smsBalance = $geeSmsService->getBalance();
                $smsLastUpdated = now()->format('Y-m-d H:i:s');
            } catch (\Exception $e) {
                Log::error('Failed to fetch SMS balance for pre-orders page', [
                    'error' => $e->getMessage()
                ]);
            }
        }

        return Inertia::render('pre-orders/index', [
            'preOrders' => $preOrders,
            'branches' => $branches,
            'collectionDays' => $collectionDays,
            'orderTypes' => $orderTypes,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $request->query('status'),
                'branch_id' => $request->query('branch_id'),
                'collection_day_id' => $request->query('collection_day_id'),
                'order_type_id' => $request->query('order_type_id'),
                'per_page' => $request->query('per_page'),
            ],
            'smsBalance' => $smsBalance,
            'smsLastUpdated' => $smsLastUpdated,
            'userPermissions' => auth()->user()->getAllPermissions()->pluck('name')->toArray(),
        ]);
    }

    public function create(): Response
    {
        $user = auth()->user();
        
        $canCreateAll = $user->can('create all pre-orders');
        $canCreateWalkin = $user->can('create walkin pre-orders');
        $canCreateRegular = $user->can('create regular pre-orders');

        // Check if user can create at least one type of pre-order
        if (!$canCreateAll && !$canCreateWalkin && !$canCreateRegular) {
            abort(403, 'You do not have permission to create pre-orders.');
        }

        $branches = Branch::all(['id', 'name']);
        $collectionDays = CollectionDay::where('status', 'Active')->orderBy('display_order')->get(['id', 'name']);
        $orderTypes = OrderType::where('status', 'Active')->get(['id', 'name']);
        $products = PreOrderProduct::where('status', 'Active')->orderBy('product_name')->get(['id', 'product_name', 'unit_price']);

        return Inertia::render('pre-orders/create', [
            'branches' => $branches,
            'collectionDays' => $collectionDays,
            'orderTypes' => $orderTypes,
            'products' => $products,
            'userPermissions' => [
                'create_all' => $canCreateAll,
                'create_walkin' => $canCreateWalkin,
                'create_regular' => $canCreateRegular,
            ]
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = auth()->user();
        
        $canCreateAll = $user->can('create all pre-orders');
        $canCreateWalkin = $user->can('create walkin pre-orders');
        $canCreateRegular = $user->can('create regular pre-orders');

        // Check if user can create at least one type of pre-order
        if (!$canCreateAll && !$canCreateWalkin && !$canCreateRegular) {
            abort(403, 'You do not have permission to create pre-orders.');
        }

        $validated = $request->validate([
            'client_name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:9', new EthiopianPhoneNumber],
            'order_type_id' => ['required', 'integer', 'exists:order_types,id'],
            'collection_day_id' => ['required', 'integer', 'exists:collection_days,id'],
            'collection_branch_id' => ['required', 'integer', 'exists:branches,id'],
            'voucher_code' => ['nullable', 'string', 'max:255'],
            'transaction_reference' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:pre_order_products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        // Prepend +251 to phone number (remove any non-digits first)
        $cleanedPhone = preg_replace('/[^0-9]/', '', $validated['phone_number']);
        $validated['phone_number'] = '+251' . $cleanedPhone;

        // Check for duplicate order (same client, phone, and collection day within last 24 hours)
        $existingOrder = PreOrder::where('client_name', $validated['client_name'])
            ->where('phone_number', $validated['phone_number'])
            ->where('collection_day_id', $validated['collection_day_id'])
            ->where('created_at', '>=', now()->subDay())
            ->whereIn('status', ['Pending', 'Paid'])
            ->first();

        if ($existingOrder) {
            return back()->withErrors([
                'duplicate' => "A similar order already exists for this client ({$existingOrder->order_number}). Please check before creating a duplicate."
            ])->withInput();
        }

        DB::beginTransaction();
        try {
            // Generate order number
            $orderNumber = $this->generateOrderNumber();

            // Calculate total
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $product = PreOrderProduct::find($item['product_id']);
                $totalAmount += $product->unit_price * $item['quantity'];
            }

            // Get order type to determine status
            $orderType = OrderType::find($validated['order_type_id']);
            $isWalkin = $orderType->name === 'Walkin Customer';

            // Additional granular permission check for the specific order type
            if (!$canCreateAll) {
                if ($isWalkin && !$canCreateWalkin) {
                    abort(403, 'You do not have permission to create Walkin Customer orders.');
                }
                if (!$isWalkin && !$canCreateRegular) {
                    abort(403, 'You do not have permission to create regular orders.');
                }
            }

            $status = $isWalkin ? 'Paid' : 'Pending';

            // Create pre-order
            $preOrder = PreOrder::create([
                'order_number' => $orderNumber,
                'client_name' => $validated['client_name'],
                'phone_number' => $validated['phone_number'],
                'order_type_id' => $validated['order_type_id'],
                'collection_day_id' => $validated['collection_day_id'],
                'collection_branch_id' => $validated['collection_branch_id'],
                'voucher_code' => $validated['voucher_code'] ?? null,
                'transaction_reference' => $validated['transaction_reference'] ?? null,
                'status' => $status,
                'total_amount' => $totalAmount,
                'registering_branch_id' => auth()->user()?->employee?->branch_id,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            // Create order items
            foreach ($validated['items'] as $item) {
                $product = PreOrderProduct::find($item['product_id']);
                PreOrderItem::create([
                    'pre_order_id' => $preOrder->id,
                    'pre_order_product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->unit_price,
                    'subtotal' => $product->unit_price * $item['quantity'],
                ]);
            }

            DB::commit();

            // If it's a Walkin Customer (status is Paid), send confirmation SMS
            if ($status === 'Paid' && SmsSettings::isActive()) {
                try {
                    // Reload relationships for SMS
                    $preOrder->load(['collectionDay', 'collectionBranch', 'items.product']);
                    
                    $smsNotification = new PreOrderPaidGeezSMSNotification($preOrder);
                    $smsSent = $smsNotification->sendCustomerSMS();
                    
                    if ($smsSent) {
                        Log::info('SMS sent to Walkin Customer via GeezSMS on creation', [
                            'pre_order_id' => $preOrder->id,
                            'order_number' => $preOrder->order_number,
                            'phone' => $preOrder->phone_number
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('SMS notification exception for Walkin Customer creation', [
                        'pre_order_id' => $preOrder->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return redirect()->route('pre-orders.index')
                ->with('success', "Pre-order {$orderNumber} created successfully.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create pre-order: ' . $e->getMessage()]);
        }
    }

    public function show(PreOrder $preOrder): Response
    {
        // Check if user can view this order - requires explicit 'view pre-order details' permission
        if (!auth()->user()->can('view pre-order details')) {
            abort(403, 'You do not have permission to view this order.');
        }

        $preOrder->load([
            'orderType',
            'collectionDay',
            'collectionBranch',
            'registeringBranch',
            'creator',
            'updater',
            'items.product',
        ]);

        return Inertia::render('pre-orders/show', [
            'preOrder' => $preOrder,
            'userPermissions' => auth()->user()->getAllPermissions()->pluck('name')->toArray(),
        ]);
    }

    public function edit(PreOrder $preOrder): Response
    {
        $user = auth()->user();
        $isOwnOrder = $preOrder->created_by === auth()->id();
        $preOrder->load('orderType');
        $isWalkin = $preOrder->orderType->name === 'Walkin Customer';

        $canEditAll = $user->can('update all pre-orders') || $user->can('edit other users pre-orders') || $user->can('update pre-orders');
        $canEditWalkin = $user->can('update walkin pre-orders');
        $canEditRegular = $user->can('update regular pre-orders');
        $canEditOwn = $user->can('edit own pre-orders');

        if ($canEditAll) {
            $canEdit = true;
        } elseif ($isWalkin) {
            if ($canEditWalkin) {
                $canEdit = true;
            } elseif ($canEditOwn && $isOwnOrder) {
                $canEdit = true;
            }
        } else { // Regular order
            if ($canEditRegular) {
                $canEdit = true;
            } elseif ($canEditOwn && $isOwnOrder) {
                $canEdit = true;
            }
        }

        if (!$canEdit) {
            abort(403, 'You do not have permission to edit this order type.');
        }

        $preOrder->load('items');

        $branches = Branch::all(['id', 'name']);
        $collectionDays = CollectionDay::where('status', 'Active')->orderBy('display_order')->get(['id', 'name']);
        $orderTypes = OrderType::where('status', 'Active')->get(['id', 'name']);
        $products = PreOrderProduct::where('status', 'Active')->orderBy('product_name')->get(['id', 'product_name', 'unit_price']);

        // Check if the current user is the one who created this order
        $isRegisteringUser = $preOrder->created_by === auth()->id();

        return Inertia::render('pre-orders/edit', [
            'preOrder' => $preOrder,
            'branches' => $branches,
            'collectionDays' => $collectionDays,
            'orderTypes' => $orderTypes,
            'products' => $products,
            'isRegisteringUser' => $isRegisteringUser,
            'userPermissions' => [
                'update_all' => $canEditAll,
                'update_walkin' => $canEditWalkin,
                'update_regular' => $canEditRegular,
                'update_all_status' => $user->can('update all pre-order status') || $user->can('update pre-order status'),
                'mark_paid' => $user->can('mark pre-order as paid'),
                'can_cancel' => $user->can('cancel pre-orders'),
            ]
        ]);
    }

    public function update(Request $request, PreOrder $preOrder): RedirectResponse
    {
        $user = auth()->user();
        $isOwnOrder = $preOrder->created_by === auth()->id();
        $preOrder->load('orderType');
        $isWalkinBefore = $preOrder->orderType->name === 'Walkin Customer';

        $canEditAll = $user->can('update all pre-orders') || $user->can('edit other users pre-orders') || $user->can('update pre-orders');
        $canEditWalkin = $user->can('update walkin pre-orders');
        $canEditRegular = $user->can('update regular pre-orders');
        $canEditOwn = $user->can('edit own pre-orders');

        // Permission check for the initial order
        if ($canEditAll) {
            $canEdit = true;
        } elseif ($isWalkinBefore) {
            if ($canEditWalkin || ($canEditOwn && $isOwnOrder)) {
                $canEdit = true;
            }
        } else {
            if ($canEditRegular || ($canEditOwn && $isOwnOrder)) {
                $canEdit = true;
            }
        }

        if (!$canEdit) {
            abort(403, 'You do not have permission to edit this order.');
        }

        $validated = $request->validate([
            'client_name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:9', new EthiopianPhoneNumber],
            'order_type_id' => ['required', 'integer', 'exists:order_types,id'],
            'collection_day_id' => ['required', 'integer', 'exists:collection_days,id'],
            'collection_branch_id' => ['required', 'integer', 'exists:branches,id'],
            'voucher_code' => ['nullable', 'string', 'max:255'],
            'transaction_reference' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:Pending,Paid,Collected,Cancelled'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:pre_order_products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        // Prepend +251 to phone number (remove any non-digits first)
        $cleanedPhone = preg_replace('/[^0-9]/', '', $validated['phone_number']);
        $validated['phone_number'] = '+251' . $cleanedPhone;

        DB::beginTransaction();
        try {
            // Load the orderType relationship to check order type
            $preOrder->load('orderType');

            // Check if this is a Walkin Customer order - prevent status changes
            if ($isWalkinBefore && $validated['status'] !== $preOrder->status) {
                return back()->withErrors([
                    'status' => 'Cannot change status for Walkin Customer orders as they are already paid.',
                ]);
            }

            // Granular status permission checks
            if ($validated['status'] !== $preOrder->status) {
                $user = auth()->user();
                $canChangeAny = $user->can('update all pre-order status') || $user->can('update pre-order status');
                $canMarkPaid = $user->can('mark pre-order as paid');
                $canCancel = $user->can('cancel pre-orders');

                $isAuthorized = false;

                if ($canChangeAny) {
                    $isAuthorized = true;
                } elseif ($validated['status'] === 'Paid') {
                    if ($canMarkPaid && $preOrder->status === 'Pending') {
                        $isAuthorized = true;
                    }
                } elseif ($validated['status'] === 'Cancelled') {
                    if ($canCancel) {
                        $isAuthorized = true;
                    }
                }

                if (!$isAuthorized) {
                    return back()->withErrors([
                        'status' => 'You do not have permission to change the order status to ' . $validated['status'] . ($validated['status'] === 'Paid' ? ' from ' . $preOrder->status : '') . '.',
                    ]);
                }
            }

            // Additional granular permission check for the final target order type
            $targetOrderType = OrderType::find($validated['order_type_id']);
            $isWalkinAfter = $targetOrderType->name === 'Walkin Customer';

            if (!$canEditAll) {
                if ($isWalkinAfter && !$canEditWalkin) {
                    abort(403, 'You do not have permission to change or save orders as Walkin Customer.');
                }
                if (!$isWalkinAfter && !$canEditRegular) {
                    abort(403, 'You do not have permission to change or save orders as regular types.');
                }
            }

            // Calculate total
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $product = PreOrderProduct::find($item['product_id']);
                $totalAmount += $product->unit_price * $item['quantity'];
            }

            // Prepare update data
            $updateData = [
                'client_name' => $validated['client_name'],
                'phone_number' => $validated['phone_number'],
                'order_type_id' => $validated['order_type_id'],
                'collection_day_id' => $validated['collection_day_id'],
                'collection_branch_id' => $validated['collection_branch_id'],
                'total_amount' => $totalAmount,
                'transaction_reference' => $validated['transaction_reference'] ?? null,
                'status' => $validated['status'],
                'updated_by' => auth()->id(),
            ];

            $updateData['voucher_code'] = $validated['voucher_code'] ?? null;

            // Track if status changed to "Paid" or "Cancelled"
            $statusChangedToPaid = ($preOrder->status !== 'Paid' && $validated['status'] === 'Paid');
            $statusChangedToCancelled = ($preOrder->status !== 'Cancelled' && $validated['status'] === 'Cancelled');

            // Update pre-order
            $preOrder->update($updateData);

            // Delete old items and create new ones
            $preOrder->items()->delete();
            foreach ($validated['items'] as $item) {
                $product = PreOrderProduct::find($item['product_id']);
                PreOrderItem::create([
                    'pre_order_id' => $preOrder->id,
                    'pre_order_product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->unit_price,
                    'subtotal' => $product->unit_price * $item['quantity'],
                ]);
            }

            DB::commit();

            // If status changed to "Paid", send SMS notification
            if ($statusChangedToPaid) {
                // Check if SMS is active
                if (!SmsSettings::isActive()) {
                    $smsSettings = SmsSettings::getInstance();
                    // We don't return here because we want to finish the update flow, 
                    // but we might want to log or warn.
                    Log::warning("SMS notification could not be sent because SMS service is currently deactivated. Reason: {$smsSettings->deactivation_reason}");
                } else {
                    try {
                        // Reload relationships for SMS
                        $preOrder->load(['collectionDay', 'collectionBranch', 'items.product']);

                        $smsNotification = new PreOrderPaidGeezSMSNotification($preOrder);
                        $smsSent = $smsNotification->sendCustomerSMS();

                        if ($smsSent) {
                            Log::info('SMS sent to customer via GeezSMS on status update', [
                                'pre_order_id' => $preOrder->id,
                                'order_number' => $preOrder->order_number,
                                'phone' => $preOrder->phone_number
                            ]);
                        } else {
                            Log::warning('SMS sending failed via GeezSMS on status update', [
                                'pre_order_id' => $preOrder->id,
                                'order_number' => $preOrder->order_number
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('SMS notification exception on status update', [
                            'pre_order_id' => $preOrder->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }

            // If status changed to "Cancelled", send SMS notification
            if ($statusChangedToCancelled) {
                if (SmsSettings::isActive()) {
                    try {
                        $preOrder->load(['collectionDay', 'collectionBranch']);
                        $smsNotification = new PreOrderCancelledGeezSMSNotification($preOrder);
                        $smsSent = $smsNotification->sendCustomerSMS();
                        
                        if ($smsSent) {
                            Log::info('Cancellation SMS sent on update', [
                                'pre_order_id' => $preOrder->id,
                                'order_number' => $preOrder->order_number
                            ]);
                        } else {
                            Log::warning('Cancellation SMS failed to send on update', [
                                'pre_order_id' => $preOrder->id,
                                'order_number' => $preOrder->order_number
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Cancellation SMS exception on update', ['error' => $e->getMessage()]);
                    }
                }
            }

            return redirect()->route('pre-orders.index')
                ->with('success', "Pre-order {$preOrder->order_number} updated successfully.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to update pre-order: ' . $e->getMessage()]);
        }
    }

    public function destroy(PreOrder $preOrder): RedirectResponse
    {
        // Check if user can delete this order - requires explicit 'delete pre-orders' permission
        if (!auth()->user()->can('delete pre-orders')) {
            abort(403, 'You do not have permission to delete this order.');
        }

        $orderNumber = $preOrder->order_number;
        $preOrder->delete();

        return redirect()->route('pre-orders.index')
            ->with('success', "Pre-order {$orderNumber} deleted successfully.");
    }

    /**
     * Send bulk SMS reminders for pending orders
     */
    public function sendBulkSmsReminders(Request $request): RedirectResponse
    {
        // Check permission
        if (!auth()->user()->can('send bulk sms reminders')) {
            abort(403, 'You do not have permission to send bulk SMS reminders.');
        }

        // Check if SMS is active
        if (!SmsSettings::isActive()) {
            $smsSettings = SmsSettings::getInstance();
            return back()->withErrors(['error' => "SMS service is currently deactivated. Reason: {$smsSettings->deactivation_reason}"]);
        }

        $validated = $request->validate([
            'order_ids' => ['required', 'array', 'min:1'],
            'order_ids.*' => ['integer', 'exists:pre_orders,id'],
        ]);

        // Get pending orders with full relationships
        $pendingOrders = PreOrder::whereIn('id', $validated['order_ids'])
            ->where('status', 'Pending')
            ->with([
                'collectionDay:id,name',
                'collectionBranch:id,name',
                'items.product'
            ])
            ->get();

        if ($pendingOrders->isEmpty()) {
            return back()->withErrors(['error' => 'No pending orders found for SMS reminders.']);
        }

        $smsService = app(GeezSMSService::class);

        if (!$smsService->isConfigured()) {
            return back()->withErrors(['error' => 'GeezSMS service is not configured. Please check your SMS settings.']);
        }

        $successCount = 0;
        $failureCount = 0;
        $results = [];

        foreach ($pendingOrders as $order) {
            try {
                $message = $this->generateReminderMessage($order);
                $smsSent = $smsService->sendMessage($order->phone_number, $message);

                if ($smsSent) {
                    $successCount++;
                    $results[] = "✅ SMS sent to {$order->client_name} (Order: {$order->order_number})";
                    Log::info('SMS reminder sent successfully', [
                        'pre_order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'phone' => $order->phone_number
                    ]);
                } else {
                    $failureCount++;
                    $results[] = "❌ Failed to send SMS to {$order->client_name} (Order: {$order->order_number})";
                    Log::warning('SMS reminder failed', [
                        'pre_order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'phone' => $order->phone_number
                    ]);
                }
            } catch (\Exception $e) {
                $failureCount++;
                $results[] = "❌ Error sending SMS to {$order->client_name}: " . $e->getMessage();
                Log::error('SMS reminder exception', [
                    'pre_order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $summaryMessage = "Bulk SMS reminder completed: {$successCount} successful, {$failureCount} failed.";

        return back()
            ->with('success', $summaryMessage)
            ->with('sms_results', $results);
    }

    /**
     * Generate SMS reminder message for pending orders
     */
    private function generateReminderMessage(PreOrder $preOrder): string
    {
        $message = "KALDIS - Payment Reminder\n\n";
        $message .= "Order Number: {$preOrder->order_number}\n";
        $message .= "Dear {$preOrder->client_name},\n\n";
        $message .= "We noticed your order is still awaiting payment.\n\n";

        $message .= "Collection Details:\n";
        $message .= "- Day: {$preOrder->collectionDay->name}\n";
        $message .= "- Branch: {$preOrder->collectionBranch->name}\n\n";

        $message .= "Total Amount: {$preOrder->total_amount} ETB\n";
        $message .= "Items Ordered: " . count($preOrder->items) . "\n\n";

        $message .= "Kindly complete your payment at your earliest convenience.\n";
        $message .= "Thank you for choosing KALDIS!";

        return $message;
    }

    public function updateStatus(Request $request, PreOrder $preOrder): RedirectResponse
    {
        // Check if user can update status for this order - requires explicit permission
        $user = auth()->user();
        $canChangeAllStatus = $user->can('update all pre-order status') || $user->can('update pre-order status');
        $canMarkPaid = $user->can('mark pre-order as paid');
        $canCancel = $user->can('cancel pre-orders');

        if (!$canChangeAllStatus && !$canMarkPaid && !$canCancel) {
            abort(403, 'You do not have permission to update the status of this order.');
        }

        // Load the orderType relationship to check order type
        $preOrder->load('orderType');

        // Check if this is a Walkin Customer order - prevent status changes
        if ($preOrder->orderType->name === 'Walkin Customer') {
            return back()->withErrors([
                'status' => 'Cannot change status for Walkin Customer orders as they are already paid.',
            ]);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:Pending,Paid,Collected,Cancelled'],
        ]);

        // Perform specific transition checks if not authorized for all
        if (!$canChangeAllStatus && $validated['status'] !== $preOrder->status) {
            $msg = 'You do not have permission to change the order status to ' . $validated['status'];
            if ($validated['status'] === 'Paid') {
                if (!$canMarkPaid || $preOrder->status !== 'Pending') {
                    return back()->withErrors(['status' => $msg . ($preOrder->status !== 'Pending' ? ' from ' . $preOrder->status : '') . '.']);
                }
            } elseif ($validated['status'] === 'Cancelled') {
                if (!$canCancel) {
                    return back()->withErrors(['status' => $msg . '.']);
                }
            } else {
                // Trying to change to Pending or Collected without broad permission
                return back()->withErrors(['status' => $msg . '.']);
            }
        }

        $preOrder->update([
            'status' => $validated['status'],
            'updated_by' => auth()->id(),
        ]);

        // Generate Telegram message if status is changed to "Paid"
        $telegramMessage = null;
        $smsStatus = null;

        if ($validated['status'] === 'Paid') {
<<<<<<< HEAD
            // Reload relationships for message generation
            $preOrder->load(['collectionDay', 'collectionBranch', 'items.product']);
            $telegramMessage = $this->generateTelegramMessage($preOrder);

            // Send SMS notification to customer using GeezSMS
            try {
                $smsNotification = new PreOrderPaidGeezSMSNotification($preOrder);
                $smsSent = $smsNotification->sendCustomerSMS();

                if ($smsSent) {
                    $smsStatus = 'SMS notification sent to customer successfully via GeezSMS.';
                    Log::info('SMS sent to customer via GeezSMS', [
                        'pre_order_id' => $preOrder->id,
                        'order_number' => $preOrder->order_number,
                        'phone' => $preOrder->phone_number
                    ]);
                } else {
                    $smsStatus = 'SMS notification failed via GeezSMS. Please check GeezSMS configuration.';
                    Log::warning('SMS sending failed via GeezSMS', [
                        'pre_order_id' => $preOrder->id,
                        'order_number' => $preOrder->order_number,
                        'phone' => $preOrder->phone_number
                    ]);
=======
            // ... (Paid SMS logic remains same) ...
        } elseif ($validated['status'] === 'Cancelled') {
            // Send cancellation SMS
            if (SmsSettings::isActive()) {
                try {
                    $preOrder->load(['collectionDay', 'collectionBranch']);
                    $smsNotification = new PreOrderCancelledGeezSMSNotification($preOrder);
                    $smsSent = $smsNotification->sendCustomerSMS();
                    
                    if ($smsSent) {
                        $smsStatus = 'Cancellation SMS notification sent to customer.';
                        Log::info('Cancellation SMS sent via updateStatus', ['pre_order_id' => $preOrder->id]);
                    } else {
                        $smsStatus = 'Cancellation SMS notification failed.';
                    }
                } catch (\Exception $e) {
                    $smsStatus = 'Cancellation SMS error: ' . $e->getMessage();
>>>>>>> 23bea7ab10a80f0070f94ed7be963ea030be1506
                }
            }
        }

        return redirect()->back()
            ->with('success', 'Order status updated successfully.')
            ->with('telegram_message', $telegramMessage)
            ->with('sms_status', $smsStatus);
    }

    private function generateTelegramMessage(PreOrder $preOrder): string
    {
        $message = "📦 *ORDER CONFIRMATION - PAID*\n\n";
        $message .= "*Order Details:*\n";
        $message .= "Order #: *{$preOrder->order_number}*\n";
        $message .= "Client: {$preOrder->client_name}\n";
        $message .= "Phone: {$preOrder->phone_number}\n";
        $message .= "Status: ✅ PAID\n\n";

        $message .= "*Collection Information:*\n";
        $message .= "Day: {$preOrder->collectionDay->name}\n";
        $message .= "Collection Branch: {$preOrder->collectionBranch->name}\n\n";

        if ($preOrder->registering_branch) {
            $message .= "Registering Branch: {$preOrder->registering_branch->name}\n";
        }

        $message .= "*Order Items:*\n";
        foreach ($preOrder->items as $item) {
            $productName = $item->product ? $item->product->product_name : 'Product';
            $message .= "• {$productName} ({$item->quantity}x) - \${$item->subtotal}\n";
        }

        $message .= "\n*Total Amount: \{$preOrder->total_amount}ETB*\n";
        $message .= "_Thank you for your order! Please keep this message for your records._\n";
        $message .= "\n---";

        return $message;
    }

    /**
     * Export pre-orders to PDF or Excel (CSV)
     */
    public function export(Request $request)
    {
        // Check if user can view all pre-orders
        if (!auth()->user()->can('view all pre-orders')) {
            abort(403, 'You do not have permission to export pre-orders.');
        }

        $query = PreOrder::query()
            ->with([
                'orderType:id,name',
                'collectionDay:id,name',
                'collectionBranch:id,name',
                'registeringBranch:id,name',
                'items:id,pre_order_id,pre_order_product_id,quantity',
                'items.product:id,product_name',
            ]);

        // Apply filters
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($branchId = $request->query('branch_id')) {
            $query->where('collection_branch_id', $branchId);
        }

        if ($collectionDayId = $request->query('collection_day_id')) {
            $query->where('collection_day_id', $collectionDayId);
        }

        if ($orderTypeId = $request->query('order_type_id')) {
            $query->where('order_type_id', $orderTypeId);
        }

        // Sorting
        $sortField = $request->query('sort', 'created_at');
        $sortDirection = $request->query('direction', 'desc');

        $allowedSorts = ['id', 'order_number', 'client_name', 'phone_number', 'status', 'total_amount', 'created_at'];
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

        // Default to PDF
        // Get branch name for title
        $branchName = 'All Branches';
        if ($branchId = $request->query('branch_id')) {
            $branch = Branch::find($branchId);
            $branchName = $branch ? $branch->name : 'Unknown Branch';
        }

        // Calculate totals
        $totalAmount = $orders->sum('total_amount');
        $totalOrders = $orders->count();

        // Generate PDF
        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.branch-orders', [
            'orders' => $orders,
            'branchName' => $branchName,
            'totalAmount' => $totalAmount,
            'totalOrders' => $totalOrders,
            'exportDate' => now()->format('F d, Y h:i A'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('pre-orders-' . now()->format('Y-m-d-His') . '.pdf');
    }

    private function exportCsv($orders)
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="pre-orders-' . date('Y-m-d-His') . '.csv"',
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
                'Client Name',
                'Phone Number',
                'Order Type',
                'Collection Day',
                'Collection Branch',
                'Total Amount',
                'Notes',
                'Date Created'
            ]);

            // Data rows
            foreach ($orders as $order) {
                $products = $order->items->map(function ($item) {
                    return ($item->product->product_name ?? 'Unknown') . " (" . $item->quantity . ")";
                })->implode(', ');

                fputcsv($out, [
                    $order->order_number,
                    $order->client_name,
                    $order->phone_number,
                    $order->orderType->name ?? '-',
                    $order->collectionBranch->name ?? '-',
                    $order->registeringBranch->name ?? '-',
                    $order->collectionDay->name ?? '-',
                    $products,
                    $order->status,
                    $order->total_amount,
                    $order->notes ?? '',
                    $order->created_at->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    private function generateOrderNumber(): string
    {
        $date = now()->format('Ymd');
        $prefix = "PRE-{$date}-";

        // Get the last order number for today
        $lastOrder = PreOrder::where('order_number', 'like', "{$prefix}%")
            ->orderByDesc('order_number')
            ->first();

        if ($lastOrder) {
            // Extract the sequence number and increment
            $lastSequence = (int) substr($lastOrder->order_number, -4);
            $newSequence = $lastSequence + 1;
        } else {
            $newSequence = 1;
        }

        return $prefix . str_pad($newSequence, 4, '0', STR_PAD_LEFT);
    }
}
