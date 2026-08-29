<?php
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

use KaldisTelegram\BotConfig;
use KaldisTelegram\KaldisBot;
use KaldisTelegram\SQLiteStorage;
use KaldisTelegram\TelegramClient;

$options = getopt('', ['config:']);
$configPath = $options['config'] ?? (__DIR__ . '/../config.json');

$config = BotConfig::fromFile((string) $configPath);
$storage = new SQLiteStorage($config->databasePath);
$client = new TelegramClient($config->botToken);
$bot = new KaldisBot($config, $storage, $client);

try {
    $bot->run();
} finally {
    $storage->close();
}

