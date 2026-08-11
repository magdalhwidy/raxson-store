<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo '{"success":false,"error":"Method not allowed"}';
    exit;
}


$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data === null) {
    http_response_code(400);
    echo '{"success":false,"error":"Invalid JSON"}';
    exit;
}

if (!isset($data['admin']) || !isset($data['employees'])) {
    http_response_code(400);
    echo '{"success":false,"error":"Invalid data structure"}';
    exit;
}


if (file_put_contents('users.json', $input) !== false) {
    echo '{"success":true}';
} else {
    http_response_code(500);
    echo '{"success":false,"error":"Failed to save"}';
}
