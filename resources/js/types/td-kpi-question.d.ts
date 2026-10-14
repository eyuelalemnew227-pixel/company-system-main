export type TdKpiRoleOption = {
	id: number;
	name: string;
};

export type TdKpiInputTypeOption = {
	id: number;
	name: string;
	type_identifier: string;
};

export type TdKpiQuestionChoice = {
	id?: number;
	label: string;
	value: string;
	order_index?: number;
};

export type TdKpiQuestion = {
	id: number;
	label: string;
	kpi_role_id: number;
	form_input_type_id: number;
	status: 'active' | 'inactive';
	created_at: string;
	updated_at: string;
	role?: TdKpiRoleOption;
	input_type?: TdKpiInputTypeOption;
	choices?: TdKpiQuestionChoice[];
};

export type TdKpiQuestionPagination = {
	data: TdKpiQuestion[];
	current_page: number;
	first_page_url: string;
	from: number;
	last_page: number;
	last_page_url: string;
	links: Array<{
		url: string | null;
		label: string;
		active: boolean;
	}>;
	next_page_url: string | null;
	path: string;
	per_page: number;
	prev_page_url: string | null;
	to: number;
	total: number;
};
