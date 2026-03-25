import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Calendar, RotateCcw } from 'lucide-react';
import type { PageProps } from '@/types';
import { toast } from 'sonner';

type Props = PageProps & {
    deletedEvaluations: {
        data: any[];
        last_page: number;
        links: any[];
    };
    filters: {
        search?: string;
        period_id?: string;
        deleted_by?: string;
        date_from?: string;
        date_to?: string;
        evaluation_name?: string;
    };
    periods: any[];
    users: any[];
};

export default function Index({ auth, deletedEvaluations, filters, periods, users, flash }: Props) {

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedPeriod, setSelectedPeriod] = useState(filters.period_id || 'all');
    const [selectedUser, setSelectedUser] = useState(filters.deleted_by || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [templateFilter, setTemplateFilter] = useState(filters.evaluation_name || 'all');

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    const handleFilterChange = () => {
        router.get(
            route('deleted-evaluations.index'),
            {
                search: searchQuery,
                period_id: selectedPeriod === 'all' ? undefined : selectedPeriod,
                deleted_by: selectedUser === 'all' ? undefined : selectedUser,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                evaluation_name: templateFilter === 'all' ? undefined : templateFilter,
            },
            { preserveState: true, replace: true }
        );
    };

    // Debounce search
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchQuery !== (filters.search || '')) {
                handleFilterChange();
            }
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Handle other filters immediately
    useEffect(() => {
        if (selectedPeriod !== (filters.period_id || 'all') ||
            selectedUser !== (filters.deleted_by || 'all') ||
            dateFrom !== (filters.date_from || '') ||
            dateTo !== (filters.date_to || '') ||
            templateFilter !== (filters.evaluation_name || 'all')) {
            handleFilterChange();
        }
    }, [selectedPeriod, selectedUser, dateFrom, dateTo, templateFilter]);

    const handleRestore = (id: number) => {
        if (confirm('Are you sure you want to restore this evaluation? It will be moved back to the active records.')) {
            router.post(route('deleted-evaluations.restore', id), {}, {
                onSuccess: () => toast.success('Evaluation restored successfully')
            });
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout>
            <Head title="Deleted Evaluations" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Deleted Evaluations</h1>
                </div>

                <Card className="p-6">
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search evaluator, evaluatee or deleted by..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
                                className="pl-10"
                            />
                        </div>

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            <option value="all">All Periods</option>
                            {periods.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.evaluation_period_name}</option>
                            ))}
                        </select>

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            <option value="all">All Users</option>
                            {users.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>

                        <Input
                            type="date"
                            placeholder="From Date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />

                        <Input
                            type="date"
                            placeholder="To Date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={templateFilter}
                            onChange={(e) => setTemplateFilter(e.target.value)}
                        >
                            <option value="all">All Evaluations</option>
                            <option value="Peer to Peer Evaluation">Peer to Peer Evaluation</option>
                            <option value="Bottom Up Evaluation">Bottom Up Evaluation</option>
                            <option value="Top Down Evaluation">Top Down Evaluation</option>
                            <option value="Department to Department">Department to Department</option>
                            <option value="Branch Managers Evaluation">Branch Managers Evaluation</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="pb-3 text-left font-semibold">Evaluator</th>
                                    <th className="pb-3 text-left font-semibold">Evaluatee</th>
                                    <th className="pb-3 text-left font-semibold">Evaluation</th>
                                    <th className="pb-3 text-left font-semibold text-gray-600">Period</th>
                                    <th className="pb-3 text-left font-semibold text-red-600">Deleted By</th>
                                    <th className="pb-3 text-left font-semibold text-red-600">Deleted At</th>
                                    <th className="pb-3 text-center font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deletedEvaluations.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">
                                            No deleted evaluations found
                                        </td>
                                    </tr>
                                ) : (
                                    deletedEvaluations.data.map((record: any) => (
                                        <tr key={record.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="font-medium text-gray-900">
                                                    {record.evaluator_name}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-medium text-indigo-600">
                                                    {record.evaluate_label}
                                                </div>
                                                <div className="text-xs text-gray-400 uppercase tracking-tighter">
                                                    {record.evaluable_type}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm font-medium">
                                                    {record.evaluation_name}
                                                </div>
                                            </td>
                                            <td className="py-4 text-sm text-gray-600">
                                                {record.period_name}
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm font-medium text-red-700">
                                                    {record.deleted_by_name}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm font-medium text-red-600">
                                                    {formatDateTime(record.deleted_at)}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex justify-center gap-2">
                                                    {auth.permissions.includes('restore deleted evaluations') && (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleRestore(record.id)}
                                                            className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                            title="Restore Evaluation"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {deletedEvaluations.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                            {deletedEvaluations.links.map((link: any, index: number) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </Card>
            </div>

        </AppLayout>
    );
}
