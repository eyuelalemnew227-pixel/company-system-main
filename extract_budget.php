<?php
$text = file_get_contents('expense_sidebar.txt');
$pos = strpos($text, 'Weekly Budget');
echo "\n==== SIDEBAR ====\n";
if ($pos !== false)
    echo substr($text, $pos - 200, 1000);

$text2 = file_get_contents('expense_web.txt');
$pos2 = strpos($text2, 'weekly-budget');
echo "\n==== WEB.PHP ====\n";
if ($pos2 !== false)
    echo substr($text2, $pos2 - 200, 1500);
