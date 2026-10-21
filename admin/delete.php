<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_admin();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: dashboard.php'); exit; }
verify_csrf();
$id = (string)($_POST['id'] ?? '');
$packs = read_packs();
$filtered = array_values(array_filter($packs, static fn($p) => ($p['id'] ?? '') !== $id));
if (count($filtered) !== count($packs)) write_packs($filtered);
header('Location: dashboard.php?deleted=1');
exit;
