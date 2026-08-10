<?php
/**
 * ============================================================
 * Customers API - نظام العملاء
 * Methods: GET / POST
 * ============================================================
 */

require_once __DIR__ . '/init.php';

define('CUSTOMERS_FILE', __DIR__ . '/customers.json');

// ─── Load Customers Data ───
function loadCustomersData() {
    $data = readJson(CUSTOMERS_FILE);
    if (!$data) {
        return ['customers' => [], 'meta' => ['version' => '1.0', 'last_updated' => date('c'), 'total_count' => 0, 'next_id' => 1]];
    }
    return $data;
}

// ─── Save Customers Data ───
function saveCustomersData($data) {
    $data['meta']['last_updated'] = date('c');
    $data['meta']['total_count'] = count($data['customers']);
    return writeJson(CUSTOMERS_FILE, $data);
}

// ─── Hash Password ───
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

// ─── Verify Password ───
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// ─── Generate Customer ID ───
function generateCustomerId(&$meta) {
    $nextId = $meta['next_id'] ?? 1;
    $meta['next_id'] = $nextId + 1;
    return 'CUST-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);
}

// ─── Generate Reset Token ───
function generateResetToken() {
    return bin2hex(random_bytes(32));
}

// ─── GET: Read Customers / Login / Check Email ───
function handleGet() {
    $data = loadCustomersData();
    $customers = $data['customers'];

    // Check if email exists (for registration validation)
    if (isset($_GET['check']) && $_GET['check'] === '1' && isset($_GET['email'])) {
        $email = strtolower(trim($_GET['email']));
        $exists = false;
        foreach ($customers as $c) {
            if (strtolower($c['email']) === $email) {
                $exists = true;
                break;
            }
        }
        success(['exists' => $exists]);
    }

    // Get customer by ID
    if (isset($_GET['id'])) {
        $customer = null;
        foreach ($customers as $c) {
            if ($c['id'] === $_GET['id']) {
                $customer = $c;
                break;
            }
        }
        if (!$customer) {
            error('Customer not found', 404);
        }
        // Remove password from response
        unset($customer['password']);
        unset($customer['reset_token']);
        unset($customer['reset_expires']);
        success(['customer' => $customer]);
    }

    // Login by email (GET?email=...&password=...)
    if (isset($_GET['email']) && isset($_GET['password'])) {
        $email = strtolower(trim($_GET['email']));
        $password = $_GET['password'];

        $customer = null;
        foreach ($customers as $c) {
            if (strtolower($c['email']) === $email) {
                $customer = $c;
                break;
            }
        }

        if (!$customer) {
            error('Email not found', 404);
        }

        if (!verifyPassword($password, $customer['password'])) {
            error('Invalid password', 401);
        }

        // Remove password from response
        unset($customer['password']);
        unset($customer['reset_token']);
        unset($customer['reset_expires']);
        success([
            'customer' => $customer,
            'message' => 'Login successful'
        ]);
    }

    // Get all customers (admin only - simplified)
    success(['customers' => array_map(function($c) {
        unset($c['password']);
        unset($c['reset_token']);
        unset($c['reset_expires']);
        return $c;
    }, $customers), 'count' => count($customers)]);
}

// ─── POST: Create Customer (Register) ───
function handlePost() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        error('Invalid JSON data', 400);
    }

    // Validate required fields
    if (empty($input['name']) || strlen(trim($input['name'])) < 2) {
        error('Name is required (min 2 characters)', 400);
    }

    if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        error('Valid email is required', 400);
    }

    if (empty($input['password']) || strlen($input['password']) < 6) {
        error('Password is required (min 6 characters)', 400);
    }

    $data = loadCustomersData();
    $customers = $data['customers'];

    // Check if email already exists
    $email = strtolower(trim($input['email']));
    foreach ($customers as $c) {
        if (strtolower($c['email']) === $email) {
            error('Email already registered', 409);
        }
    }

    // Create new customer
    $customerId = generateCustomerId($data['meta']);

    $newCustomer = [
        'id' => $customerId,
        'name' => trim($input['name']),
        'email' => $email,
        'password' => hashPassword($input['password']),
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];

    $customers[] = $newCustomer;
    $data['customers'] = $customers;
    saveCustomersData($data);

    // Remove password from response
    unset($newCustomer['password']);

    success([
        'customer' => $newCustomer,
        'message' => 'Account created successfully'
    ], 201);
}

// ─── POST: Request Password Reset ───
function handleForgotPassword() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        error('Valid email is required', 400);
    }

    $data = loadCustomersData();
    $email = strtolower(trim($input['email']));
    $customer = null;
    $customerIndex = -1;

    foreach ($data['customers'] as $idx => $c) {
        if (strtolower($c['email']) === $email) {
            $customer = $c;
            $customerIndex = $idx;
            break;
        }
    }

    // If email not found, show error
    if (!$customer) {
        error('لا يوجد حساب بهذا البريد الإلكتروني', 404);
        return;
    }

    // Generate token
    $token = generateResetToken();
    $expires = date('c', strtotime('+1 hour'));

    // Save token to customer
    $data['customers'][$customerIndex]['reset_token'] = $token;
    $data['customers'][$customerIndex]['reset_expires'] = $expires;
    saveCustomersData($data);

    // Return token to user (no email sending)
    success([
        'success' => true,
        'message' => 'تم التحقق من الحساب',
        'token' => $token,
        'reset_url' => 'http://localhost:3000/Front/index.html?reset=' . $token
    ]);
}

// ─── POST: Reset Password with Token ───
function handleResetPassword() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['token']) || empty($input['password']) || strlen($input['password']) < 6) {
        error('Token and password (min 6 chars) required', 400);
    }

    $data = loadCustomersData();
    $found = false;

    foreach ($data['customers'] as &$customer) {
        if (isset($customer['reset_token']) && $customer['reset_token'] === $input['token']) {
            // Check expiry
            if (isset($customer['reset_expires']) && strtotime($customer['reset_expires']) < time()) {
                error('Reset link expired', 410);
            }

            // Update password
            $customer['password'] = hashPassword($input['password']);
            unset($customer['reset_token']);
            unset($customer['reset_expires']);
            $customer['updated_at'] = date('c');
            $found = true;
            break;
        }
    }

    if (!$found) {
        error('Invalid reset token', 400);
    }

    saveCustomersData($data);
    success(['message' => 'Password reset successfully']);
}

// ─── Route Request ───
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        handleGet();
        break;
    case 'POST':
        if ($action === 'forgot') {
            handleForgotPassword();
        } elseif ($action === 'reset') {
            handleResetPassword();
        } else {
            handlePost();
        }
        break;
    default:
        error('Method not allowed', 405);
}
