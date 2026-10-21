<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_admin();
$originalId = (string)($_GET['id'] ?? $_POST['original_id'] ?? '');
$editing = $originalId !== '';
$packs = read_packs();
$current = null;
if ($editing) {
    foreach ($packs as $pack) if (($pack['id'] ?? '') === $originalId) { $current = $pack; break; }
    if (!$current) { http_response_code(404); exit('Сборка не найдена. <a href="dashboard.php">Назад</a>'); }
}
$data = $current ?? ['id'=>'','name'=>'','mcVersion'=>'1.20.1','modLoader'=>'vanilla','modLoaderVersion'=>'','zipUrl'=>'','sha256'=>'','server'=>'','enabled'=>true];
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $id = strtolower(trim((string)($_POST['id'] ?? '')));
    $name = trim((string)($_POST['name'] ?? ''));
    $mcVersion = trim((string)($_POST['mcVersion'] ?? ''));
    $loader = (string)($_POST['modLoader'] ?? 'vanilla');
    $loaderVersion = trim((string)($_POST['modLoaderVersion'] ?? ''));
    $zipUrl = trim((string)($_POST['zipUrl'] ?? ''));
    $sha256 = strtolower(trim((string)($_POST['sha256'] ?? '')));
    $server = trim((string)($_POST['server'] ?? ''));
    $enabled = isset($_POST['enabled']);
    if (!preg_match('/^[a-z0-9][a-z0-9-]{1,63}$/', $id)) $error = 'ID: латиница, цифры и дефис (2–64 символа).';
    elseif ($name === '' || $mcVersion === '') $error = 'Заполни название и версию Minecraft.';
    elseif (!in_array($loader, ['vanilla','fabric','forge','neoforge','quilt'], true)) $error = 'Недопустимый загрузчик.';
    elseif (!filter_var($zipUrl, FILTER_VALIDATE_URL) || parse_url($zipUrl, PHP_URL_SCHEME) !== 'https') $error = 'Укажи действительную HTTPS-ссылку на ZIP.';
    elseif ($sha256 !== '' && !preg_match('/^[a-f0-9]{64}$/', $sha256)) $error = 'SHA-256 должен содержать 64 шестнадцатеричных символа.';
    else {
        foreach ($packs as $pack) if (($pack['id'] ?? '') === $id && (!$editing || $id !== $originalId)) { $error = 'Сборка с таким ID уже существует.'; break; }
    }
    if ($error === '') {
        $item = ['id'=>$id,'name'=>$name,'mcVersion'=>$mcVersion,'modLoader'=>$loader,'modLoaderVersion'=>$loaderVersion,'zipUrl'=>$zipUrl,'sha256'=>$sha256,'server'=>$server,'enabled'=>$enabled];
        $updated = false;
        foreach ($packs as $i => $pack) {
            if (($pack['id'] ?? '') === $originalId && $editing) { $packs[$i] = $item; $updated = true; break; }
        }
        if (!$updated) $packs[] = $item;
        try { write_packs($packs); header('Location: dashboard.php?saved=1'); exit; }
        catch (Throwable $e) { $error = $e->getMessage(); }
    }
    $data = ['id'=>$id,'name'=>$name,'mcVersion'=>$mcVersion,'modLoader'=>$loader,'modLoaderVersion'=>$loaderVersion,'zipUrl'=>$zipUrl,'sha256'=>$sha256,'server'=>$server,'enabled'=>$enabled];
}
?><!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexLauncher — <?= $editing?'Редактировать':'Новая сборка'?></title><link rel="stylesheet" href="assets/style.css"></head><body><header class="top"><a class="brand" href="dashboard.php"><span class="brand-mark">N</span>NexLauncher <small>ADMIN</small></a><a class="secondary link-button" href="dashboard.php">← Все сборки</a></header><main class="wrap form-wrap"><p class="eyebrow">КОНФИГУРАЦИЯ СБОРКИ</p><h1><?= $editing?'Редактировать сборку':'Создать сборку'?></h1><p class="muted">После сохранения API сразу начнёт отдавать обновлённый JSON.</p><?php if ($error): ?><div class="alert"><?=h($error)?></div><?php endif; ?><form method="post" class="pack-form"><input type="hidden" name="csrf_token" value="<?=h(csrf_token())?>"><input type="hidden" name="original_id" value="<?=h($originalId)?>"><div class="form-grid"><label>ID (slug)<input name="id" required pattern="[a-z0-9][a-z0-9-]{1,63}" value="<?=h((string)$data['id'])?>" placeholder="survival-1201"></label><label>Название сборки<input name="name" required value="<?=h((string)$data['name'])?>" placeholder="Survival"></label><label>Версия Minecraft<input name="mcVersion" required value="<?=h((string)$data['mcVersion'])?>" placeholder="1.20.1"></label><label>Загрузчик<select name="modLoader"><?php foreach (['vanilla'=>'Vanilla','fabric'=>'Fabric','forge'=>'Forge','neoforge'=>'NeoForge','quilt'=>'Quilt'] as $v=>$label): ?><option value="<?=$v?>" <?=$data['modLoader']===$v?'selected':''?>><?=$label?></option><?php endforeach; ?></select></label><label>Версия загрузчика<input name="modLoaderVersion" value="<?=h((string)$data['modLoaderVersion'])?>" placeholder="0.16.9"></label><label class="wide">Ссылка на ZIP (HTTPS)<input type="url" name="zipUrl" required value="<?=h((string)$data['zipUrl'])?>" placeholder="https://github.com/user/repo/releases/download/v1/pack.zip"></label><label class="wide">SHA-256 (необязательно)<input name="sha256" maxlength="64" value="<?=h((string)$data['sha256'])?>" placeholder="64 hex символа"></label><label>Название сервера<input name="server" value="<?=h((string)$data['server'])?>" placeholder="Survival Server"></label><label class="check-label"><input type="checkbox" name="enabled" value="1" <?=$data['enabled']?'checked':''?>> Показывать сборку в лаунчере</label></div><div class="form-actions"><a class="secondary link-button" href="dashboard.php">Отмена</a><button class="primary" type="submit">Сохранить сборку</button></div></form></main></body></html>
