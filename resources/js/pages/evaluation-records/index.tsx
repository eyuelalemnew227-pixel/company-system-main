import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Pencil, Trash2, Eye, History } from 'lucide-react';
import type { PageProps } from '@/types';
import { toast } from 'sonner';

type Props = PageProps & {
    evaluationResponses: {
        data: any[];
        last_page: number;
        links: any[];
    };
    filters: {
        search?: string;
        period_id?: string;
        evaluable_type?: string;
        branch_id?: string;
        department_id?: string;
        evaluation_name?: string;
    };
    periods: any[];
    branches: any[];
    departments: any[];
};

export default function Index({ auth, evaluationResponses, filters, periods, branches, departments, flash }: Props) {

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedPeriod, setSelectedPeriod] = useState(filters.period_id || 'all');
    const [selectedType, setSelectedType] = useState(filters.evaluable_type || 'all');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || 'all');
    const [selectedDepartment, setSelectedDepartment] = useState(filters.department_id || 'all');
    const [templateFilter, setTemplateFilter] = useState(filters.evaluation_name || 'all');

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    const handleFilterChange = () => {
        router.get(
            route('evaluation-records.index'),
            {
                search: searchQuery,
                period_id: selectedPeriod === 'all' ? undefined : selectedPeriod,
                evaluable_type: selectedType === 'all' ? undefined : selectedType,
                branch_id: selectedBranch === 'all' ? undefined : selectedBranch,
                department_id: selectedDepartment === 'all' ? undefined : selectedDepartment,
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
            selectedType !== (filters.evaluable_type || 'all') ||
            selectedBranch !== (filters.branch_id || 'all') ||
            selectedDepartment !== (filters.department_id || 'all') ||
            templateFilter !== (filters.evaluation_name || 'all')) {
            handleFilterChange();
        }
    }, [selectedPeriod, selectedType, selectedBranch, selectedDepartment, templateFilter]);

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this evaluation? This will permanently remove all associated scores.')) {
            router.delete(route('evaluation-records.destroy', id), {
                onSuccess: () => toast.success('Evaluation deleted successfully')
            });
        }
    };

    const calculateAverageScore = (questionResponses: any[]) => {
        if (!questionResponses || questionResponses.length === 0) return '0.0';
        const total = questionResponses.reduce((sum, response) => sum + (response.score || 0), 0);
        return (total / questionResponses.length).toFixed(1);
    };

    return (
        <AppLayout>
            <Head title="Evaluation Management" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Evaluation Management</h1>

                    {auth.permissions.includes('view deleted evaluations') && (
                        <Button variant="outline" asChild className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                            <Link href={route('deleted-evaluations.index')} className="flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Deleted Evaluations
                            </Link>
                        </Button>
                    )}
                </div>

                <Card className="p-6">
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search evaluator or evaluatee..."
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
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="employee">Employee</option>
                            <option value="department">Department</option>
                            <option value="branch">Branch</option>
                            <option value="other">Other</option>
                        </select>

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="all">All Branches</option>
                            {branches.map((b: any) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {departments.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>

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
                                    <th className="pb-3 text-left font-semibold">Evaluation Template</th>
                                    <th className="pb-3 text-left font-semibold text-gray-600">Period</th>
                                    <th className="pb-3 text-left font-semibold text-gray-600">Created By</th>
                                    <th className="pb-3 text-left font-semibold text-gray-600">Updated By</th>
                                    <th className="pb-3 text-center font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {evaluationResponses.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">
                                            No evaluations found
                                        </td>
                                    </tr>
                                ) : (
                                    evaluationResponses.data.map((response: any) => (
                                        <tr key={response.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="font-medium text-gray-900">
                                                    {response.evaluator_name}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-medium text-indigo-600">
                                                    {response.evaluate_label}
                                                </div>
                                                <div className="text-xs text-gray-400 uppercase tracking-tighter">
                                                    {response.evaluable_type}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm font-medium">
                                                    {response.evaluation_name}
                                                </div>
                                            </td>
                                            <td className="py-4 text-sm text-gray-600">
                                                {response.period_name}
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm font-medium text-gray-700">
                                                    {response.creator_name}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    {new Date(response.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm font-medium text-gray-700">
                                                    {response.updater_name}
                                                </div>
                                                {response.updated_by && (
                                                    <div className="text-[10px] text-gray-400">
                                                        {new Date(response.updated_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                <div className="flex justify-center gap-2">
                                                    {auth.permissions.includes('update evaluation records') && (
                                                        <Button variant="outline" size="icon" asChild className="h-8 w-8 text-blue-600">
                                                            <Link href={route('evaluation-records.edit', response.id)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {auth.permissions.includes('delete evaluation records') && (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleDelete(response.id)}
                                                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
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

                    {evaluationResponses.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                            {evaluationResponses.links.map((link: any, index: number) => (
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
