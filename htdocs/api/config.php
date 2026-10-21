<?php
// Админ: смени пароль! Хеш генерируется password_hash('пароль', PASSWORD_DEFAULT)
return [
    'admin_user' => 'admin',
    'admin_password_hash' => '', // Установи свой хеш перед входом в админку
    'packs_file' => __DIR__ . '/../data/packs.json',
    'allowed_origins' => ['*'] // Для Electron; в браузере — укажи домен
];
