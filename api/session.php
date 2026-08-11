<?php
require 'init.php';

if (!isset($_SESSION['user_id'])) {
    error('Not authenticated', 401);
}

success([
    'user' => [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'name' => $_SESSION['name'],
        'role' => $_SESSION['role'],
        'permissions' => $_SESSION['permissions'] ?? []
    ]
]);
