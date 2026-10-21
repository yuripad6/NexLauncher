<?php
session_start();
$CONFIG = require __DIR__ . '/../api/config.php';

function require_login() {
    if (empty($_SESSION['admin'])) {
        header('Location: login.php');
        exit;
    }
}

function csrf_token() {
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function require_csrf() {
    if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) {
        http_response_code(403);
        exit('CSRF-токен недействителен');
    }
}

function check_login_attempts() {
    $now = time();
    $_SESSION['attempts'] = array_values(array_filter(
        $_SESSION['attempts'] ?? [],
        fn($t) => $now - $t < 900
    ));
    if (count($_SESSION['attempts']) >= 5) {
        http_response_code(429);
        exit('Слишком много попыток. Подожди 15 минут.');
    }
}

function record_failed_attempt() {
    $_SESSION['attempts'][] = time();
}
