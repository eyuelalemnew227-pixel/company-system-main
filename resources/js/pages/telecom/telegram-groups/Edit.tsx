import TelecomHeaderNav from '@/components/telecom/TelecomHeaderNav';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import TelegramGroupForm, { GroupFormData } from './TelegramGroupForm';

type Option = { id: number; name: string };

type Group = {
    id: number;
    name: string;
    chat_id: string | null;
    username: string | null;
    group_type: string;
    category: string | null;
    purpose: string | null;
    description: string | null;
    branch_id: number | null;
    department_id: number | null;
    managed_by: string | null;
    status: string;
    invite_link: string | null;
    qr_code_path: string | null;
    is_public: boolean;
    member_count: number | null;
    notes: string | null;
};

type PageProps = {
    group: Group;
    branches: Option[];
    departments: Option[];
    groupTypes: string[];
    categories: string[];
    statuses: string[];
};

export default function EditTelegramGroup({
    group,
    branches,
    departments,
    groupTypes,
    categories,
    statuses,
}: PageProps) {
    const { data, setData, put, processing, errors } = useForm<GroupFormData>({
        name: group.name,
        chat_id: group.chat_id ?? '',
        username: group.username ?? '',
        group_type: group.group_type,
        category: group.category ?? '',
        purpose: group.purpose ?? '',
        description: group.description ?? '',
        branch_id: group.branch_id ? String(group.branch_id) : '',
        department_id: group.department_id ? String(group.department_id) : '',
        managed_by: group.managed_by ?? '',
        status: group.status,
        invite_link: group.invite_link ?? '',
        is_public: group.is_public,
        member_count: group.member_count !== null ? String(group.member_count) : '',
        notes: group.notes ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/telecom/telegram-groups/${group.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Edit – ${group.name}`} />
            <div className="mx-auto max-w-screen-2xl space-y-5 p-4 sm:p-6">
                <TelecomHeaderNav />
                <TelegramGroupForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleSubmit}
                    branches={branches}
                    departments={departments}
                    groupTypes={groupTypes}
                    categories={categories}
                    statuses={statuses}
                    mode="edit"
                    existingQr={group.qr_code_path}
                    existingLink={group.invite_link}
                />
            </div>
        </AppLayout>
    );
}
