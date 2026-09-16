<?php

$filePath = 'c:\tsinukdal\company\app\Http\Controllers\WeeklyBudgetController.php';
$content = file_get_contents($filePath);

// 1. Get the full ceoView method
$startPos = strpos($content, 'public function ceoView(): Response');
$endPos = strpos($content, 'public function exportCeo');
$ceoViewBlock = substr($content, $startPos, $endPos - $startPos);

// 2. Transform into financeAdminView
$financeAdminViewBlock = str_replace(
    ["can('view ceo budgets')", "Inertia::render('Budget/WeeklyBudget/CeoView'"],
    ["can('view finance admin budgets')", "Inertia::render('Budget/WeeklyBudget/FinanceAdminView'"],
    $ceoViewBlock
);
$financeAdminViewBlock = str_replace('public function ceoView(): Response', 'public function financeAdminView(): Response', $financeAdminViewBlock);

// 3. Add status_finance and status_department to filters
$financeAdminViewBlock = str_replace(
    "'request_type',",
    "'request_type',\n            'status_finance',\n            'status_department',",
    $financeAdminViewBlock
);

// 4. Add the where queries for status_finance and status_department
$findStr = "->when(request('request_type'), fn(\$q, \$v) => \$q->where('request_type', \$v))";
$replaceStr = $findStr . "\n            ->when(request('status_finance'), fn(\$q, \$v) => \$q->where('status_finance', \$v))\n            ->when(request('status_department'), fn(\$q, \$v) => \$q->where('status_department', \$v))";
$financeAdminViewBlock = str_replace($findStr, $replaceStr, $financeAdminViewBlock);

// 5. Replace the empty financeAdminView that was inserted previously
$emptyStart = strpos($content, 'public function financeAdminView(): Response');
$emptyEnd = strpos($content, 'public function exportFinanceAdmin');

$content = substr_replace($content, $financeAdminViewBlock, $emptyStart, $emptyEnd - $emptyStart);

file_put_contents($filePath, $content);
echo "Successfully fixed financeAdminView.\n";
