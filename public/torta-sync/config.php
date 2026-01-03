<?php
// Database configuration
define('SRC_DB_HOST', '127.0.0.1');
define('SRC_DB_NAME', 'kaldis_torta_orders');
define('SRC_DB_USER', 'root');
define('SRC_DB_PASS', '');

define('DEST_DB_HOST', '127.0.0.1');
define('DEST_DB_NAME', 'company_system');
define('DEST_DB_USER', 'root');
define('DEST_DB_PASS', '');

// System Settings
define('SYNC_USER_ID', 1); // ID of the user who "creates" synced orders
define('ORDER_NUMBER_PREFIX', 'TOR-');

function getDB($host, $name, $user, $pass) {
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]);
        return $pdo;
    } catch (PDOException $e) {
        die("Connection failed: " . $e->getMessage());
    }
}
?>
