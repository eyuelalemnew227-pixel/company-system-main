<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Telegram Ticketing Manager Reports
Schedule::command('tickets:send-telegram-weekly-report')->weeklyOn(1, '08:00');
Schedule::command('tickets:send-telegram-monthly-report')->monthlyOn(1, '08:00');
