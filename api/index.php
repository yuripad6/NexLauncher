<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';

function load_packs(): array {
    if (!is_file(PACKS_FILE)) return [];
    $data = json_decode((string)file_get_contents(PACKS_FILE), true);
    return is_array($data) ? $data : [];
}

$packs = load_packs();
if (isset($_GET['list'])) {
    echo json_encode(['packs' => array_values(array_filter($packs, static fn($p) => is_array($p) && ($p['enabled'] ?? true)))], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if (isset($_GET['pack'])) {
    $id = (string)$_GET['pack'];
    foreach ($packs as $pack) {
        if (is_array($pack) && ($pack['id'] ?? '') === $id) {
            echo json_encode($pack, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'Pack not found'], JSON_UNESCAPED_UNICODE);
    exit;
}
http_response_code(400);
echo json_encode(['error' => 'Use ?list=1 or ?pack=pack-id'], JSON_UNESCAPED_UNICODE);
