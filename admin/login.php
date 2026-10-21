<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
if (admin_logged_in()) { header('Location: dashboard.php'); exit; }
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $hash = defined('ADMIN_PASSWORD_HASH') ? ADMIN_PASSWORD_HASH : '';
    $password = (string)($_POST['password'] ?? '');
    if ($hash !== '' && password_verify($password, $hash)) {
        session_regenerate_id(true);
        $_SESSION['nex_admin'] = true;
        header('Location: dashboard.php');
        exit;
    }
    $error = $hash === '' ? 'Сначала настрой ADMIN_PASSWORD_HASH в api/config.php.' : 'Неверный пароль.';
}
?><!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexLauncher — Вход</title><link rel="stylesheet" href="assets/style.css"></head><body class="login-page"><form class="login-card" method="post"><div class="brand-mark">N</div><h1>NexLauncher</h1><p>Вход в панель администратора</p><?php if ($error): ?><div class="alert"><?=h($error)?></div><?php endif; ?><input type="hidden" name="csrf_token" value="<?=h(csrf_token())?>"><label>Пароль администратора<input type="password" name="password" required autocomplete="current-password"></label><button class="primary" type="submit">Войти</button><a class="muted" href="../index.html">← На главную</a></form></body></html>
