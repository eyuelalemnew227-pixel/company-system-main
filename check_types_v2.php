<?php
require 'torta-sync/config.php';
try {
    $db = getDB(DEST_DB_HOST, DEST_DB_NAME, DEST_DB_USER, DEST_DB_PASS);
    $rows = $db->query("SELECT id, name FROM order_types")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo "ID: " . $r['id'] . " | Name: " . $r['name'] . PHP_EOL;
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
