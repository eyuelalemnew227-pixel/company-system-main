<?php

namespace App\Services;

use App\Models\ExpenseBudget;
use App\Models\ExpenseBudgetActivityLog;
use App\Models\ExpenseBudgetItem;
use App\Models\User;
use App\Support\ExpenseBudgetAccess;

class ExpenseBudgetActivityLogger
{
    public function logItemCreated(ExpenseBudgetItem $item, ?User $user = null): ExpenseBudgetActivityLog
    {
        $item = $this->loadItemRelations($item);
        $attributes = $this->itemAttributes($item);

        return $this->write(
            action: ExpenseBudgetActivityLog::ACTION_ITEM_CREATED,
            budget: $item->expenseBudget,
            item: $item,
            user: $user,
            summary: sprintf(
                'Created %s with planned budget %s ETB for %s / %s at %s%s.',
                $attributes['expense_item'] ?? 'expense item',
                $this->formatAmount($attributes['planned_budget']),
                $attributes['fiscal_year'] ?? 'N/A',
                $attributes['fiscal_month'] ?? 'N/A',
                $attributes['branch'] ?? 'N/A',
                $attributes['department'] ? " ({$attributes['department']})" : '',
            ),
            newValues: $attributes,
        );
    }

    public function logItemUpdated(
        ExpenseBudgetItem $item,
        array $oldValues,
        array $newValues,
        ?User $user = null,
    ): ExpenseBudgetActivityLog {
        $item = $this->loadItemRelations($item);

        return $this->write(
            action: ExpenseBudgetActivityLog::ACTION_ITEM_UPDATED,
            budget: $item->expenseBudget,
            item: $item,
            user: $user,
            summary: $this->buildUpdateSummary($oldValues, $newValues),
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    public function logItemDeleted(ExpenseBudgetItem $item, ExpenseBudget $budget, ?User $user = null): ExpenseBudgetActivityLog
    {
        $item = $this->loadItemRelations($item);
        $attributes = $this->itemAttributes($item);

        return $this->write(
            action: ExpenseBudgetActivityLog::ACTION_ITEM_DELETED,
            budget: $budget,
            item: $item,
            user: $user,
            summary: sprintf(
                'Deleted %s with planned budget %s ETB for %s / %s at %s%s.',
                $attributes['expense_item'] ?? 'expense item',
                $this->formatAmount($attributes['planned_budget']),
                $attributes['fiscal_year'] ?? 'N/A',
                $attributes['fiscal_month'] ?? 'N/A',
                $attributes['branch'] ?? 'N/A',
                $attributes['department'] ? " ({$attributes['department']})" : '',
            ),
            oldValues: $attributes,
        );
    }

    public function logBudgetCreated(ExpenseBudget $budget, ?User $user = null): ExpenseBudgetActivityLog
    {
        $budget = $this->loadBudgetRelations($budget);
        $context = $this->budgetContext($budget);

        return $this->write(
            action: ExpenseBudgetActivityLog::ACTION_BUDGET_CREATED,
            budget: $budget,
            item: null,
            user: $user,
            summary: sprintf(
                'Created expense budget scope for %s / %s at %s%s.',
                $context['fiscal_year'] ?? 'N/A',
                $context['fiscal_month'] ?? 'N/A',
                $context['branch'] ?? 'N/A',
                $context['department'] ? " ({$context['department']})" : '',
            ),
            newValues: $context,
        );
    }

    public function logBudgetDeleted(ExpenseBudget $budget, ?User $user = null): ExpenseBudgetActivityLog
    {
        $budget = $this->loadBudgetRelations($budget);
        $context = $this->budgetContext($budget);

        return $this->write(
            action: ExpenseBudgetActivityLog::ACTION_BUDGET_DELETED,
            budget: $budget,
            item: null,
            user: $user,
            summary: sprintf(
                'Removed expense budget scope for %s / %s at %s%s.',
                $context['fiscal_year'] ?? 'N/A',
                $context['fiscal_month'] ?? 'N/A',
                $context['branch'] ?? 'N/A',
                $context['department'] ? " ({$context['department']})" : '',
            ),
            oldValues: $context,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function itemAttributes(ExpenseBudgetItem $item): array
    {
        $item = $this->loadItemRelations($item);
        $budget = $item->expenseBudget;

        return array_merge($this->budgetContext($budget), [
            'expense_item_id' => $item->expense_item_id,
            'expense_item' => $item->expenseItem?->expense_type,
            'planned_budget' => $item->planned_budget !== null ? (string) $item->planned_budget : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function budgetContext(?ExpenseBudget $budget): array
    {
        if (! $budget) {
            return [];
        }

        $budget = $this->loadBudgetRelations($budget);

        return [
            'fiscal_year_id' => $budget->fiscal_year_id,
            'fiscal_year' => $budget->fiscalYear?->name,
            'fiscal_month_id' => $budget->fiscal_month_id,
            'fiscal_month' => $budget->fiscalMonth?->name,
            'branch_id' => $budget->branch_id,
            'branch' => $budget->branch?->name,
            'department_id' => $budget->department_id,
            'department' => $budget->department?->name,
            'budget_amount' => $budget->budget_amount !== null ? (string) $budget->budget_amount : null,
        ];
    }

    private function write(
        string $action,
        ExpenseBudget $budget,
        ?ExpenseBudgetItem $item,
        ?User $user,
        string $summary,
        ?array $oldValues = null,
        ?array $newValues = null,
        array $meta = [],
    ): ExpenseBudgetActivityLog {
        return ExpenseBudgetActivityLog::create([
            'expense_budget_id' => $budget->id,
            'expense_budget_item_id' => $item?->id,
            'user_id' => ($user ?? auth()->user())?->id,
            'action' => $action,
            'summary' => $summary,
            'old_values' => $oldValues ?: null,
            'new_values' => $newValues ?: null,
            'meta' => array_merge($this->defaultMeta($user), $meta) ?: null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultMeta(?User $user): array
    {
        $user ??= auth()->user();

        return [
            'manage_window_active' => ExpenseBudgetAccess::isWithinManageWindow(),
            'user_roles' => $user?->getRoleNames()->values()->all() ?? [],
        ];
    }

    private function loadItemRelations(ExpenseBudgetItem $item): ExpenseBudgetItem
    {
        return $item->loadMissing([
            'expenseItem',
            'expenseBudget.fiscalYear',
            'expenseBudget.fiscalMonth',
            'expenseBudget.branch',
            'expenseBudget.department',
        ]);
    }

    private function loadBudgetRelations(ExpenseBudget $budget): ExpenseBudget
    {
        return $budget->loadMissing([
            'fiscalYear',
            'fiscalMonth',
            'branch',
            'department',
        ]);
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    private function buildUpdateSummary(array $oldValues, array $newValues): string
    {
        $parts = [];

        if (($oldValues['expense_item'] ?? null) !== ($newValues['expense_item'] ?? null)) {
            $parts[] = sprintf(
                'expense item from %s to %s',
                $oldValues['expense_item'] ?? 'N/A',
                $newValues['expense_item'] ?? 'N/A',
            );
        }

        if (($oldValues['planned_budget'] ?? null) !== ($newValues['planned_budget'] ?? null)) {
            $parts[] = sprintf(
                'planned budget from %s to %s ETB',
                $this->formatAmount($oldValues['planned_budget'] ?? null),
                $this->formatAmount($newValues['planned_budget'] ?? null),
            );
        }

        $scopeFields = [
            'fiscal_year' => 'fiscal year',
            'fiscal_month' => 'fiscal month',
            'branch' => 'branch',
            'department' => 'department',
        ];

        foreach ($scopeFields as $field => $label) {
            if (($oldValues[$field] ?? null) !== ($newValues[$field] ?? null)) {
                $parts[] = sprintf(
                    '%s from %s to %s',
                    $label,
                    $oldValues[$field] ?? 'N/A',
                    $newValues[$field] ?? 'N/A',
                );
            }
        }

        if ($parts === []) {
            return 'Updated expense budget item.';
        }

        return 'Updated '.implode(', ', $parts).'.';
    }

    private function formatAmount(mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'N/A';
        }

        return number_format((float) $value, 2);
    }

}
