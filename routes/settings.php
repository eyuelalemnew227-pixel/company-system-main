<?php

use App\Http\Controllers\CollectionDayController;
use App\Http\Controllers\OrderTypeController;
use App\Http\Controllers\PreOrderProductController;
use App\Http\Controllers\SocialMediaSourceController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    // Pre-Order Settings
    Route::middleware('permission:view pre-order products')->group(function () {
        Route::resource('settings/pre-order-products', PreOrderProductController::class)->names('pre-order-products');
    });

    Route::middleware('permission:view order types|view pre-orders|view pre-order products|manage pre-order payment settings')->group(function () {
        Route::patch('settings/order-types/{orderType}/toggle-status', [OrderTypeController::class, 'toggleStatus'])->name('order-types.toggle-status');
        Route::resource('settings/order-types', OrderTypeController::class)->names('order-types');

        Route::patch('settings/social-media-sources/{socialMediaSource}/toggle-status', [SocialMediaSourceController::class, 'toggleStatus'])->name('social-media-sources.toggle-status');
        Route::resource('settings/social-media-sources', SocialMediaSourceController::class)->names('social-media-sources');
    });

    Route::middleware('permission:view collection days')->group(function () {
        Route::resource('settings/collection-days', CollectionDayController::class)->names('collection-days');
    });
});
