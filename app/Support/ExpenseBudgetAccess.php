<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\ExpenseBudget;
use App\Models\ExpenseBudgetItem;
use App\Models\User;
use Carbon\CarbonInterface;

class ExpenseBudgetAccess
{
    public static function manageAnytimePermission(): string
    {
        return (string) config('expense_budget.permissions.manage_anytime', 'manage expense budget anytime');
    }

    public static function manageWindowedPermission(): string
    {
        return (string) config('expense_budget.permissions.manage_windowed', 'manage expense budget within time window');
    }

    public static function viewPermission(): string
    {
        return (string) config('expense_budget.permissions.view', 'view expense budgets');
    }

    public static function canView(?User $user = null): bool
    {
        $user ??= auth()->user();

        return $user?->can(self::viewPermission()) ?? false;
    }

    public static function hasManagePermission(?User $user = null): bool
    {
        $user ??= auth()->user();

        if (! $user) {
            return false;
        }

        return $user->can(self::manageAnytimePermission())
            || $user->can(self::manageWindowedPermission());
    }

    public static function canManage(?User $user = null): bool
    {
        $user ??= auth()->user();

        if (! $user) {
            return false;
        }

        if ($user->can(self::manageAnytimePermission())) {
            return true;
        }

        if ($user->can(self::manageWindowedPermission())) {
            return self::isWithinManageWindow();
        }

        return false;
    }

    public static function canViewItemHistory(?User $user, ExpenseBudgetItem $item): bool
    {
        if (! self::canView($user)) {
            return false;
        }

        if (self::hasUnrestrictedViewAccess($user)) {
            return true;
        }

        $item->loadMissing(['expenseBudget.branch', 'expenseBudget.department']);
        $budget = $item->expenseBudget;

        if (! $budget) {
            return false;
        }

        return self::canViewBudgetHistory($user, $budget);
    }

    public static function canViewBudgetHistory(?User $user, ExpenseBudget $budget): bool
    {
        if (! $user || ! self::canView($user)) {
            return false;
        }

        if (self::hasUnrestrictedViewAccess($user)) {
            return true;
        }

        $budget->loadMissing('branch');

        if ($user->hasRole('Department Manager')) {
            if (! self::isHeadOfficeBranch($budget->branch) || ! $budget->department_id) {
                return false;
            }

            return $user->isManagerOfDepartment((int) $budget->department_id);
        }

        if ($user->hasRole('Branch Manager')) {
            if (self::isHeadOfficeBranch($budget->branch)) {
                return false;
            }

            $userBranchId = $user->employee?->branch_id;

            return $userBranchId && (int) $budget->branch_id === (int) $userBranchId;
        }

        return false;
    }

    public static function hasUnrestrictedViewAccess(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->can(self::manageAnytimePermission());
    }

    public static function isWithinManageWindow(?CarbonInterface $date = null): bool
    {
        $date ??= now();
        $startDay = (int) config('expense_budget.manage_window.start_day', 5);
        $endDay = (int) config('expense_budget.manage_window.end_day', 12);
        $day = $date->day;

        return $day >= $startDay && $day <= $endDay;
    }

    public static function manageDeniedMessage(): string
    {
        $user = auth()->user();

        if ($user?->can(self::manageWindowedPermission()) && ! $user->can(self::manageAnytimePermission())) {
            $startDay = (int) config('expense_budget.manage_window.start_day', 5);
            $endDay = (int) config('expense_budget.manage_window.end_day', 12);

            return "Expense budgets can only be managed from the {$startDay}th to the {$endDay}th of each month.";
        }

        return 'You do not have permission to manage expense budgets.';
    }

    public static function viewHistoryDeniedMessage(): string
    {
        return 'You can only view activity history for your own branch or department.';
    }

    public static function isHeadOfficeBranch(?Branch $branch): bool
    {
        if (! $branch) {
            return false;
        }

        if (strcasecmp($branch->branch_code ?? '', 'HO') === 0) {
            return true;
        }

        return str_contains($branch->name, 'Head Office');
    }
}
