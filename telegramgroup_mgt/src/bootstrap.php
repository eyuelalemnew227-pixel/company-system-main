<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

spl_autoload_register(static function (string $class): void {
    $prefix = 'KaldisTelegram\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/KaldisBot.php';
    if (file_exists($path)) {
        require_once $path;
    }
});

