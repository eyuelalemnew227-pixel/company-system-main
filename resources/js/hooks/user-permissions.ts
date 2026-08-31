import { usePage } from '@inertiajs/react';

type AuthProps = {
	auth?: {
		user?: {
			roles?: string[];
		};
		roles?: string[];
		permissions?: string[];
		canManageExpenseBudget?: boolean;
	};
};

const MANAGE_PERMISSIONS = [
	'manage expense budget anytime',
	'manage expense budget within time window',
];

export function usePermission() {
	const { props } = usePage<AuthProps>();
	const permissions = props.auth?.permissions || [];
	const roles = props.auth?.roles || props.auth?.user?.roles || [];
	const isSuperAdmin = Array.isArray(roles)
		? roles.some((r: any) => (typeof r === 'string' ? r.toLowerCase() === 'super admin' : r?.name?.toLowerCase() === 'super admin'))
		: false;
	const canManageExpenseBudget = props.auth?.canManageExpenseBudget ?? false;

	const can = (permission: string): boolean => {
		const requestedPermissions = permission
			.split('|')
			.map((value) => value.trim())
			.filter(Boolean);

		return requestedPermissions.some((value) => {
			const requiresExplicitGrant =
				value.startsWith('memo.') ||
				value.startsWith('training.online.') ||
				value.startsWith('telecom.') ||
				value === 'view telecom management';

			if (isSuperAdmin && !requiresExplicitGrant) {
				return true;
			}

			if (MANAGE_PERMISSIONS.includes(value)) {
				return canManageExpenseBudget;
			}

			if (value.startsWith('role:')) {
				const roleName = value.substring(5).trim().toLowerCase();
				return Array.isArray(roles) && roles.some((r: any) => (typeof r === 'string' ? r.toLowerCase() === roleName : r?.name?.toLowerCase() === roleName));
			}

			return permissions.includes(value);
		});
	};

	const hasExpenseBudgetManagePermission = isSuperAdmin || MANAGE_PERMISSIONS.some((value) => permissions.includes(value));

	return { can, isSuperAdmin, canManageExpenseBudget, hasExpenseBudgetManagePermission };
}

