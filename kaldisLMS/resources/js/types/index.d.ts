export interface Role {
    id: string;
    name: string;
    slug: string;
}

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role_id: string;
    role_slug: string;
    role_name: string;
    employee_id: string | null;
    permissions: string[];
    preferred_lang: 'en' | 'am';
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: SessionUser | null;
    };
    flash: {
        success?: string | null;
        error?: string | null;
    };
    unreadNotificationCount: number;
};
