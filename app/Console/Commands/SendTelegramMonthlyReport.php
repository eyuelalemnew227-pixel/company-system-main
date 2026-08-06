<?php

namespace App\Console\Commands;

use App\Services\TelegramReportNotificationService;
use Illuminate\Console\Command;

class SendTelegramMonthlyReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tickets:send-telegram-monthly-report';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send monthly ticketing summary reports to all department managers via Telegram bot';

    /**
     * Execute the console command.
     */
    public function handle(TelegramReportNotificationService $reportService): int
    {
        $this->info('Starting monthly Telegram report distribution to department managers...');

        try {
            $reportService->sendReportsToAllManagers('monthly');
            $this->info('Monthly Telegram reports sent successfully.');
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Failed to send monthly Telegram reports: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
