<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $srcDB = getDB(SRC_DB_HOST, SRC_DB_NAME, SRC_DB_USER, SRC_DB_PASS);
    $destDB = getDB(DEST_DB_HOST, DEST_DB_NAME, DEST_DB_USER, DEST_DB_PASS);

    // 1. Fetch reference data from destination
    $destBranches = $destDB->query("SELECT id, branch_code FROM branches WHERE branch_code IS NOT NULL")->fetchAll();
    $destProducts = $destDB->query("SELECT id, product_name as name, unit_price FROM pre_order_products")->fetchAll();
    $destOrderTypes = $destDB->query("SELECT id, name FROM order_types")->fetchAll();

    // 3. Helper functions
    function generateRandomOrderNumber($destDB) {
        do {
            $letters = chr(rand(65, 90)) . chr(rand(65, 90));
            $numbers = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $orderNumber = $letters . $numbers;
            
            $stmt = $destDB->prepare("SELECT id FROM pre_orders WHERE order_number = ?");
            $stmt->execute([$orderNumber]);
        } while ($stmt->fetch());
        return $orderNumber;
    }

    // 4. Fetch all orders from source
    $srcOrders = $srcDB->query("
        SELECT o.*, c.first_name, c.last_name, b.branch_code 
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN branches b ON o.branch_id = b.id
    ")->fetchAll();

    $stats = [
        'total' => count($srcOrders),
        'synced' => 0,
        'skipped' => 0,
        'errors' => []
    ];

    foreach ($srcOrders as $order) {
        $sourceId = $order['id'];
        $legacyOrderNumber = 'TOR-' . $sourceId;
        $sidTag = "[SID:$sourceId]";
        
        // Check if already synced (Legacy TOR-ID or New [SID:XX])
        $exists = $destDB->prepare("
            SELECT id FROM pre_orders 
            WHERE order_number = ? 
            OR transaction_reference LIKE ?
        ");
        $exists->execute([$legacyOrderNumber, "%$sidTag%"]);
        if ($exists->fetch()) {
            $stats['skipped']++;
            continue;
        }

        try {
            $destDB->beginTransaction();

            // Generate new randomized order number
            $orderNumber = generateRandomOrderNumber($destDB);

            // Map Status
            $statusMap = [
                'pending' => 'Pending',
                'confirmed' => 'Paid',
                'completed' => 'Collected',
                'cancelled' => 'Cancelled'
            ];
            $destStatus = $statusMap[$order['status']] ?? 'Pending';

            // Map Branch by branch_code
            $destBranchId = null;
            if (!empty($order['branch_code'])) {
                foreach ($destBranches as $b) {
                    if ($b['branch_code'] === $order['branch_code']) {
                        $destBranchId = $b['id'];
                        break;
                    }
                }
            }
            if (!$destBranchId) $destBranchId = 1; // Fallback to first branch

            // Map Collection Day (Fixed Dates: Jan 06 -> 1, Jan 07 -> 2, Jan 08 -> 3)
            $pickupDate = date('Y-m-d', strtotime($order['pickup_date']));
            $destDayId = 1; // Default
            if ($pickupDate === '2026-01-06') $destDayId = 1;
            elseif ($pickupDate === '2026-01-07') $destDayId = 2;
            elseif ($pickupDate === '2026-01-08') $destDayId = 3;

            // Map Payment Method
            $srcPaymentMethod = $order['payment_method'];
            $destPaymentMethod = ($srcPaymentMethod === 'Telebirr') ? 'Tele Birr' : $srcPaymentMethod;

            // Prepare Transaction Reference with Sync ID tag
            $transRef = $sidTag;
            if (!empty($order['payment_slip'])) {
                $transRef .= " " . $order['payment_slip'];
            }

            // Insert Pre-Order
            $stmt = $destDB->prepare("
                INSERT INTO pre_orders (
                    order_number, client_name, phone_number, order_type_id, 
                    collection_day_id, collection_branch_id, status, total_amount, 
                    payment_method, transaction_reference, created_by, updated_by, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $clientName = trim($order['first_name'] . ' ' . $order['last_name']);
            if (empty($clientName)) $clientName = $order['username'] ?: 'Customer';

            // Normalize phone number (remove leading 0 or +251, then prepend +251)
            $phone = preg_replace('/[^0-9]/', '', $order['phone']);
            if (str_starts_with($phone, '251')) {
                $phone = substr($phone, 3);
            } elseif (str_starts_with($phone, '0')) {
                $phone = substr($phone, 1);
            }
            $normalizedPhone = '+251' . $phone;

            // Determine Order Type ID based on Source (hear_about)
            $orderSource = strtolower(trim($order['hear_about'] ?? ''));
            $targetTypeId = ($orderSource === 'sms') ? 1 : 3;

            $stmt->execute([
                $orderNumber,
                $clientName,
                $normalizedPhone,
                $targetTypeId,
                $destDayId,
                $destBranchId,
                $destStatus,
                $order['total_amount'],
                $destPaymentMethod,
                $transRef,
                SYNC_USER_ID,
                SYNC_USER_ID,
                $order['created_at'],
                $order['updated_at']
            ]);

            $preOrderId = $destDB->lastInsertId();

            // Fetch and Insert Items
            $srcItems = $srcDB->prepare("
                SELECT oi.*, p.name as product_name 
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            ");
            $srcItems->execute([$sourceId]);
            $items = $srcItems->fetchAll();

            foreach ($items as $item) {
                $destProdId = null;
                foreach ($destProducts as $p) {
                    if (strcasecmp($p['name'], $item['product_name']) === 0) {
                        $destProdId = $p['id'];
                        break;
                    }
                }

                if ($destProdId) {
                    $stmtItem = $destDB->prepare("
                        INSERT INTO pre_order_items (
                            pre_order_id, pre_order_product_id, quantity, 
                            unit_price, subtotal, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmtItem->execute([
                        $preOrderId,
                        $destProdId,
                        $item['quantity'],
                        $item['price'],
                        $item['quantity'] * $item['price'],
                        $item['created_at'],
                        $item['updated_at']
                    ]);
                }
            }

            $destDB->commit();
            $stats['synced']++;

        } catch (Exception $e) {
            $destDB->rollBack();
            $stats['errors'][] = "Order #$sourceId: " . $e->getMessage();
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => "Sync completed: {$stats['synced']} synced, {$stats['skipped']} skipped.",
        'details' => $stats
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
