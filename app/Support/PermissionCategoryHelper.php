<?php

namespace App\Support;

class PermissionCategoryHelper
{
    /**
     * Categorize a permission string into a human-readable module name.
     */
    public static function getCategory(string $permission): string
    {
        $perm = strtolower(trim($permission));

        // Prefix check (e.g. ticket.view, memo.create, training.courses.manage)
        if (str_starts_with($perm, 'ticket.')) {
            return 'Tickets & Support';
        }
        if (str_starts_with($perm, 'memo.')) {
            return 'Memos & Documents';
        }
        if (str_starts_with($perm, 'training.')) {
            return 'Training & LMS';
        }

        // Keyword rules for action-entity format (e.g. "view users", "create roles", "manage weekly budgets")
        if (self::containsAny($perm, ['ticket', 'tickets'])) {
            return 'Tickets & Support';
        }
        if (self::containsAny($perm, ['memo', 'memos'])) {
            return 'Memos & Documents';
        }
        if (self::containsAny($perm, ['training', 'course', 'quiz', 'sop', 'certificate', 'agenda', 'forum'])) {
            return 'Training & LMS';
        }
        if (self::containsAny($perm, ['user', 'users', 'employee', 'employees', 'position', 'positions', 'department', 'departments', 'branch', 'branches', 'manager', 'managers'])) {
            return 'User & Organization';
        }
        if (self::containsAny($perm, ['role', 'roles', 'permission', 'permissions'])) {
            return 'Roles & Access Control';
        }
        if (self::containsAny($perm, ['budget', 'budgets', 'finance', 'expense', 'ceo', 'sales', 'bank', 'payment', 'cost'])) {
            return 'Budget & Finance';
        }
        if (self::containsAny($perm, ['inventory', 'spare part', 'spare parts', 'product', 'products', 'category', 'categories', 'count'])) {
            return 'Inventory & Assets';
        }
        if (self::containsAny($perm, ['evaluation', 'evaluations', 'evaluator', 'evaluates', 'question', 'questions', 'evaluable', 'appraisal', 'results', 'fill evaluation'])) {
            return 'Evaluations & Performance';
        }
        if (self::containsAny($perm, ['pre-order', 'pre-orders', 'walkin', 'collection days', 'order types', 'order', 'orders', 'broadcast'])) {
            return 'Pre-Orders & Sales';
        }
        if (self::containsAny($perm, ['telecom', 'sms'])) {
            return 'Telecom & SMS';
        }
        if (self::containsAny($perm, ['telegram'])) {
            return 'Telegram Integration';
        }

        return 'System & General';
    }

    /**
     * Group a list of permission strings by category.
     *
     * @param array<int, string> $permissions
     * @return array<string, array<int, string>>
     */
    public static function groupPermissions(array $permissions): array
    {
        $grouped = [];
        foreach ($permissions as $permission) {
            $category = self::getCategory($permission);
            if (!isset($grouped[$category])) {
                $grouped[$category] = [];
            }
            $grouped[$category][] = $permission;
        }

        // Sort categories alphabetically with System & General last
        ksort($grouped);
        if (isset($grouped['System & General'])) {
            $general = $grouped['System & General'];
            unset($grouped['System & General']);
            $grouped['System & General'] = $general;
        }

        return $grouped;
    }

    private static function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }
        return false;
    }
}
