<?php
/**
 * Direct entry point for /api/api.php requests
 */
require __DIR__ . '/../../vendor/autoload.php';
$app = require_once __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$request = Illuminate\Http\Request::capture();
$response = $app->make(\App\Http\Controllers\FormApiController::class)->apiPhpGateway($request);

if ($response instanceof \Symfony\Component\HttpFoundation\Response) {
    $response->send();
} else {
    echo json_encode($response);
}
