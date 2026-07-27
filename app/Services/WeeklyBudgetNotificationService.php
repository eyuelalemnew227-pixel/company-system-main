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
    public static function handleStatusChanges(WeeklyBudget $budget): void
    {
        // Finance Alert: If department status changes to Approved
        if ($budget->wasChanged('status_department') && $budget->status_department === WeeklyBudgetStatusDepartment::Approved) {
            self::notifyUsersByPermission(
                $budget, 
                'view finance budgets', 
                'budget.finance', 
                "Budget Ready for Finance: #{$budget->id}",
                "The budget for {$budget->department?->name} has been department-approved and requires your review."
            );
        }

        // CEO Alert: If both Dept and Finance are Approved, and one of them just changed
        $deptApproved = $budget->status_department === WeeklyBudgetStatusDepartment::Approved;
        $financeApproved = $budget->status_finance === WeeklyBudgetStatusFinance::Approved;
        if (($budget->wasChanged('status_department') || $budget->wasChanged('status_finance')) && $deptApproved && $financeApproved) {
            self::notifyUsersByPermission(
                $budget, 
                'view ceo budgets', 
                'budget.ceo', 
                "Budget Ready for CEO: #{$budget->id}",
                "The budget for {$budget->department?->name} has been finance-approved and requires your final review."
            );
        }

        // Department Alert: If ANY status changes
        if ($budget->wasChanged(['status_department', 'status_finance', 'status_ceo'])) {
            self::notifyDepartmentUsers(
                $budget,
                'budget.department',
                "Budget Status Updated: #{$budget->id}",
                "The status of your department's budget has changed."
            );
        }
    }

    private static function notifyUsersByPermission(WeeklyBudget $budget, string $permission, string $type, string $title, string $body): void
    {
        $userIds = User::permission($permission)->pluck('id')->toArray();
        self::insertNotifications($budget, $userIds, $type, $title, $body);
    }

    private static function notifyDepartmentUsers(WeeklyBudget $budget, string $type, string $title, string $body): void
    {
        if (!$budget->department_id) {
            return;
        }

        // Get users with "view department budgets" AND matching department_id
        $userIds = User::permission('view department budgets')
            ->whereHas('employee', function ($query) use ($budget) {
                $query->where('department_id', $budget->department_id);
            })
            ->pluck('id')
            ->toArray();

        self::insertNotifications($budget, $userIds, $type, $title, $body);
    }

    private static function insertNotifications(WeeklyBudget $budget, array $userIds, string $type, string $title, string $body): void
    {
        $rows = collect($userIds)->filter()->unique()->map(fn($id) => [
            'user_id' => $id,
            'weekly_budget_id' => $budget->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'created_at' => now(),
            'updated_at' => now(),
            'read_at' => null,
        ])->all();

        if (!empty($rows)) {
            WeeklyBudgetNotification::insert($rows);
        }
    }
}
