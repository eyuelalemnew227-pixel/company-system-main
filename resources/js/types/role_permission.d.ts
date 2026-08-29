import { Pagination } from './pagination';

export interface SinglePermission {
	id: number;
	name: string;
	category?: string;
	created_at: string;
}

export interface SingleRole {
	id: number;
	name: string;
	created_at: string;
	permissions: string[];
	grouped_permissions?: Record<string, string[]>;
}

export interface RolePermission {
	id: number;
	name: string;
	permissions: SinglePermission[];
	created_at: string;
}

export interface Permission extends Pagination {
	data: SinglePermission[];
}

export interface Role extends Pagination {
	data: SingleRole[];
}

export type GroupedPermissions = Record<string, string[]>;

export interface RoleWithPermissionMeta {
	permissions: string[];
	grouped: GroupedPermissions;
}

export type RolesWithPermissionsMap = Record<string, RoleWithPermissionMeta>;
