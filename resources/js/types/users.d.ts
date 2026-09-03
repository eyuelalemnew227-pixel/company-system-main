import { Pagination } from './pagination';
import { SingleRole } from './role_permission';


export interface SingleUser {
    id: number;
    employee_id?: number;
    name: string;
    email: string;
    is_active: boolean;
    roles: string[];
    created_at: string;
    employee?: {
        employee_code: string;
        first_name: string;
        last_name: string;
    } | null;
}
export interface User extends Pagination {
	data: SingleUser[];
}

export interface UserRole extends SingleUser {
    roles: string[];
}
