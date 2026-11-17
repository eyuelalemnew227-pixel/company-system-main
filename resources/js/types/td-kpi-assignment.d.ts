export type TdKpiAssignmentNote = {
	from: string;
	proposed_date: string | null;
	module: string | null;
	extra_info: string | null;
};

export type TdKpiAssignmentRow = {
	source: 'evaluation_result' | 'training_request';
	override_id: number | null;
	training_request_id: number | null;
	row_key: string;
	assignment_id: number | null;
	employee_id: number | null;
	employee_name: string;
	employee_code: string | null;
	branch: string | null;
	department: string | null;
	training_type: string | null;
	assigned_training_content: string | null;
	proposed_training_start_at: string | null;
	proposed_training_start_at_input: string | null;
	proposed_training_end_at: string | null;
	proposed_training_end_at_input: string | null;
	actual_training_start_at: string | null;
	actual_training_start_at_input: string | null;
	actual_training_end_at: string | null;
	actual_training_end_at_input: string | null;
	actual_date_differs: boolean;
	is_training_held: boolean;
	attendance: boolean;
	assessment_name: string | null;
	post_assessment_score: number | null;
	fiscal_year_name: string | null;
	fiscal_month_name: string | null;
	training_type_id: number | null;
	assigned_training_content_id: number | null;
	assessment_id: number | null;
	content_locked: boolean;
	attendance_locked: boolean;
	proposed_date_change_pending: boolean;
	proposed_date_change_open: boolean;
	note: TdKpiAssignmentNote;
};

export type TdKpiOption = { id: number; name: string };

export type TdKpiTakeChoice = { label: string; value: string };

export type TdKpiTakeQuestion = {
	id: number;
	question_id: number | null;
	label: string | null;
	type_identifier: string;
	choices: TdKpiTakeChoice[];
	response: string | string[] | null;
	is_correct?: boolean | null;
};

export type TdKpiTakeAssignment = {
	id: number;
	submitted: boolean;
	submitted_at: string | null;
	post_assessment_score: number | null;
	employee_name: string;
	employee_code: string | null;
	branch: string | null;
	department: string | null;
	training_type: string | null;
	assigned_training_content: string | null;
	proposed_training_start_at: string | null;
	proposed_training_end_at: string | null;
	is_training_held: boolean;
	attendance: boolean;
	assessment_name: string | null;
	fiscal_year_name: string | null;
	fiscal_month_name: string | null;
};
