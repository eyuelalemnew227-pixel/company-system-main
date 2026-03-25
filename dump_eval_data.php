<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "ID\tType\tName\n";
foreach (\App\Models\EvaluationType::all() as $t) {
    echo "{$t->id}\t{$t->evaluation_type}\t{$t->name}\n";
}
