<?php
/**
 * ============================================================
 * Products API - CRUD للمنتجات
 * Methods: GET / POST / PUT / DELETE
 * ============================================================
 */

require_once __DIR__ . '/init.php';

// ─── Configuration ───
define('MAX_IMAGE_SIZE', 2 * 1024 * 1024); // 500KB max for base64 images
define('UPLOADS_DIR', __DIR__ . '/uploads/');

// ─── Ensure uploads directory exists ───
if (!is_dir(UPLOADS_DIR)) {
    mkdir(UPLOADS_DIR, 0755, true);
}

// ─── Load Products Data ───
function loadProductsData() {
    $data = readJson(PRODUCTS_FILE);

    // If file doesn't exist or is empty, create default
    if (!$data) {
        error_log('[Products API] products.json not found or empty, creating default');
        $default = [
            'products' => [],
            'meta' => [
                'version' => '1.0',
                'last_updated' => date('c'),
                'total_count' => 0
            ]
        ];
        saveProductsData($default);
        return $default;
    }

    // Validate structure
    if (!isset($data['products']) || !is_array($data['products'])) {
        error_log('[Products API] products.json has invalid structure, fixing');
        $data['products'] = [];
    }
    if (!isset($data['meta']) || !is_array($data['meta'])) {
        $data['meta'] = ['version' => '1.0', 'last_updated' => date('c'), 'total_count' => 0];
    }

    // Fix total_count mismatch
    $actualCount = count($data['products']);
    if (($data['meta']['total_count'] ?? 0) !== $actualCount) {
        error_log("[Products API] total_count mismatch: meta says " . ($data['meta']['total_count'] ?? 'N/A') . ", actual: $actualCount");
        $data['meta']['total_count'] = $actualCount;
        saveProductsData($data);
    }

    return $data;
}

// ─── Save Products Data ───
function saveProductsData($data) {
    $data['meta']['last_updated'] = date('c');
    $data['meta']['total_count'] = count($data['products']);

    $result = writeJson(PRODUCTS_FILE, $data);

    if (!$result) {
        error_log('[Products API] FAILED to write products.json to: ' . PRODUCTS_FILE);
        return false;
    }

    return true;
}

// ─── Helper: Save image to file instead of base64 ───
function saveImageToFile($base64Image, $productId) {
    if (!$base64Image || substr($base64Image, 0, 10) !== 'data:image') {
        return $base64Image; // Return as-is if not base64 image
    }

    // Extract image data
    $parts = explode(',', $base64Image, 2);
    if (count($parts) !== 2) return $base64Image;

    $header = $parts[0];
    $data = base64_decode($parts[1]);

    if ($data === false) return $base64Image;

    // Determine extension
    $ext = 'png';
    if (strpos($header, 'jpeg') !== false || strpos($header, 'jpg') !== false) $ext = 'jpg';
    elseif (strpos($header, 'gif') !== false) $ext = 'gif';
    elseif (strpos($header, 'webp') !== false) $ext = 'webp';

    $filename = $productId . '_' . time() . '.' . $ext;
    $filepath = UPLOADS_DIR . $filename;

    if (file_put_contents($filepath, $data) !== false) {
        return '/api/uploads/' . $filename;
    }

    return $base64Image; // Fallback to base64 if file save fails
}

// ─── Helper: Get image for response ───
function getImageForResponse($imagePath) {
    if (!$imagePath) return null;

    // If it's already a URL/path, return as-is
    if (substr($imagePath, 0, 4) === 'http' || substr($imagePath, 0, 1) === '/') {
        return $imagePath;
    }

    // If it's base64, return as-is
    if (substr($imagePath, 0, 10) === 'data:image') {
        return $imagePath;
    }

    return $imagePath;
}

// ─── GET: Read Products ───
function handleGet() {
    $data = loadProductsData();
    $products = $data['products'];

    error_log('[Products API] GET - Loaded ' . count($products) . ' products');

    // Filter by category
    if (isset($_GET['category']) && $_GET['category'] !== 'all') {
        $products = array_values(array_filter($products, function($p) {
            return $p['category'] === $_GET['category'];
        }));
    }

    // Filter by bestseller
    if (isset($_GET['bestseller']) && $_GET['bestseller'] === '1') {
        $products = array_values(array_filter($products, function($p) {
            return ($p['bestseller'] ?? false) === true;
        }));
    }

    // Filter by active status
    if (isset($_GET['active'])) {
        $active = filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN);
        $products = array_values(array_filter($products, function($p) use ($active) {
            return ($p['active'] ?? true) === $active;
        }));
    }

    // Search by name or description
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $search = strtolower($_GET['search']);
        $products = array_values(array_filter($products, function($p) use ($search) {
            return strpos(strtolower($p['name']), $search) !== false ||
                   strpos(strtolower($p['description'] ?? ''), $search) !== false;
        }));
    }

    // Get single product by ID
    if (isset($_GET['id'])) {
        $product = array_values(array_filter($products, function($p) {
            return $p['id'] === $_GET['id'];
        }));
        if (empty($product)) {
            error('Product not found', 404);
        }
        // Convert image path for response
        $product[0]['image'] = getImageForResponse($product[0]['image'] ?? null);
        success(['product' => $product[0]]);
    }

    // Get stats
    if (isset($_GET['stats'])) {
        $total = count($products);
        $active = count(array_filter($products, function($p) { return ($p['active'] ?? true) && $p['stock'] > 0; }));
        $outOfStock = count(array_filter($products, function($p) { return $p['stock'] === 0; }));
        $revenue = array_reduce($products, function($sum, $p) { return $sum + ($p['price'] * $p['stock']); }, 0);

        success([
            'stats' => [
                'total' => $total,
                'active' => $active,
                'outOfStock' => $outOfStock,
                'revenue' => round($revenue, 2)
            ]
        ]);
    }

    // Convert image paths for all products
    foreach ($products as &$product) {
        $product['image'] = getImageForResponse($product['image'] ?? null);
    }

    success(['products' => $products, 'count' => count($products)]);
}

