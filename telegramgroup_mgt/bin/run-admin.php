<?php
declare(strict_types=1);

$options = getopt('', ['port:']);
$port = (int) ($options['port'] ?? 8000);
$publicDir = realpath(__DIR__ . '/../public');

if ($publicDir === false) {
    echo "Public directory not found.\n";
    exit(1);
}

echo "========================================================\n";
echo " Kaldi's Telegram Communication Platform - Admin Panel\n";
echo "========================================================\n";
echo "Server starting at: http://localhost:{$port}\n";
echo "Press Ctrl+C to stop the server.\n\n";

passthru(sprintf('php -S 0.0.0.0:%d -t %s', $port, escapeshellarg($publicDir)));
