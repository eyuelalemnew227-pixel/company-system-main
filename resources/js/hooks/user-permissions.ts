import { usePage } from '@inertiajs/react';

type AuthProps = {
	auth?: {
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
	const canManageExpenseBudget = props.auth?.canManageExpenseBudget ?? false;

	const can = (permission: string): boolean => {
		const requestedPermissions = permission
			.split('|')
			.map((value) => value.trim())
			.filter(Boolean);

		if (requestedPermissions.some((value) => MANAGE_PERMISSIONS.includes(value))) {
			return canManageExpenseBudget;
		}

		return requestedPermissions.some((value) => permissions.includes(value));
	};

	const hasExpenseBudgetManagePermission = MANAGE_PERMISSIONS.some((value) => permissions.includes(value));

	return { can, canManageExpenseBudget, hasExpenseBudgetManagePermission };
}
