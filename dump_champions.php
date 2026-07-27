<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$cats = App\Models\EvaluationCategory::all()->toArray();
$evals = App\Models\Evaluation::all()->toArray();

file_put_contents(__DIR__ . '/debug_champions.json', json_encode([
    'categories' => $cats,
    'evaluations' => $evals
], JSON_PRETTY_PRINT));
