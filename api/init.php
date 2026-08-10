<?php
/**
 * ============================================================
 * API Initialization - ملف التهيئة المشترك
 * يُضمّن في كل ملف PHP في مجلد api/
 * ============================================================
 */

session_start();

// ─── CORS Headers ───
header('Content-Type: application/json; charset=utf-8');

// Fix CORS: allow credentials with dynamic origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Security: Prevent direct access to JSON files ───
$jsonFiles = ['users.json', 'products.json', 'orders.json', 'settings.json'];
if (in_array(basename($_SERVER['PHP_SELF']), $jsonFiles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit;
}

// ─── Paths ───
define('DATA_DIR', __DIR__ . '/');
define('USERS_FILE', DATA_DIR . 'users.json');
define('PRODUCTS_FILE', DATA_DIR . 'products.json');
define('ORDERS_FILE', DATA_DIR . 'orders.json');
define('SETTINGS_FILE', DATA_DIR . 'settings.json');

// ─── Helper: Read JSON ───
function readJson($file) {
    if (!file_exists($file)) return null;
    $content = file_get_contents($file);
    if (empty($content)) return null;
    $data = json_decode($content, true);
    return $data ?: null;
}

// ─── Helper: Write JSON ───
function writeJson($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false;
}

// ─── Helper: Success Response ───
function success($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// ─── Helper: Error Response ───
function error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// ─── Helper: Generate ID ───
function generateId($prefix = 'id') {
    return $prefix . '_' . time() . '_' . substr(uniqid(), -4);
}

// ─── Initialize Data Files if not exist ───
// NOTE: No default products/orders - creates empty files only
function initDataFiles() {
    // Empty products structure
    $emptyProducts = [
        'products' => [],
        'meta' => [
            'version' => '1.0',
            'last_updated' => date('c'),
            'total_count' => 0
        ]
    ];

    // Empty orders structure
    $emptyOrders = [
        'orders' => [],
        'meta' => [
            'version' => '1.0',
            'last_updated' => date('c'),
            'total_count' => 0,
            'next_id' => 1001
        ]
    ];

    // Default settings (store config only)
    $defaultSettings = [
        'settings' => [
            'store_name' => 'Shop Store',
            'store_currency' => 'SAR',
            'telegram_bot' => '',
            'contact_phone' => '',
            'contact_email' => ''
        ],
        'meta' => [
            'version' => '1.0',
            'last_updated' => date('c')
        ]
    ];

    // Create files ONLY if they don't exist - never overwrite existing data
    if (!file_exists(PRODUCTS_FILE)) {
        writeJson(PRODUCTS_FILE, $emptyProducts);
        chmod(PRODUCTS_FILE, 0644);
    }

    if (!file_exists(ORDERS_FILE)) {
        writeJson(ORDERS_FILE, $emptyOrders);
        chmod(ORDERS_FILE, 0644);
    }

    if (!file_exists(SETTINGS_FILE)) {
        writeJson(SETTINGS_FILE, $defaultSettings);
        chmod(SETTINGS_FILE, 0644);
    }
}

// ─── Auto-initialize on first load ───
initDataFiles();
