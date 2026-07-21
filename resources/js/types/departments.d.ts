export interface Department {
	id: number;
	name: string;
	description: string | null;
	is_active?: boolean;
	is_active_on_ticketing?: boolean;
	is_active_on_weekly_budget?: boolean;
	created_at: string;
	updated_at: string;
}
