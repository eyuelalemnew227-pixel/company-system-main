import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
	user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string | null;
}

export interface NavGroup {
	title: string;
	items: NavItem[];
}

export interface NavItem {
	title: string;
	href: string;
	icon?: LucideIcon | null;
	isActive?: boolean;
	permission?: string;
}

export interface SharedData {
	name: string;
	quote: { message: string; author: string };
	auth: Auth;
	ziggy: Config & { location: string };
	sidebarOpen: boolean;
	[key: string]: unknown;
}

export interface User {
	id: number;
	name: string;
	email: string;
	avatar?: string;
	email_verified_at: string | null;
	created_at: string;
	updated_at: string;
	[key: string]: unknown; // This allows for additional properties...
}
export interface EmployeeOption {
    id: number;
    employee_code: string;
	branch_id: number;
	department_id: number;
    name: string;
}
export interface PaginationData<T> {
	data: T[];
	links: Array<{
		url: string | null;
		label: string;
		active: boolean;
	}>;
	from: number;
	to: number;
	total: number;
	current_page: number;
	last_page: number;
	per_page: number;
}

export interface Branch {
  id: number;
  name: string;
  departments: Department[];
}

export interface Department {
  id: number;
  name: string;
}
