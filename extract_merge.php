<?php
$content = file_get_contents('external_sidebar_code.txt');
$start = strpos($content, "label: 'Budget'");
echo "SIDEBAR CONFLICT TEXT:\n";
echo substr($content, $start - 10, 1500);

echo "\n\n========================================\n\n";

$content2 = file_get_contents('external_web_code.txt');
$start2 = strpos($content2, "expense-budget");
echo "WEB ROUTES CONFLICT TEXT:\n";
echo substr($content2, $start2 - 200, 2000);
