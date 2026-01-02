<?php
require 'config.php';
$db = getDB(DEST_DB_HOST, DEST_DB_NAME, DEST_DB_USER, DEST_DB_PASS);
$types = $db->query('SELECT id, name FROM order_types')->fetchAll();
foreach ($types as $t) {
    echo $t['id'] . ': ' . $t['name'] . PHP_EOL;
}
