<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $srcDB = getDB(SRC_DB_HOST, SRC_DB_NAME, SRC_DB_USER, SRC_DB_PASS);
    $destDB = getDB(DEST_DB_HOST, DEST_DB_NAME, DEST_DB_USER, DEST_DB_PASS);

    // 1. Fetch reference data from destination
    $destBranches = $destDB->query("SELECT id, name FROM branches")->fetchAll();
    $destProducts = $destDB->query("SELECT id, product_name as name, unit_price FROM pre_order_products")->fetchAll();
    $destOrderTypes = $destDB->query("SELECT id, name FROM order_types")->fetchAll();
    $destDays = $destDB->query("SELECT id, name FROM collection_days")->fetchAll();

    // 2. Identify "Regular" order type for synced orders
    // We prefer "Regular Order" or similar, fallback to first if not found
    $targetTypeId = 1;
    foreach ($destOrderTypes as $type) {
        if (stripos($type['name'], 'Regular') !== false) {
            $targetTypeId = $type['id'];
            break;
        }
    }

    // 3. Fetch all orders from source
    $srcOrders = $srcDB->query("
        SELECT o.*, c.first_name, c.last_name, b.name as branch_name 
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
        $orderNumber = ORDER_NUMBER_PREFIX . $order['id'];
        
        // Check if already synced
        $exists = $destDB->prepare("SELECT id FROM pre_orders WHERE order_number = ?");
        $exists->execute([$orderNumber]);
        if ($exists->fetch()) {
            $stats['skipped']++;
            continue;
        }

        try {
            $destDB->beginTransaction();

            // Map Status
            $statusMap = [
                'pending' => 'Pending',
                'confirmed' => 'Paid',
                'completed' => 'Collected',
                'cancelled' => 'Cancelled'
            ];
            $destStatus = $statusMap[$order['status']] ?? 'Pending';

            // Map Branch
            $destBranchId = null;
            foreach ($destBranches as $b) {
                if (strcasecmp($b['name'], $order['branch_name']) === 0) {
                    $destBranchId = $b['id'];
                    break;
                }
            }
            if (!$destBranchId) $destBranchId = 1; // Fallback to first branch

            // Map Collection Day (based on pickup_date)
            $dayName = date('l', strtotime($order['pickup_date']));
            $destDayId = null;
            foreach ($destDays as $d) {
                if (strcasecmp($d['name'], $dayName) === 0) {
                    $destDayId = $d['id'];
                    break;
                }
            }
            if (!$destDayId) $destDayId = 1; // Fallback

            // Insert Pre-Order
            $stmt = $destDB->prepare("
                INSERT INTO pre_orders (
                    order_number, client_name, phone_number, order_type_id, 
                    collection_day_id, collection_branch_id, status, total_amount, 
                    transaction_reference, notes, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $clientName = trim($order['first_name'] . ' ' . $order['last_name']);
            if (empty($clientName)) $clientName = $order['username'] ?: 'Customer';

            $notes = $order['notes'];
            if (!empty($order['payment_method'])) {
                $notes = "Payment Method: " . $order['payment_method'] . ($notes ? "\n" . $notes : "");
            }

            $stmt->execute([
                $orderNumber,
                $clientName,
                $order['phone'],
                $targetTypeId,
                $destDayId,
                $destBranchId,
                $destStatus,
                $order['total_amount'],
                $order['payment_slip'], // Map payment slip URL to transaction reference
                $notes,
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
            $srcItems->execute([$order['id']]);
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
            $stats['errors'][] = "Order #{$order['id']}: " . $e->getMessage();
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
