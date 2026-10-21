<?php
require __DIR__ . '/auth.php';
require_login();
$CONFIG = require __DIR__ . '/../api/config.php';
$data = json_decode(file_get_contents($CONFIG['packs_file']), true) ?: ['packs' => []];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete'])) {
    require_csrf();
    $id = $_POST['delete'];
    $data['packs'] = array_values(array_filter($data['packs'], fn($p) => $p['id'] !== $id));
    file_put_contents($CONFIG['packs_file'], json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    header('Location: dashboard.php');
    exit;
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>NexLauncher — Сборки</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="topbar">
  <strong>NexLauncher Admin</strong>
  <nav>
    <a href="dashboard.php">Сборки</a>
    <a href="edit.php">+ Новая</a>
    <a href="logout.php">Выйти</a>
  </nav>
</header>
<main class="container">
  <h1>Сборки</h1>
  <table class="table">
    <thead>
      <tr><th>ID</th><th>Название</th><th>MC</th><th>Загрузчик</th><th>Сервер</th><th></th></tr>
    </thead>
    <tbody>
      <?php foreach ($data['packs'] as $p): ?>
      <tr>
        <td><code><?= htmlspecialchars($p['id']) ?></code></td>
        <td><?= htmlspecialchars($p['name']) ?></td>
        <td><?= htmlspecialchars($p['mcVersion']) ?></td>
        <td><?= htmlspecialchars($p['modLoader'] . ' ' . ($p['modLoaderVersion'] ?? '')) ?></td>
        <td><?= htmlspecialchars($p['server']['ip'] . ':' . $p['server']['port']) ?></td>
        <td class="actions">
          <a class="btn" href="edit.php?id=<?= urlencode($p['id']) ?>">Изменить</a>
          <form method="post" onsubmit="return confirm('Удалить сборку?')">
            <input type="hidden" name="csrf" value="<?= csrf_token() ?>">
            <button class="btn danger" name="delete" value="<?= htmlspecialchars($p['id']) ?>">Удалить</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
      <?php if (empty($data['packs'])): ?>
        <tr><td colspan="6" class="muted">Пока нет сборок. Нажми «+ Новая».</td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</main>
</body>
</html>
