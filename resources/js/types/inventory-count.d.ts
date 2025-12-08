export type InventoryCount = {
	id: number;
	branch_id: number;
	inventory_period_id: number;
	child_category_id: number;
	product_id: number;
	count: string;
	is_approved: boolean;
	approved_by: number | null;
	approved_at: string | null;
	created_by: number;
	updated_by: number;
	created_at: string;
	updated_at: string;
	branch?: {
		id: number;
		name: string;
	};
	inventory_period?: {
		id: number;
		inventory_period_name: string;
		status?: string;
	};
	child_category?: {
		id: number;
		child_name: string;
	};
	product?: {
		id: number;
		product_name: string;
	};
	creator?: {
		id: number;
		name: string;
	};
	updater?: {
		id: number;
		name: string;
	};
	approver?: {
		id: number;
		name: string;
	};
};

export type Branch = {
	id: number;
	name: string;
};

export type ChildCategory = {
	id: number;
	child_name: string;
};

export type Product = {
	id: number;
	product_name: string;
	product_code?: string | null;
	unit_price?: number | null;
	child_category_id: number | null;
	min_count_threshold?: string | null;
	max_count_threshold?: string | null;
};

export type InventoryPeriod = {
	id: number;
	inventory_period_name: string;
};
