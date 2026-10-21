<?php
require __DIR__ . '/auth.php';
$CONFIG = require __DIR__ . '/../api/config.php';

if (!empty($_SESSION['admin'])) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_login_attempts();
    $user = $_POST['user'] ?? '';
    $pass = $_POST['pass'] ?? '';
    if ($user === $CONFIG['admin_user']
        && password_verify($pass, $CONFIG['admin_password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        unset($_SESSION['attempts']);
        header('Location: dashboard.php');
        exit;
    }
    record_failed_attempt();
    $error = 'Неверный логин или пароль';
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>NexLauncher — Вход</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body class="center">
  <form method="post" class="card">
    <h1>NexLauncher</h1>
    <p class="muted">Панель управления</p>
    <?php if ($error): ?><p class="error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
    <label>Логин
      <input name="user" autocomplete="username" required>
    </label>
    <label>Пароль
      <input name="pass" type="password" autocomplete="current-password" required>
    </label>
    <button type="submit">Войти</button>
  </form>
</body>
</html>
