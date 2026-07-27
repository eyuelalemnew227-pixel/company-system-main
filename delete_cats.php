<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

App\Models\EvaluationCategory::whereIn('id', [1, 7])->delete();
echo "Deleted dummy categories.\n";
