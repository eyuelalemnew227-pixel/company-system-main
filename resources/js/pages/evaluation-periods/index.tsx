import { Head, Link, router, usePage } from '@inertiajs/react';
import TablePagination from '@/components/table-pagination';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import type { EvaluationPeriodPagination } from '@/types/evaluation-period';
import type { PageProps } from '@/types';
import { toast } from 'sonner';

type Props = PageProps & {
    evaluationPeriods: EvaluationPeriodPagination;
    request: {
        search?: string;
        status?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Evaluation Periods', href: '/evaluation-periods' },
];

export default function Index({ evaluationPeriods, request }: Props) {
    const { auth } = usePage<PageProps>().props;
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const [search, setSearch] = useState(request.search || '');
    const [statusFilter, setStatusFilter] = useState(request.status || 'all');

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/evaluation-periods', { search, status: statusFilter }, { preserveState: true, replace: true });
    }

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this evaluation period?')) {
            router.delete(route('evaluation-periods.destroy', id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluation Periods" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Evaluation Periods</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search evaluation periods..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {auth.permissions.includes('create evaluation periods') && (
                                <Link href={route('evaluation-periods.create')}>
                                    <Button variant="default">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Evaluation Period
                                    </Button>
                                </Link>
                            )}
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="font-bold text-white">ID</TableHead>
                                    <TableHead className="font-bold text-white">Period Name</TableHead>
                                    <TableHead className="font-bold text-white">Fiscal Year</TableHead>
                                    <TableHead className="font-bold text-white">Fiscal Month</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluationPeriods.data.map((period, index) => (
                                    <TableRow key={period.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(evaluationPeriods.from ?? 0) + index}</TableCell>
                                        <TableCell className="font-medium">{period.evaluation_period_name}</TableCell>
                                        <TableCell className="text-sm">{period.fiscal_year?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-sm">{period.fiscal_month?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${period.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}>
                                                {period.status === 'active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {auth.permissions.includes('update evaluation periods') && (
                                                <Link href={route('evaluation-periods.edit', period.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {auth.permissions.includes('delete evaluation periods') && (
                                                <Button
                                                    className="m-2"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(period.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {evaluationPeriods.data.length > 0 ? (
                        <TablePagination total={evaluationPeriods.total} from={evaluationPeriods.from} to={evaluationPeriods.to} links={evaluationPeriods.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No evaluation periods found</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
