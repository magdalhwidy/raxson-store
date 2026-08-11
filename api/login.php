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
