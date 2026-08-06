<?php

namespace App\Console\Commands;

use App\Services\TelegramReportNotificationService;
use Illuminate\Console\Command;

class SendTelegramWeeklyReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tickets:send-telegram-weekly-report';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send weekly ticketing summary reports to all department managers via Telegram bot';

    /**
     * Execute the console command.
     */
    public function handle(TelegramReportNotificationService $reportService): int
    {
        $this->info('Starting weekly Telegram report distribution to department managers...');

        try {
            $reportService->sendReportsToAllManagers('weekly');
            $this->info('Weekly Telegram reports sent successfully.');
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Failed to send weekly Telegram reports: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
