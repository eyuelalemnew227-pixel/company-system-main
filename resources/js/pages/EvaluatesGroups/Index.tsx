import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type EvaluatesGroupPagination } from '@/types/evaluates-group.d';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Evaluates Groups',
        href: '/evaluates-groups',
    },
];

function getEntityCount(group: any) {
    switch (group.evaluable_type) {
        case 'employee':
            return group.employees?.length || 0;
        case 'department':
            return group.departments?.length || 0;
        case 'branch':
            return group.branches?.length || 0;
        case 'other':
            return group.other_evaluables?.length || 0;
        default:
            return 0;
    }
}

function getEntityTypeLabel(type: string) {
    switch (type) {
        case 'employee':
            return 'Employees';
        case 'department':
            return 'Departments';
        case 'branch':
            return 'Branches';
        case 'other':
            return 'Other Evaluables';
        default:
            return type;
    }
}

export default function EvaluatesGroups({ evaluatesGroups }: { evaluatesGroups: EvaluatesGroupPagination }) {
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
        router.get('/evaluates-groups', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    function deleteEvaluatesGroup(id: number) {
        if (confirm('Are you sure you want to delete this evaluates group?')) {
            router.delete(`/evaluates-groups/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluates Groups" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Evaluates Groups Management</CardTitle>
                        <div className="ml-4 flex gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search evaluates groups..."
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                            <Button variant={'secondary'} onClick={handleSearch}>Search</Button>
                        </div>
                        <CardAction>
                            {can('create evaluates groups') && (
                                <Link href={'/evaluates-groups/create'}>
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
                                    <TableHead className="font-bold text-white">Evaluable Type</TableHead>
                                    <TableHead className="font-bold text-white">Count</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluatesGroups.data
                                    .map((group, index) => (
                                    <TableRow key={group.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium">{group.name}</TableCell>
                                        <TableCell>{group.question_group?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                                {getEntityTypeLabel(group.evaluable_type)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {getEntityCount(group)} {getEntityTypeLabel(group.evaluable_type)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {can('update evaluates groups') && (
                                                <Link href={`/evaluates-groups/${group.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete evaluates groups') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => deleteEvaluatesGroup(group.id)}
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
                    {evaluatesGroups.data.length > 0 ? (
                        <TablePagination total={evaluatesGroups.total} from={evaluatesGroups.from} to={evaluatesGroups.to} links={evaluatesGroups.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No Evaluates Groups Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
