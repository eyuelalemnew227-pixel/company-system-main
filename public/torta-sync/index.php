<?php
require_once 'config.php';

try {
    $srcDB = getDB(SRC_DB_HOST, SRC_DB_NAME, SRC_DB_USER, SRC_DB_PASS);
    $destDB = getDB(DEST_DB_HOST, DEST_DB_NAME, DEST_DB_USER, DEST_DB_PASS);

    // Fetch source orders
    $orders = $srcDB->query("
        SELECT o.*, c.first_name, c.last_name, b.name as branch_name 
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN branches b ON o.branch_id = b.id
        ORDER BY o.created_at DESC
    ")->fetchAll();

    // Get synced order IDs from destination
    // We check for both legacy 'TOR-%' order numbers and new '[SID:%]' tags in transaction_reference
    $syncedData = $destDB->query("
        SELECT order_number, transaction_reference 
        FROM pre_orders 
        WHERE order_number LIKE 'TOR-%' 
        OR transaction_reference LIKE '%[SID:%'
    ")->fetchAll();

    $syncedIds = [];
    foreach ($syncedData as $row) {
        // Handle legacy TOR-ID
        if (strpos($row['order_number'], 'TOR-') === 0) {
            $syncedIds[] = str_replace('TOR-', '', $row['order_number']);
        }
        // Handle new [SID:XX] tag
        if (preg_match('/\[SID:(\d+)\]/', $row['transaction_reference'], $matches)) {
            $syncedIds[] = $matches[1];
        }
    }
    $syncedIds = array_unique($syncedIds);

    // Fetch all order items from source or fetch per order (fetching all is more efficient)
    $orderIds = array_column($orders, 'id');
    $itemsByOrder = [];
    if (!empty($orderIds)) {
        $idsList = implode(',', $orderIds);
        $items = $srcDB->query("
            SELECT oi.*, p.name as product_name 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id IN ($idsList)
        ")->fetchAll();
        
        foreach ($items as $item) {
            $itemsByOrder[$item['order_id']][] = $item;
        }
    }

} catch (Exception $e) {
    $error = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kaldis Torta Orders Sync</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Outfit', sans-serif; }
        .glass {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .animate-spin-slow {
            animation: spin 3s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen p-0 m-0">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-50 shadow-sm">
        <div class="flex items-center justify-between max-w-[1600px] mx-auto">
            <div class="flex items-center gap-4">
                <div class="p-2 bg-amber-500 rounded-xl shadow-md">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
                <div>
                    
                    <div id="statusBadge" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse"></span>
                        Ready to Sync
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-6">
                <!-- Mini Results -->
                <div id="results" class="hidden flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="flex items-center gap-2">
                        <span class="text-[9px] font-bold text-emerald-600 uppercase">Synced:</span>
                        <span id="syncedCount" class="text-xs font-black text-emerald-700">0</span>
                    </div>
                    <div class="w-px h-3 bg-slate-300"></div>
                    <div class="flex items-center gap-2">
                        <span class="text-[9px] font-bold text-amber-600 uppercase">Skipped:</span>
                        <span id="skippedCount" class="text-xs font-black text-amber-700">0</span>
                    </div>
                </div>

                <button id="syncBtn" onclick="runSync()" class="group px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center gap-3">
                    <svg id="syncIcon" class="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span id="btnText">REFRESH ORDERS</span>
                </button>
            </div>
        </div>
    </header>

    <main class="p-8 max-w-[1600px] mx-auto">
        <?php if (isset($error)): ?>
            <div class="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-bold flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Products</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                            <th class="py-4 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Branch</th>
                            <th class="py-4 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th class="py-4 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payment</th>
                            <th class="py-4 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pickup</th>
                            <th class="py-4 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Source</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        <?php foreach ($orders as $order): ?>
                            <?php 
                                $isSynced = in_array((string)$order['id'], $syncedIds); 
                                $orderItems = $itemsByOrder[$order['id']] ?? [];
                                $statusClasses = [
                                    'pending' => 'bg-amber-100 text-amber-700',
                                    'confirmed' => 'bg-emerald-100 text-emerald-700',
                                    'completed' => 'bg-blue-100 text-blue-700',
                                    'cancelled' => 'bg-rose-100 text-rose-700'
                                ];
                                $statusClass = $statusClasses[$order['status']] ?? 'bg-slate-100 text-slate-700';
                                $displayStatus = ($order['status'] === 'confirmed') ? 'Paid' : ucfirst($order['status']);
                            ?>
                            <tr class="group hover:bg-slate-50/80 transition-all <?php echo $isSynced ? 'opacity-40 grayscale-[0.5]' : ''; ?>">
                                <td class="py-5 px-6 font-bold text-slate-400 text-xs">#<?php echo $order['id']; ?></td>
                                <td class="py-5 px-6">
                                    <div class="font-black text-slate-800 text-sm <?php echo $isSynced ? 'line-through decoration-slate-400' : ''; ?>">
                                        <?php echo htmlspecialchars($order['first_name'] . ' ' . $order['last_name']); ?>
                                    </div>
                                    <div class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter"><?php echo date('M d, Y • h:i A', strtotime($order['created_at'])); ?></div>
                                </td>
                                <td class="py-5 px-6">
                                    <div class="flex flex-col gap-1.5">
                                        <?php foreach ($orderItems as $item): ?>
                                            <div class="flex items-center gap-2">
                                                <span class="px-1.5 py-0.5 bg-slate-100 text-slate-900 rounded font-black text-[10px] border border-slate-200"><?php echo $item['quantity']; ?>x</span>
                                                <span class="text-[11px] font-bold text-slate-600 <?php echo $isSynced ? 'line-through' : ''; ?>">
                                                    <?php echo htmlspecialchars($item['product_name']); ?>
                                                </span>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </td>
                                <td class="py-5 px-6 font-bold text-slate-500 text-xs tracking-tight"><?php echo htmlspecialchars($order['phone']); ?></td>
                                <td class="py-5 px-1 text-center font-bold text-slate-500 text-[10px] uppercase"><?php echo htmlspecialchars(explode(' ', $order['branch_name'])[0]); ?></td>
                                <td class="py-5 px-1 text-center">
                                    <span class="inline-block px-2 py-1 rounded-lg font-black uppercase text-[10px] tracking-tighter <?php echo $isSynced ? 'bg-slate-100 text-slate-400' : $statusClass; ?>">
                                        <?php echo $displayStatus; ?>
                                    </span>
                                </td>
                                <td class="py-5 px-1 text-center font-bold text-slate-400 text-[10px] uppercase"><?php echo htmlspecialchars($order['payment_method']); ?></td>
                                <td class="py-5 px-1 text-center">
                                    <div class="text-[11px] font-black text-slate-700"><?php echo date('M d', strtotime($order['pickup_date'])); ?></div>
                                    <div class="text-[9px] font-bold text-slate-400 uppercase"><?php echo date('D', strtotime($order['pickup_date'])); ?></div>
                                </td>
                                <td class="py-5 px-1 text-center">
                                    <span class="text-[9px] font-black text-slate-400 uppercase italic opacity-60"><?php echo htmlspecialchars($order['hear_about'] ?: '-'); ?></span>
                                </td>
                                <td class="py-5 px-6 text-right">
                                    <div class="font-black text-slate-900 text-sm <?php echo $isSynced ? 'line-through decoration-slate-400 text-slate-400' : ''; ?>">
                                        ETB <?php echo number_format($order['total_amount'], 0); ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        

    </main>

    <script>
        async function runSync() {
            const btn = document.getElementById('syncBtn');
            const btnText = document.getElementById('btnText');
            const syncIcon = document.getElementById('syncIcon');
            const statusBadge = document.getElementById('statusBadge');
            const results = document.getElementById('results');

            btn.disabled = true;
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            syncIcon.classList.add('animate-spin');
            btnText.innerText = 'SYNCING...';
            
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> PROCESSING DATABASE...';
            statusBadge.className = 'text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5';

            try {
                const response = await fetch('sync.php');
                const data = await response.json();

                results.classList.remove('hidden');

                if (data.status === 'success') {
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> SYNC SUCCESSFUL';
                    statusBadge.className = 'text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5';
                    
                    document.getElementById('syncedCount').innerText = data.details.synced;
                    document.getElementById('skippedCount').innerText = data.details.skipped;
                    
                    // Reload page to show strikethroughs
                    if (data.details.synced > 0) {
                        setTimeout(() => window.location.reload(), 2000);
                    }
                } else {
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> SYNC FAILED';
                    statusBadge.className = 'text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5';
                    alert('Sync Error: ' + data.message);
                }
            } catch (error) {
                statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> CONNECTION ERROR';
                statusBadge.className = 'text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5';
                alert('Connection error: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
                syncIcon.classList.remove('animate-spin');
                btnText.innerText = 'REFRESH ORDERS';
            }
        }
    </script>
</body>
</html>
