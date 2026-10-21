<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Strict',
        'path' => '/',
    ]);
    session_start();
}

function admin_logged_in(): bool {
    return isset($_SESSION['nex_admin']) && $_SESSION['nex_admin'] === true;
}
function require_admin(): void {
    if (!admin_logged_in()) {
        header('Location: login.php');
        exit;
    }
}
function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}
function verify_csrf(): void {
    $token = (string)($_POST['csrf_token'] ?? '');
    if (!hash_equals(csrf_token(), $token)) {
        http_response_code(403);
        exit('Недействительный CSRF-токен. Обнови страницу и попробуй снова.');
    }
}
function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function read_packs(): array {
    if (!is_file(PACKS_FILE)) return [];
    $decoded = json_decode((string)file_get_contents(PACKS_FILE), true);
    return is_array($decoded) ? $decoded : [];
}
function write_packs(array $packs): void {
    if (!is_dir(DATA_DIR) && !mkdir(DATA_DIR, 0750, true) && !is_dir(DATA_DIR)) {
        throw new RuntimeException('Не удалось создать папку data.');
    }
    $json = json_encode(array_values($packs), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents(PACKS_FILE, $json . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Не удалось записать packs.json. Проверь права папки data.');
    }
}
