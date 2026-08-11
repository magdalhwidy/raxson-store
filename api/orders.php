<?php
/**
 * ============================================================
 * Orders API - CRUD للطلبات (Professional)
 * ============================================================
 * الأمان: يقبل فقط الطلبات التي تم دفعها (payment_status: paid)
 * ============================================================
 */

require_once __DIR__ . '/init.php';

// ─── Load Orders Data ───
function loadOrdersData() {
    $data = readJson(ORDERS_FILE);
    if (!$data) {
        return ['orders' => [], 'meta' => ['version' => '2.0', 'last_updated' => date('c'), 'total_count' => 0, 'next_id' => 1001]];
    }
    return $data;
}

// ─── Save Orders Data ───
function saveOrdersData($data) {
    $data['meta']['last_updated'] = date('c');
    $data['meta']['total_count'] = count($data['orders']);
    return writeJson(ORDERS_FILE, $data);
}

// ─── Load Products Data ───
function loadProductsData() {
    $data = readJson(PRODUCTS_FILE);
    if (!$data) return ['products' => []];
    return $data;
}

// ─── Generate Order ID ───
function generateOrderId(&$meta) {
    $nextId = $meta['next_id'] ?? 1001;
    $meta['next_id'] = $nextId + 1;
    return 'ORD-' . $nextId;
}

// ─── GET: Read Orders ───
function handleGet() {
    $data = loadOrdersData();
    $orders = $data['orders'];

    usort($orders, function($a, $b) {
        return strtotime($b['created_at'] ?? 'now') - strtotime($a['created_at'] ?? 'now');
    });

    if (isset($_GET['status']) && $_GET['status'] !== 'all') {
        $orders = array_values(array_filter($orders, function($o) {
            return ($o['status'] ?? 'pending') === $_GET['status'];
        }));
    }

    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $search = strtolower($_GET['search']);
        $orders = array_values(array_filter($orders, function($o) use ($search) {
            $idMatch = strpos(strtolower($o['id'] ?? ''), $search) !== false;
            $phoneMatch = strpos(strtolower($o['customer']['phone'] ?? ''), $search) !== false;
            return $idMatch || $phoneMatch;
        }));
    }

    if (isset($_GET['id'])) {
        $order = array_values(array_filter($orders, function($o) {
            return $o['id'] === $_GET['id'];
        }));
        if (empty($order)) error('Order not found', 404);
        success(['order' => $order[0]]);
    }

    if (isset($_GET['stats'])) {
        $total = count($orders);
        $totalSales = array_reduce($orders, function($sum, $o) { return $sum + ($o['total'] ?? 0); }, 0);
        $pending = count(array_filter($orders, function($o) { return ($o['status'] ?? 'pending') === 'pending'; }));
        $completed = count(array_filter($orders, function($o) { return ($o['status'] ?? '') === 'completed'; }));
        $paid = count(array_filter($orders, function($o) { return ($o['payment_status'] ?? '') === 'paid'; }));
        $unpaid = count(array_filter($orders, function($o) { return ($o['payment_status'] ?? '') !== 'paid'; }));
        $uniqueCustomers = count(array_unique(array_map(function($o) { return $o['customer']['phone'] ?? ''; }, $orders)));

        $days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        $today = new DateTime();
        $dailySales = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = clone $today;
            $date->modify("-$i days");
            $dayName = $days[intval($date->format('w'))];
            $dailySales[$dayName] = 0;
        }

        foreach ($orders as $order) {
            $orderDate = new DateTime($order['created_at'] ?? 'now');
            $diff = $today->diff($orderDate)->days;
            if ($diff >= 0 && $diff < 7) {
                $dayName = $days[intval($orderDate->format('w'))];
                if (isset($dailySales[$dayName])) {
                    $dailySales[$dayName] += $order['total'] ?? 0;
                }
            }
        }

        success([
            'stats' => [
                'totalOrders' => $total,
                'totalSales' => round($totalSales, 2),
                'pending' => $pending,
                'completed' => $completed,
                'paid' => $paid,
                'unpaid' => $unpaid,
                'customers' => $uniqueCustomers,
                'dailySales' => $dailySales
            ]
        ]);
    }

    if (isset($_GET['recent'])) {
        $limit = intval($_GET['recent']);
        $orders = array_slice($orders, 0, $limit);
    }

    success(['orders' => $orders, 'count' => count($orders)]);
}

