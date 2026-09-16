<?php

$filePath = 'c:\tsinukdal\company\app\Http\Controllers\WeeklyBudgetController.php';
$content = file_get_contents($filePath);

// Extract ceoView
preg_match('/public function ceoView\(\): Response\s*\{(.*?)\n    \}\n/s', $content, $ceoViewMatch);
$ceoViewBody = $ceoViewMatch[1];

// Extract exportCeo
preg_match('/public function exportCeo\(CsvExportService \$csvExportService\)\s*\{(.*?)\n    \}\n/s', $content, $exportCeoMatch);
$exportCeoBody = $exportCeoMatch[1];

// Transform ceoView to financeAdminView
$financeAdminViewBody = str_replace(
    ["can('view ceo budgets')", "Inertia::render('Budget/WeeklyBudget/CeoView'"],
    ["can('view finance admin budgets')", "Inertia::render('Budget/WeeklyBudget/FinanceAdminView'"],
    $ceoViewBody
);

// Add status_finance and status_department to the filters array
$financeAdminViewBody = preg_replace(
    "/'request_type',/",
    "'request_type',\n            'status_finance',\n            'status_department',",
    $financeAdminViewBody
);

// Add the query conditions for status_finance and status_department
$financeAdminViewBody = preg_replace(
    "/->when\(request\('request_type'\), fn\(\\$q, \\$v\) => \\$q->where\('request_type', \\$v\)\)/",
    "->when(request('request_type'), fn(\$q, \$v) => \$q->where('request_type', \$v))\n            ->when(request('status_finance'), fn(\$q, \$v) => \$q->where('status_finance', \$v))\n            ->when(request('status_department'), fn(\$q, \$v) => \$q->where('status_department', \$v))",
    $financeAdminViewBody
);

// Transform exportCeo to exportFinanceAdmin
$exportFinanceAdminBody = str_replace(
    ["can('view ceo budgets')", "export('weekly-budgets-ceo-'"],
    ["can('view finance admin budgets')", "export('weekly-budgets-finance-admin-'"],
    $exportCeoBody
);

$newMethods = <<<EOT

    // ─────────────────────────────────────────────
    // Finance Admin View
    // ─────────────────────────────────────────────

    public function financeAdminView(): Response
    {
$financeAdminViewBody
    }

    public function exportFinanceAdmin(CsvExportService \$csvExportService)
    {
$exportFinanceAdminBody
    }

EOT;

// Find position before updateCeo to insert
$insertPos = strpos($content, '    public function updateCeo');
if ($insertPos !== false) {
    $content = substr_replace($content, $newMethods, $insertPos, 0);
    file_put_contents($filePath, $content);
    echo "Successfully inserted financeAdminView and exportFinanceAdmin methods.\n";
} else {
    echo "Failed to find insert position.\n";
}
