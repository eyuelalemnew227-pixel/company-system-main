import { GroupedPermissions } from '@/types/role_permission';

/**
 * Client-side permission categorizer matching backend PermissionCategoryHelper.
 */
export function getPermissionCategory(permission: string): string {
    const perm = permission.toLowerCase().trim();

    if (perm.startsWith('ticket.')) return 'Tickets & Support';
    if (perm.startsWith('memo.')) return 'Memos & Documents';
    if (perm.startsWith('training.')) return 'Training & LMS';
    if (perm === 'view telecom management' || perm.startsWith('telecom.')) return 'Telecom & SMS';

    const containsAny = (needles: string[]) => needles.some((needle) => perm.includes(needle));

    if (containsAny(['ticket', 'tickets'])) return 'Tickets & Support';
    if (containsAny(['memo', 'memos'])) return 'Memos & Documents';
    if (containsAny(['training', 'course', 'quiz', 'sop', 'certificate', 'agenda', 'forum'])) return 'Training & LMS';
    if (containsAny(['user', 'users', 'employee', 'employees', 'position', 'positions', 'department', 'departments', 'branch', 'branches', 'manager', 'managers'])) return 'User & Organization';
    if (containsAny(['role', 'roles', 'permission', 'permissions'])) return 'Roles & Access Control';
    if (containsAny(['budget', 'budgets', 'finance', 'expense', 'ceo', 'sales', 'bank', 'payment', 'cost'])) return 'Budget & Finance';
    if (containsAny(['inventory', 'spare part', 'spare parts', 'product', 'products', 'category', 'categories', 'count'])) return 'Inventory & Assets';
    if (containsAny(['evaluation', 'evaluations', 'evaluator', 'evaluates', 'question', 'questions', 'evaluable', 'appraisal', 'results', 'fill evaluation'])) return 'Evaluations & Performance';
    if (containsAny(['pre-order', 'pre-orders', 'walkin', 'collection days', 'order types', 'order', 'orders', 'broadcast'])) return 'Pre-Orders & Sales';
    if (containsAny(['telecom', 'sms'])) return 'Telecom & SMS';
    if (containsAny(['telegram'])) return 'Telegram Integration';

    return 'System & General';
}

export function groupPermissionsList(permissions: string[]): GroupedPermissions {
    const grouped: GroupedPermissions = {};
    permissions.forEach((perm) => {
        const cat = getPermissionCategory(perm);
        if (!grouped[cat]) {
            grouped[cat] = [];
        }
        grouped[cat].push(perm);
    });

    // Move 'System & General' to the end
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        if (a === 'System & General') return 1;
        if (b === 'System & General') return -1;
        return a.localeCompare(b);
    });

    const result: GroupedPermissions = {};
    sortedKeys.forEach((key) => {
        result[key] = grouped[key];
    });

    return result;
}

/**
 * Format permission string into a human friendly label.
 * e.g. "ticket.report.view" -> "Report View"
 * e.g. "manage expense budget anytime" -> "Manage Expense Budget Anytime"
 */
export function formatPermissionLabel(permission: string): string {
    if (permission.includes('.')) {
        const parts = permission.split('.');
        const rest = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
        return rest
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return permission
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
