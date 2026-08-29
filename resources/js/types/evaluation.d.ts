export type EvaluatorGroup = {
    id: number;
    name: string;
    question_group_id: number;
    question_group?: {
        id: number;
        name: string;
    };
};

export type EvaluatesGroup = {
    id: number;
    name: string;
    question_group_id: number;
    evaluable_type: 'employee' | 'department' | 'branch' | 'other';
    question_group?: {
        id: number;
        name: string;
    };
};

export type Evaluation = {
    id: number;
    name: string;
    evaluator_group_id: number;
    evaluates_group_id: number;
    status: 'pending' | 'in_progress' | 'completed';
    created_at: string;
    updated_at: string;
    evaluator_group?: EvaluatorGroup;
    evaluates_group?: EvaluatesGroup;
    evaluation_responses?: any[];
};

export type EvaluationPagination = {
    data: Evaluation[];
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

