import TelecomHeaderNav from '@/components/telecom/TelecomHeaderNav';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import TelegramGroupForm, { GroupFormData } from './TelegramGroupForm';

type Option = { id: number; name: string };

type TicketProp = {
    id: number;
    title: string;
    description: string;
    requestor_full_name?: string;
    beneficiary_branch_id?: number | null;
    requestor_branch_id?: number | null;
    beneficiary_department_id?: number | null;
    requestor_department_id?: number | null;
};

type PageProps = {
    branches: Option[];
    departments: Option[];
    groupTypes: string[];
    categories: string[];
    statuses: string[];
    ticket?: TicketProp | null;
};

export default function CreateTelegramGroup({ branches, departments, groupTypes, categories, statuses, ticket }: PageProps) {
    const branchId = ticket?.beneficiary_branch_id
        ? String(ticket.beneficiary_branch_id)
        : ticket?.requestor_branch_id
        ? String(ticket.requestor_branch_id)
        : '';

    const deptId = ticket?.beneficiary_department_id
        ? String(ticket.beneficiary_department_id)
        : ticket?.requestor_department_id
        ? String(ticket.requestor_department_id)
        : '';

    const defaultCategory = branchId ? 'Branch' : deptId ? 'IT' : 'Operations';

    const { data, setData, post, processing, errors } = useForm<GroupFormData>({
        name: ticket?.title && ticket.title !== 'Telegram Group Request' ? ticket.title : '',
        chat_id: '',
        username: '',
        group_type: 'Supergroup',
        category: defaultCategory,
        purpose: ticket?.title || '',
        description: ticket?.description || '',
        branch_id: branchId,
        department_id: deptId,
        managed_by: ticket?.requestor_full_name || '',
        status: 'Active',
        invite_link: '',
        is_public: false,
        member_count: '',
        notes: ticket ? `Created via Support Ticket #${ticket.id}` : '',
        ticket_id: ticket ? String(ticket.id) : '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/telecom/telegram-groups');
    };

    return (
        <AppLayout>
            <Head title="Register Telegram Group" />
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
                    mode="create"
                />
            </div>
        </AppLayout>
    );
}
