<?php
require __DIR__ . '/auth.php';
require_login();
$CONFIG = require __DIR__ . '/../api/config.php';
$data = json_decode(file_get_contents($CONFIG['packs_file']), true) ?: ['packs' => []];

$editing = null;
if (isset($_GET['id'])) {
    foreach ($data['packs'] as $p) if ($p['id'] === $_GET['id']) $editing = $p;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $p = [
        'id' => preg_replace('/[^a-z0-9-]/', '', strtolower($_POST['id'] ?? '')),
        'name' => trim($_POST['name'] ?? ''),
        'mcVersion' => trim($_POST['mcVersion'] ?? ''),
        'modLoader' => $_POST['modLoader'] ?? 'vanilla',
        'modLoaderVersion' => trim($_POST['modLoaderVersion'] ?? ''),
        'zipUrl' => trim($_POST['zipUrl'] ?? ''),
        'sha256' => strtolower(trim($_POST['sha256'] ?? '')),
        'server' => [
            'name' => trim($_POST['serverName'] ?? ''),
            'ip' => trim($_POST['serverIp'] ?? ''),
            'port' => (int)($_POST['serverPort'] ?? 25565)
        ]
    ];

    if (!$p['id'] || !$p['name'] || !$p['mcVersion']) $error = 'Заполни ID, название и версию MC';
    elseif (!in_array($p['modLoader'], ['vanilla','fabric','forge','quilt'], true)) $error = 'Неверный загрузчик';
    elseif (!filter_var($p['zipUrl'], FILTER_VALIDATE_URL) || !str_starts_with($p['zipUrl'], 'https://')) $error = 'ZIP URL должен быть HTTPS';
    elseif (!preg_match('/^[a-f0-9]{64}$/', $p['sha256'])) $error = 'SHA-256 должен быть 64 hex-символа';
    elseif (!$p['server']['ip'] || $p['server']['port'] < 1 || $p['server']['port'] > 65535) $error = 'Проверь IP и порт сервера';
    else {
        $data['packs'] = array_values(array_filter($data['packs'], fn($x) => $x['id'] !== $p['id']));
        $data['packs'][] = $p;
        file_put_contents($CONFIG['packs_file'], json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        header('Location: dashboard.php');
        exit;
    }
    $editing = $p;
}
$v = $editing ?? ['id'=>'','name'=>'','mcVersion'=>'1.20.1','modLoader'=>'fabric','modLoaderVersion'=>'','zipUrl'=>'','sha256'=>'','server'=>['name'=>'','ip'=>'','port'=>25565]];
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>NexLauncher — <?= $editing ? 'Редактирование' : 'Новая сборка' ?></title>
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
  <h1><?= $editing ? 'Редактирование' : 'Новая сборка' ?></h1>
  <?php if ($error): ?><p class="error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
  <form method="post" class="form">
    <input type="hidden" name="csrf" value="<?= csrf_token() ?>">
    <label>ID (slug, a-z0-9-)<input name="id" value="<?= htmlspecialchars($v['id']) ?>" required></label>
    <label>Название<input name="name" value="<?= htmlspecialchars($v['name']) ?>" required></label>
    <label>Версия Minecraft<input name="mcVersion" value="<?= htmlspecialchars($v['mcVersion']) ?>" required></label>
    <label>Загрузчик
      <select name="modLoader">
        <?php foreach (['vanilla','fabric','forge','quilt'] as $l): ?>
          <option value="<?= $l ?>" <?= $v['modLoader'] === $l ? 'selected' : '' ?>><?= ucfirst($l) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label>Версия загрузчика (для Fabric/Forge)<input name="modLoaderVersion" value="<?= htmlspecialchars($v['modLoaderVersion'] ?? '') ?>"></label>
    <label>ZIP URL (HTTPS)<input name="zipUrl" value="<?= htmlspecialchars($v['zipUrl']) ?>" placeholder="https://github.com/.../release.zip" required></label>
    <label>SHA-256 ZIP (64 hex)<input name="sha256" value="<?= htmlspecialchars($v['sha256']) ?>" required></label>
    <fieldset>
      <legend>Сервер</legend>
      <label>Название<input name="serverName" value="<?= htmlspecialchars($v['server']['name']) ?>"></label>
      <label>IP<input name="serverIp" value="<?= htmlspecialchars($v['server']['ip']) ?>" required></label>
      <label>Порт<input name="serverPort" type="number" value="<?= (int)$v['server']['port'] ?>" required></label>
    </fieldset>
    <div class="actions">
      <a class="btn" href="dashboard.php">Отмена</a>
      <button class="btn primary" type="submit">Сохранить</button>
    </div>
  </form>
</main>
</body>
</html>
