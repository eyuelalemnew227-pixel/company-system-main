import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import type { EvaluationPagination } from '@/types/evaluation';
import type { PageProps } from '@/types';

type Props = PageProps & {
    evaluations: EvaluationPagination;
    request: {
        search?: string;
        status?: string;
    };
};

export default function Index({ evaluations, request }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [searchQuery, setSearchQuery] = useState(request?.search ?? '');
    const [statusFilter, setStatusFilter] = useState(request?.status ?? 'all');

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this evaluation?')) {
            router.delete(route('evaluations.destroy', id));
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getEvaluableTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'employee':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'department':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'branch':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'other':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    function handleSearch() {
        router.get(route('evaluations.index'), { search: searchQuery ?? '', status: statusFilter ?? 'all' }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout>
            <Head title="Evaluations" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Evaluations</h1>
                    {auth.permissions.includes('create evaluations') && (
                        <Button asChild>
                            <Link href={route('evaluations.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Evaluation
                            </Link>
                        </Button>
                    )}
                </div>

                <Card className="p-6">
                    <div className="mb-6 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search evaluations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="secondary" onClick={handleSearch}>Search</Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="pb-3 text-left font-semibold">Name</th>
                                    <th className="pb-3 text-left font-semibold">Evaluator Group</th>
                                    <th className="pb-3 text-left font-semibold">Evaluates Group</th>
                                    <th className="pb-3 text-left font-semibold">Type</th>
                                    <th className="pb-3 text-left font-semibold">Status</th>
                                    <th className="pb-3 text-left font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {evaluations.data
                                    .filter((evaluation) => {
                                        const matchesSearch = !searchQuery ||
                                            evaluation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (evaluation.evaluator_group?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (evaluation.evaluates_group?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
                                        const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
                                        return matchesSearch && matchesStatus;
                                    }).length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-500">
                                            No evaluations found
                                        </td>
                                    </tr>
                                ) : (
                                    evaluations.data
                                        .filter((evaluation) => {
                                            const matchesSearch = !searchQuery ||
                                                evaluation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                (evaluation.evaluator_group?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                (evaluation.evaluates_group?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
                                            const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
                                            return matchesSearch && matchesStatus;
                                        })
                                        .map((evaluation) => (
                                        <tr key={evaluation.id} className="border-b last:border-0">
                                            <td className="py-4">
                                                <div className="font-medium">{evaluation.name}</div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm">
                                                    {evaluation.evaluator_group?.name}
                                                    {evaluation.evaluator_group?.question_group && (
                                                        <div className="text-xs text-gray-500">
                                                            {evaluation.evaluator_group.question_group.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm">
                                                    {evaluation.evaluates_group?.name}
                                                    {evaluation.evaluates_group?.question_group && (
                                                        <div className="text-xs text-gray-500">
                                                            {evaluation.evaluates_group.question_group.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                {evaluation.evaluates_group && (
                                                    <span
                                                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getEvaluableTypeBadgeColor(evaluation.evaluates_group.evaluable_type)}`}
                                                    >
                                                        {evaluation.evaluates_group.evaluable_type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                <span
                                                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(evaluation.status)}`}
                                                >
                                                    {evaluation.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex gap-2">
                                                    {auth.permissions.includes('update evaluations') && (
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link href={route('evaluations.edit', evaluation.id)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {auth.permissions.includes('delete evaluations') && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDelete(evaluation.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
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

                    {evaluations.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                            {evaluations.links.map((link, index) => (
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

