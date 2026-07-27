<?php

namespace App\Services;

use App\Models\ExpenseItem;
use App\Models\User;
use App\Models\WeeklyBudget;
use App\Models\WeeklyBudgetActivityLog;
use BackedEnum;
use Illuminate\Support\Str;

class WeeklyBudgetActivityLogger
{
    /**
     * @var array<int, string|null>
     */
    private array $paymentTypeNames = [];

    public function logCreated(WeeklyBudget $budget, ?User $user = null): WeeklyBudgetActivityLog
    {
        $attributes = $this->attributes($budget);

        return $this->write(
            action: WeeklyBudgetActivityLog::ACTION_REQUEST_CREATED,
            budget: $budget,
            user: $user,
            summary: sprintf(
                'Created weekly budget request for %s%s, %s / %s, week %s, amount %s ETB.',
                $attributes['department'] ?? 'N/A',
                $attributes['branch'] ? " ({$attributes['branch']})" : '',
                $attributes['fiscal_year'] ?? 'N/A',
                $attributes['fiscal_month'] ?? 'N/A',
                $attributes['week_number'] ?? 'N/A',
                $this->formatAmount($attributes['amount'] ?? null),
            ),
            newValues: $attributes,
        );
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $meta
     */
    public function logChanges(
        WeeklyBudget $budget,
        array $oldValues,
        string $action = WeeklyBudgetActivityLog::ACTION_REQUEST_UPDATED,
        string $subject = 'weekly budget request',
        ?User $user = null,
        array $meta = [],
    ): ?WeeklyBudgetActivityLog {
        $newValues = $this->attributes($budget);
        [$changedOld, $changedNew] = $this->changedValues($oldValues, $newValues);

        if ($changedNew === []) {
            return null;
        }

        return $this->write(
            action: $action,
            budget: $budget,
            user: $user,
            summary: $this->buildUpdateSummary($subject, $changedOld, $changedNew),
            oldValues: $changedOld,
            newValues: $changedNew,
            meta: $meta,
        );
    }

    public function logDeleted(WeeklyBudget $budget, ?User $user = null): WeeklyBudgetActivityLog
    {
        $attributes = $this->attributes($budget);

        return $this->write(
            action: WeeklyBudgetActivityLog::ACTION_REQUEST_DELETED,
            budget: $budget,
            user: $user,
            summary: sprintf(
                'Deleted weekly budget request for %s%s, %s / %s, week %s.',
                $attributes['department'] ?? 'N/A',
                $attributes['branch'] ? " ({$attributes['branch']})" : '',
                $attributes['fiscal_year'] ?? 'N/A',
                $attributes['fiscal_month'] ?? 'N/A',
                $attributes['week_number'] ?? 'N/A',
            ),
            oldValues: $attributes,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function attributes(WeeklyBudget $budget): array
    {
        $budget = $budget->load([
            'branch',
            'department',
            'fiscalYear',
            'fiscalMonth',
            'creator',
        ]);

        return [
            'department_id' => $budget->department_id,
            'department' => $budget->department?->name,
            'branch_id' => $budget->branch_id,
            'branch' => $budget->branch?->name,
            'fiscal_year_id' => $budget->fiscal_year_id,
            'fiscal_year' => $budget->fiscalYear?->name,
            'fiscal_month_id' => $budget->fiscal_month_id,
            'fiscal_month' => $budget->fiscalMonth?->name,
            'week_number' => $budget->week_number,
            'week_start_date' => $budget->week_start_date?->toDateString(),
            'week_end_date' => $budget->week_end_date?->toDateString(),
            'request_type' => $this->enumValue($budget->request_type),
            'status_finance' => $this->enumValue($budget->status_finance),
            'status_department' => $this->enumValue($budget->status_department),
            'status_ceo' => $this->enumValue($budget->status_ceo),
            'amount' => $budget->amount !== null ? (string) $budget->amount : null,
            'description' => $budget->description,
            'note' => $budget->note,
            'payment_category_id' => $budget->payment_category_id,
            'payment_category' => match ((int) $budget->payment_category_id) {
                1 => 'Expense',
                2 => 'Cost of Sales',
                default => null,
            },
            'payment_type_id' => $budget->payment_type_id,
            'payment_type' => $this->paymentTypeName($budget->payment_type_id),
            'created_by' => $budget->created_by,
            'created_by_name' => $budget->creator?->name,
        ];
    }

    private function write(
        string $action,
        WeeklyBudget $budget,
        ?User $user,
        string $summary,
        ?array $oldValues = null,
        ?array $newValues = null,
        array $meta = [],
    ): WeeklyBudgetActivityLog {
        return WeeklyBudgetActivityLog::create([
            'weekly_budget_id' => $budget->id,
            'user_id' => ($user ?? auth()->user())?->id,
            'action' => $action,
            'summary' => Str::limit($summary, 500),
            'old_values' => $oldValues ?: null,
            'new_values' => $newValues ?: null,
            'meta' => array_merge($this->defaultMeta($budget, $user), $meta) ?: null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultMeta(WeeklyBudget $budget, ?User $user): array
    {
        $user ??= auth()->user();

        return [
            'department_edit_window_active' => $budget->isWithinDepartmentEditWindow(),
            'user_roles' => $user?->getRoleNames()->values()->all() ?? [],
        ];
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function changedValues(array $oldValues, array $newValues): array
    {
        $changedOld = [];
        $changedNew = [];

        foreach ($newValues as $key => $newValue) {
            $oldValue = $oldValues[$key] ?? null;

            if ($oldValue !== $newValue) {
                $changedOld[$key] = $oldValue;
                $changedNew[$key] = $newValue;
            }
        }

        return [$changedOld, $changedNew];
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    private function buildUpdateSummary(string $subject, array $oldValues, array $newValues): string
    {
        $labels = [
            'department' => 'department',
            'branch' => 'branch',
            'fiscal_year' => 'fiscal year',
            'fiscal_month' => 'fiscal month',
            'week_number' => 'week',
            'week_start_date' => 'week start',
            'week_end_date' => 'week end',
            'request_type' => 'request type',
            'status_finance' => 'finance status',
            'status_department' => 'department status',
            'status_ceo' => 'CEO status',
            'amount' => 'amount',
            'description' => 'description',
            'note' => 'note',
            'payment_category' => 'payment category',
            'payment_type' => 'payment type',
        ];
        $parts = [];

        foreach ($labels as $field => $label) {
            if (! array_key_exists($field, $newValues)) {
                continue;
            }

            $oldValue = $this->displayValue($field, $oldValues[$field] ?? null);
            $newValue = $this->displayValue($field, $newValues[$field] ?? null);
            $parts[] = "{$label} from {$oldValue} to {$newValue}";
        }

        if ($parts === []) {
            return "Updated {$subject}.";
        }

        return 'Updated '.$subject.': '.implode(', ', $parts).'.';
    }

    private function displayValue(string $field, mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'N/A';
        }

        if ($field === 'amount') {
            return $this->formatAmount($value).' ETB';
        }

        if (in_array($field, ['description', 'note'], true)) {
            return '"'.Str::limit((string) $value, 60).'"';
        }

        return (string) $value;
    }

    private function enumValue(mixed $value): mixed
    {
        return $value instanceof BackedEnum ? $value->value : $value;
    }

    private function paymentTypeName(?int $paymentTypeId): ?string
    {
        if (! $paymentTypeId) {
            return null;
        }

        if (! array_key_exists($paymentTypeId, $this->paymentTypeNames)) {
            $this->paymentTypeNames[$paymentTypeId] = ExpenseItem::query()
                ->where('expense_parent_acc_code', $paymentTypeId)
                ->value('expense_type');
        }

        return $this->paymentTypeNames[$paymentTypeId];
    }

    private function formatAmount(mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'N/A';
        }

        return number_format((float) $value, 2);
    }
}
