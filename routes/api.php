<?php

use App\Http\Controllers\ManagerController;
use App\Http\Controllers\PowerBiRawController;
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