<?php

namespace App\Services;

use App\Models\WeeklyBudget;
use App\Models\User;
use App\Services\TelegramBotService;
use Illuminate\Support\Facades\Log;

class TelegramWeeklyBudgetNotificationService
{
    public function __construct(
        private readonly TelegramBotService $botService
    ) {
    }

    private function getAppUrl(): string
    {
        if (app()->runningInConsole()) {
            return config('app.url', 'http://localhost:8000');
        }

        try {
            if (request()->header('x-forwarded-host')) {
                $proto = request()->header('x-forwarded-proto', 'https');
                $host = request()->header('x-forwarded-host');
                return "{$proto}://{$host}";
            }
            return request()->getSchemeAndHttpHost();
        } catch (\Throwable $e) {
            return config('app.url', 'http://localhost:8000');
        }
    }

    private function formatBudgetHeader(WeeklyBudget $budget): string
    {
        $budget->loadMissing(['branch', 'department']);

        $rawBranch = $budget->branch?->name;
        $branch = e(($rawBranch && $rawBranch !== 'N/A' && trim($rawBranch) !== '') ? $rawBranch : 'Head Office');
        $department = e($budget->department?->name ?? 'N/A');
        $amount = number_format((float) $budget->amount, 2);
        $description = e($budget->description ?? 'N/A');
        
        $rawRequestType = $budget->request_type;
        $requestTypeVal = is_object($rawRequestType) && isset($rawRequestType->value) ? $rawRequestType->value : (is_string($rawRequestType) ? $rawRequestType : 'N/A');

        return "💰 <b>Weekly Budget #{$budget->id}</b>\n" .
               "📍 <b>Branch:</b> {$branch}\n" .
               "🏢 <b>Department:</b> {$department}\n" .
               "📋 <b>Request Type:</b> " . e(ucfirst($requestTypeVal)) . "\n" .
               "📝 <b>Description:</b> {$description}\n" .
               "💵 <b>Amount:</b> {$amount}";
    }

    private function buildBudgetInlineButton(WeeklyBudget $budget, string $module): array
    {
        $path = match($module) {
            'budget.finance' => '/budget/weekly-budget/finance',
            'budget.ceo' => '/budget/weekly-budget/ceo',
            'budget.department' => '/budget/weekly-budget/department',
            default => '/budget/weekly-budget',
        };

        $url = "{$this->getAppUrl()}{$path}?budget_id={$budget->id}";
        return [
            'inline_keyboard' => [
                [
                    [
                        'text' => "👁️ View Budget #{$budget->id}",
                        'url' => $url,
                    ],
                ],
            ],
        ];
    }

    /**
     * Send notification to a specific list of users.
     */
    public function notifyUsers(WeeklyBudget $budget, array $userIds, string $title, string $body, string $module): void
    {
        $header = $this->formatBudgetHeader($budget);
        $buttons = $this->buildBudgetInlineButton($budget, $module);
        $path = match($module) {
            'budget.finance' => '/budget/weekly-budget/finance',
            'budget.ceo' => '/budget/weekly-budget/ceo',
            'budget.department' => '/budget/weekly-budget/department',
            default => '/budget/weekly-budget',
        };
        $url = "{$this->getAppUrl()}{$path}?budget_id={$budget->id}";

        $text = "🔔 <b>{$title}</b>\n\n" .
                "{$header}\n\n" .
                "<i>{$body}</i>\n\n" .
                "🔗 <a href=\"{$url}\">View Budget #{$budget->id}</a>";

        $this->botService->sendToUsers($userIds, $text, $buttons);
    }
}
