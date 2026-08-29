<?php

use App\Http\Controllers\ManagerController;
use App\Http\Controllers\PowerBiRawController;
use App\Http\Controllers\TelegramWebhookController;
use Illuminate\Support\Facades\Route;

// Power BI endpoints secured by API key middleware (raw-only, no pagination)
Route::middleware('powerbi')->group(function () {
    // Raw table access (whitelisted tables only)
    Route::get('/powerbi/raw', [PowerBiRawController::class, 'index']);
    Route::get('/powerbi/raw/{table}', [PowerBiRawController::class, 'table']);
});

// Departments by branch endpoint (for dynamic dropdowns)
Route::middleware('auth')->group(function () {
    Route::get('/departments/by-branch', [ManagerController::class, 'departmentsByBranch'])->name('api.departments.byBranch');
});

// Telegram Webhook Endpoints (Dedicated for Helpdesk, Budget, Memo, Pre-Order, and Dynamic Bots)
Route::post('/telegram/webhook', [TelegramWebhookController::class, 'handleHelpdesk']);
Route::post('/telegram/helpdesk-webhook', [TelegramWebhookController::class, 'handleHelpdesk']);
Route::post('/telegram/budget-webhook', [TelegramWebhookController::class, 'handleBudget']);
Route::post('/telegram/memo-webhook', [TelegramWebhookController::class, 'handleMemo']);
Route::post('/telegram/pre-order-webhook', [TelegramWebhookController::class, 'handlePreOrderBot']);
Route::post('/telegram/training-webhook', [TelegramWebhookController::class, 'handleTraining']);
Route::post('/telegram/webhook/training', [TelegramWebhookController::class, 'handleTraining']);
Route::post('/telegram/webhook/{slug}', [TelegramWebhookController::class, 'handleDynamicWebhook']);

// Telegram MiniApp Public API Endpoints
Route::get('/pre-orders/miniapp/data', [\App\Http\Controllers\PreOrderMiniAppApiController::class, 'getData']);
Route::post('/pre-orders/miniapp/order', [\App\Http\Controllers\PreOrderMiniAppApiController::class, 'storeOrder']);
Route::get('/pre-orders/miniapp/status', [\App\Http\Controllers\PreOrderMiniAppApiController::class, 'getOrderStatus']);