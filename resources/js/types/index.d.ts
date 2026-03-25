import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
	user: User;
	permissions: string[];
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
	iconName?: string | null;
	isActive?: boolean;
	permission?: string;
	target?: string;
	rel?: string;
	external?: boolean;
	badge?: string;
}

export interface ExternalLinkItem {
	id?: number;
	external_link_section_id?: number;
	title: string;
	href: string;
	icon?: string | null;
	iconName?: string | null;
	permission?: string;
	target?: string;
	rel?: string;
	external?: boolean;
	is_active?: boolean;
	is_external?: boolean;
	sort?: number;
}

export interface ExternalLinkSection {
	id?: number;
	label: string;
	icon?: string | null;
	items?: ExternalLinkItem[];
	links?: ExternalLinkItem[];
	sort?: number;
	is_active?: boolean;
}

export interface SharedData {
	name: string;
	quote: { message: string; author: string };
	auth: Auth;
	ziggy: Config & { location: string };
	sidebarOpen: boolean;
	externalLinks?: ExternalLinkSection[];
	flash: {
		success: string | null;
		error: string | null;
		message: string | null;
	};
	[key: string]: unknown;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & SharedData;

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
