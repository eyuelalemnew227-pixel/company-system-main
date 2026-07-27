<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$cats = App\Models\EvaluationCategory::all()->toArray();
file_put_contents(__DIR__ . '/debug_cats.json', json_encode($cats, JSON_PRETTY_PRINT));