// ─── POST: Create Order (PROFESSIONAL - Only accepts paid orders) ───
function handlePost() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        error('Invalid JSON data', 400);
    }

    // ─── SECURITY: Only accept orders with payment_status = paid ───
    $paymentStatus = $input['payment_status'] ?? 'pending';
    if ($paymentStatus !== 'paid') {
        error('Payment required: Order must be paid before submission', 403);
    }

    // ─── SECURITY: Validate payment_method exists ───
    if (empty($input['payment_method'])) {
        error('Payment method required', 400);
    }

    // ─── SECURITY: Validate paid_at timestamp ───
    if (empty($input['paid_at'])) {
        error('Payment timestamp required', 400);
    }

    if (empty($input['customer']['phone'])) {
        error('Customer phone is required', 400);
    }

    if (empty($input['items']) || !is_array($input['items'])) {
        error('Order items are required', 400);
    }

    $ordersData = loadOrdersData();
    $productsData = loadProductsData();

    // Calculate total and validate stock
    $total = 0;
    $validatedItems = [];

    foreach ($input['items'] as $item) {
        $productId = $item['id'] ?? null;
        $quantity = intval($item['quantity'] ?? 1);

        if (!$productId) continue;

        $product = null;
        $productIndex = -1;
        foreach ($productsData['products'] as $idx => $p) {
            if ($p['id'] === $productId) {
                $product = $p;
                $productIndex = $idx;
                break;
            }
        }

        if (!$product) {
            error('Product not found: ' . $productId, 400);
        }

        if ($product['stock'] < $quantity) {
            error('Insufficient stock for: ' . $product['name'], 400);
        }

        $itemTotal = $product['price'] * $quantity;
        $total += $itemTotal;

        $validatedItems[] = [
            'id' => $productId,
            'name' => $product['name'],
            'price' => $product['price'],
            'quantity' => $quantity,
            'total' => round($itemTotal, 2)
        ];

        if ($productIndex !== -1) {
            $productsData['products'][$productIndex]['stock'] -= $quantity;
            $productsData['products'][$productIndex]['updated_at'] = date('c');
        }
    }

    writeJson(PRODUCTS_FILE, $productsData);

    $orderId = generateOrderId($ordersData['meta']);

    // ─── PROFESSIONAL: Full order with payment verification ───
    $newOrder = [
        'id' => $orderId,
        'customer_id' => $input['customer_id'] ?? null,
        'customer' => [
            'phone' => $input['customer']['phone'],
            'telegram' => $input['customer']['telegram'] ?? '',
        ],
        'items' => $validatedItems,
        'total' => round($total, 2),
        'status' => 'pending',
        'payment_status' => 'paid',              // ← VERIFIED
        'payment_method' => $input['payment_method'] ?? 'card',
        'paid_at' => $input['paid_at'],          // ← VERIFIED
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];

    $ordersData['orders'][] = $newOrder;
    saveOrdersData($ordersData);

    success([
        'order' => $newOrder,
        'message' => 'Order created successfully - Payment verified'
    ]);
}

// ─── PUT: Update Order ───
function handlePut() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || empty($input['id'])) {
        error('Order ID is required', 400);
    }

    $data = loadOrdersData();
    $found = false;

    foreach ($data['orders'] as &$order) {
        if ($order['id'] === $input['id']) {
            $found = true;

            if (isset($input['status'])) {
                $validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
                if (in_array($input['status'], $validStatuses)) {
                    $order['status'] = $input['status'];
                }
            }

            if (isset($input['payment_status'])) {
                $order['payment_status'] = $input['payment_status'];
            }

            $order['updated_at'] = date('c');
            break;
        }
    }

    if (!$found) {
        error('Order not found', 404);
    }

    saveOrdersData($data);

    $updated = array_values(array_filter($data['orders'], function($o) use ($input) {
        return $o['id'] === $input['id'];
    }));

    success(['order' => $updated[0], 'message' => 'Order updated successfully']);
}

// ─── DELETE: Delete Order ───
function handleDelete() {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? null;

    if (!$id) {
        error('Order ID is required', 400);
    }

    $data = loadOrdersData();
    $originalCount = count($data['orders']);

    $data['orders'] = array_values(array_filter($data['orders'], function($o) use ($id) {
        return $o['id'] !== $id;
    }));

    if (count($data['orders']) === $originalCount) {
        error('Order not found', 404);
    }

    saveOrdersData($data);
    success(['message' => 'Order deleted successfully']);
}

// ─── Route Request ───
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet();
        break;
    case 'POST':
        handlePost();
        break;
    case 'PUT':
        handlePut();
        break;
    case 'DELETE':
        handleDelete();
        break;
    default:
        error('Method not allowed', 405);
}