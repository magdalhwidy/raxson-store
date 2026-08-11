<?php
require 'init.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    error('اسم المستخدم وكلمة المرور مطلوبة');
}

$users = readJson(USERS_FILE);
$passwordHash = $password;

// التحقق من الأدمن
if (isset($users['admin']) && 
    $users['admin']['username'] === $username && 
    $users['admin']['password'] === $passwordHash) {
    
    if ($users['admin']['active'] === false) {
        error('الحساب معطل');
    }
    
    $_SESSION['user_id'] = $users['admin']['id'];
    $_SESSION['username'] = $users['admin']['username'];
    $_SESSION['name'] = $users['admin']['name'];
    $_SESSION['role'] = 'admin';
    $_SESSION['permissions'] = $users['admin']['permissions'] ?? [];
    
    // تحديث آخر دخول
    $users['admin']['last_login'] = date('c');
    writeJson(USERS_FILE, $users);
    
    success([
        'user' => [
            'id' => $users['admin']['id'],
            'username' => $users['admin']['username'],
            'name' => $users['admin']['name'],
            'role' => 'admin'
        ],
        'redirect' => 'dashboard.html'
    ]);
}

// التحقق من الموظفين
foreach ($users['employees'] ?? [] as $emp) {
    if ($emp['username'] === $username && 
        $emp['password'] === $passwordHash &&
        $emp['approved'] === true &&
        $emp['active'] !== false) {
        
        $_SESSION['user_id'] = $emp['id'];
        $_SESSION['username'] = $emp['username'];
        $_SESSION['name'] = $emp['name'];
        $_SESSION['role'] = 'employee';
        $_SESSION['permissions'] = $emp['permissions'] ?? [];
        
        // تحديث آخر دخول
        $emp['last_login'] = date('c');
        // ... تحديث في المصفوفة
        writeJson(USERS_FILE, $users);
        
        success([
            'user' => [
                'id' => $emp['id'],
                'username' => $emp['username'],
                'name' => $emp['name'],
                'role' => 'employee'
            ],
            'redirect' => 'orders.html'
        ]);
    }
}

error('اسم المستخدم أو كلمة المرور غير صحيحة');
