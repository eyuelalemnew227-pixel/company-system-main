<?php

namespace App\Services;

use App\Enums\WeeklyBudgetStatusCeo;
use App\Enums\WeeklyBudgetStatusDepartment;
use App\Enums\WeeklyBudgetStatusFinance;
use App\Models\User;
use App\Models\WeeklyBudget;
use App\Models\WeeklyBudgetNotification;

class WeeklyBudgetNotificationService
{
    public static function handleCreated(WeeklyBudget $budget): void
    {
        $budget->loadMissing(['department', 'branch']);
        $deptName = $budget->department?->name ?? 'N/A';
        $amountStr = number_format((float) $budget->amount, 2);

        // Notify Department reviewers & creator
        self::notifyDepartmentUsers(
            $budget,
            'budget.department',
            "New Weekly Budget Request: #{$budget->id}",
            "Created for {$deptName} — ETB {$amountStr}"
        );

        // Notify Finance users
        self::notifyUsersByPermission(
            $budget,
            'view finance budgets',
            'budget.finance',
            "New Weekly Budget Submitted: #{$budget->id}",
            "Department: {$deptName} — ETB {$amountStr}"
        );
    }

    public static function handleStatusChanges(WeeklyBudget $budget): void
    {
        $budget->loadMissing(['department', 'branch']);
        $deptName = $budget->department?->name ?? 'N/A';
        $rawBranch = $budget->branch?->name;
        $branchName = ($rawBranch && $rawBranch !== 'N/A' && trim($rawBranch) !== '') ? $rawBranch : 'Head Office';
        $amountStr = number_format((float) $budget->amount, 2);

        // Finance Alert: If department status changes to Approved
        if ($budget->wasChanged('status_department') && $budget->status_department === WeeklyBudgetStatusDepartment::Approved) {
            self::notifyUsersByPermission(
                $budget, 
                'view finance budgets', 
                'budget.finance', 
                "Budget Ready for Finance: #{$budget->id}",
                "The Department: Approved"
            );
        }

        // CEO Alert: If both Dept and Finance are Approved, and one of them just changed
        $deptApproved = $budget->status_department === WeeklyBudgetStatusDepartment::Approved;
        $financeApproved = $budget->status_finance === WeeklyBudgetStatusFinance::Approved;
        if (($budget->wasChanged('status_department') || $budget->wasChanged('status_finance')) && $deptApproved && $financeApproved) {
            // Fetch users with the 'ceo role'
            $ceoIds = \App\Models\User::role('ceo role')->pluck('id')->toArray();
            
            self::insertNotifications(
                $budget,
                $ceoIds,
                'budget.ceo', 
                "Budget Ready for CEO: #{$budget->id}",
                "The Finance: Approved",
                true // Send Telegram for CEO
            );
        }

        // Finance Alert: If CEO status changes
        if ($budget->wasChanged('status_ceo')) {
            $status = is_object($budget->status_ceo) ? $budget->status_ceo->value : $budget->status_ceo;
            $statusStr = ucfirst((string) $status);
            self::notifyUsersByPermission(
                $budget,
                'view finance budgets',
                'budget.finance',
                "CEO Status Updated: #{$budget->id}",
                "The CEO: {$statusStr}"
            );
        }

        // Department Alert: If ANY status changes
        if ($budget->wasChanged(['status_department', 'status_finance', 'status_ceo'])) {
            $changes = [];
            if ($budget->wasChanged('status_department')) {
                $status = is_object($budget->status_department) ? $budget->status_department->value : $budget->status_department;
                $changes[] = "The Department: " . ucfirst((string) $status);
            }
            if ($budget->wasChanged('status_finance')) {
                $status = is_object($budget->status_finance) ? $budget->status_finance->value : $budget->status_finance;
                $changes[] = "The Finance: " . ucfirst((string) $status);
            }
            if ($budget->wasChanged('status_ceo')) {
                $status = is_object($budget->status_ceo) ? $budget->status_ceo->value : $budget->status_ceo;
                $changes[] = "The CEO: " . ucfirst((string) $status);
            }
            
            $changesStr = implode(', ', $changes);

            self::notifyDepartmentUsers(
                $budget,
                'budget.department',
                "Budget Status Updated: #{$budget->id}",
                $changesStr
            );
        }
    }

    private static function notifyUsersByPermission(WeeklyBudget $budget, string $permission, string $type, string $title, string $body): void
    {
        $userIds = User::permission($permission)->pluck('id')->toArray();
        if (empty($userIds)) {
            $userIds = User::permission('view weekly budgets')->pluck('id')->toArray();
        }
        self::insertNotifications($budget, $userIds, $type, $title, $body, true);
    }

    private static function notifyDepartmentUsers(WeeklyBudget $budget, string $type, string $title, string $body): void
    {
        $userIds = [];
        if ($budget->created_by) {
            $userIds[] = $budget->created_by;
        }

        if ($budget->department_id) {
            $deptUsers = User::permission('view department budgets')
                ->where(function ($q) use ($budget) {
                    $q->whereHas('employee', function ($query) use ($budget) {
                        $query->where('department_id', $budget->department_id);
                    })->orWhere('id', $budget->created_by);
                })
                ->pluck('id')
                ->toArray();
            $userIds = array_merge($userIds, $deptUsers);
        }

        self::insertNotifications($budget, array_unique($userIds), $type, $title, $body, true);
    }

    private static function insertNotifications(WeeklyBudget $budget, array $userIds, string $type, string $title, string $body, bool $sendTelegram = true): void
    {
        $uniqueUserIds = collect($userIds)->filter()->unique()->toArray();
        $rows = array_map(fn($id) => [
            'user_id' => $id,
            'weekly_budget_id' => $budget->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'created_at' => now(),
            'updated_at' => now(),
            'read_at' => null,
        ], $uniqueUserIds);

        if (!empty($rows)) {
            WeeklyBudgetNotification::insert($rows);

            if ($sendTelegram) {
                $telegramUsers = User::whereIn('id', $uniqueUserIds)->whereNotNull('telegram_chat_id')->pluck('id')->toArray();
                if (!empty($telegramUsers)) {
                    $telegramService = app(\App\Services\TelegramWeeklyBudgetNotificationService::class);
                    $telegramService->notifyUsers($budget, $telegramUsers, $title, $body, $type);
                }
            }
        }
    }
}
