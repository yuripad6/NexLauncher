<?php
header('Content-Type: application/json; charset=utf-8');
$config = require __DIR__ . '/config.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array('*', $config['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: *');
} elseif ($origin && in_array($origin, $config['allowed_origins'], true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

$file = $config['packs_file'];
if (!is_file($file)) {
    http_response_code(500);
    echo json_encode(['error' => 'packs.json не найден']);
    exit;
}

$data = json_decode(file_get_contents($file), true) ?: ['packs' => []];

if (isset($_GET['list'])) {
    $list = array_map(fn($p) => [
        'id' => $p['id'],
        'name' => $p['name'],
        'mcVersion' => $p['mcVersion'],
        'modLoader' => $p['modLoader']
    ], $data['packs']);
    echo json_encode(['packs' => $list], JSON_UNESCAPED_UNICODE);
    exit;
}

if (isset($_GET['pack'])) {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['pack']);
    foreach ($data['packs'] as $p) {
        if ($p['id'] === $id) {
            echo json_encode($p, JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'Сборка не найдена']);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Укажи ?list=1 или ?pack=ID']);
