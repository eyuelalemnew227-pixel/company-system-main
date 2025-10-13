import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type EvaluatorGroupPagination } from '@/types/evaluator-group.d';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Evaluator Groups',
        href: '/evaluator-groups',
    },
];

export default function EvaluatorGroups({ evaluatorGroups }: { evaluatorGroups: EvaluatorGroupPagination }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const initialSearch = (usePage().props as any)?.request?.search ?? '';
    const [search, setSearch] = useState<string>(initialSearch);
    const { can } = usePermission();

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    function handleSearch() {
        router.get('/evaluator-groups', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    function deleteEvaluatorGroup(id: number) {
        if (confirm('Are you sure you want to delete this evaluator group?')) {
            router.delete(`/evaluator-groups/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluator Groups" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Evaluator Groups Management</CardTitle>
                        <div className="ml-4 flex gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search evaluator groups..."
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                            <Button variant={'secondary'} onClick={handleSearch}>Search</Button>
                        </div>
                        <CardAction>
                            {can('create evaluator groups') && (
                                <Link href={'/evaluator-groups/create'}>
                                    <Button variant={'default'}>Add New</Button>
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
                                    <TableHead className="font-bold text-white">Name</TableHead>
                                    <TableHead className="font-bold text-white">Question Group</TableHead>
                                    <TableHead className="font-bold text-white">Employees</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluatorGroups.data
                                    .map((group, index) => (
                                    <TableRow key={group.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{group.name}</TableCell>
                                        <TableCell>{group.question_group?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {group.employees_count || 0} Employees
                                            </span>
                                        </TableCell>
                                        <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {can('update evaluator groups') && (
                                                <Link href={`/evaluator-groups/${group.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete evaluator groups') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => deleteEvaluatorGroup(group.id)}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {evaluatorGroups.data.length > 0 ? (
                        <TablePagination total={evaluatorGroups.total} from={evaluatorGroups.from} to={evaluatorGroups.to} links={evaluatorGroups.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No Evaluator Groups Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