// ─── POST: Create Product ───
function handlePost() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        error('Invalid JSON data', 400);
    }

    if (empty($input['name']) || empty($input['category']) || !isset($input['price'])) {
        error('Missing required fields: name, category, price', 400);
    }

    // Validate image size if base64
    if (isset($input['image']) && substr($input['image'], 0, 10) === 'data:image') {
        $imageSize = strlen($input['image']);
        if ($imageSize > MAX_IMAGE_SIZE * 2) { // base64 is ~33% larger than binary
            error('Image too large. Maximum allowed: ' . (MAX_IMAGE_SIZE / 1024) . 'KB', 400);
        }
    }

    $data = loadProductsData();
    $productId = generateId('prod');

    $newProduct = [
        'id' => $productId,
        'name' => trim($input['name']),
        'category' => $input['category'],
        'price' => floatval($input['price']),
        'oldPrice' => isset($input['oldPrice']) && $input['oldPrice'] ? floatval($input['oldPrice']) : null,
        'stock' => isset($input['stock']) ? intval($input['stock']) : 0,
        'minStock' => isset($input['minStock']) ? intval($input['minStock']) : 5,
        'sales_count' => isset($input['sales_count']) ? intval($input['sales_count']) : 0,
        'bestseller' => isset($input['bestseller']) ? (bool)$input['bestseller'] : false,
        'description' => $input['description'] ?? '',
        'image' => null,
        'active' => isset($input['active']) ? (bool)$input['active'] : true,
        'variants' => isset($input['variants']) && is_array($input['variants']) ? $input['variants'] : [],
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];

    // Save image to file instead of base64
    if (isset($input['image']) && $input['image']) {
        $newProduct['image'] = saveImageToFile($input['image'], $productId);
    }

    $data['products'][] = $newProduct;

    if (!saveProductsData($data)) {
        error('Failed to save product. Check file permissions.', 500);
    }

    error_log('[Products API] POST - Created product: ' . $productId);

    success(['product' => $newProduct, 'message' => 'Product created successfully']);
}

// ─── PUT: Update Product ───
function handlePut() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || empty($input['id'])) {
        error('Product ID is required', 400);
    }

    $data = loadProductsData();
    $found = false;

    foreach ($data['products'] as &$product) {
        if ($product['id'] === $input['id']) {
            $found = true;

            if (isset($input['name'])) $product['name'] = trim($input['name']);
            if (isset($input['category'])) $product['category'] = $input['category'];
            if (isset($input['price'])) $product['price'] = floatval($input['price']);
            if (array_key_exists('oldPrice', $input)) $product['oldPrice'] = $input['oldPrice'] ? floatval($input['oldPrice']) : null;
            if (isset($input['stock'])) $product['stock'] = intval($input['stock']);
            if (isset($input['minStock'])) $product['minStock'] = intval($input['minStock']);
            if (isset($input['sales_count'])) $product['sales_count'] = intval($input['sales_count']);
            if (isset($input['bestseller'])) $product['bestseller'] = (bool)$input['bestseller'];
            if (isset($input['description'])) $product['description'] = $input['description'];
            if (isset($input['active'])) $product['active'] = (bool)$input['active'];
            if (isset($input['variants']) && is_array($input['variants'])) $product['variants'] = $input['variants'];

            // Handle image update
            if (isset($input['image']) && $input['image']) {
                // Validate size
                if (substr($input['image'], 0, 10) === 'data:image') {
                    $imageSize = strlen($input['image']);
                    if ($imageSize > MAX_IMAGE_SIZE * 2) {
                        error('Image too large. Maximum allowed: ' . (MAX_IMAGE_SIZE / 1024) . 'KB', 400);
                    }
                }
                $product['image'] = saveImageToFile($input['image'], $product['id']);
            }

            $product['updated_at'] = date('c');
            break;
        }
    }

    if (!$found) {
        error('Product not found', 404);
    }

    if (!saveProductsData($data)) {
        error('Failed to save product. Check file permissions.', 500);
    }

    error_log('[Products API] PUT - Updated product: ' . $input['id']);

    $updated = array_values(array_filter($data['products'], function($p) use ($input) {
        return $p['id'] === $input['id'];
    }));

    $updated[0]['image'] = getImageForResponse($updated[0]['image'] ?? null);

    success(['product' => $updated[0], 'message' => 'Product updated successfully']);
}

// ─── DELETE: Delete Product ───
function handleDelete() {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? null;

    if (!$id) {
        error('Product ID is required', 400);
    }

    $data = loadProductsData();
    $originalCount = count($data['products']);

    $data['products'] = array_values(array_filter($data['products'], function($p) use ($id) {
        return $p['id'] !== $id;
    }));

    if (count($data['products']) === $originalCount) {
        error('Product not found', 404);
    }

    if (!saveProductsData($data)) {
        error('Failed to delete product. Check file permissions.', 500);
    }

    error_log('[Products API] DELETE - Deleted product: ' . $id);

    success(['message' => 'Product deleted successfully']);
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
