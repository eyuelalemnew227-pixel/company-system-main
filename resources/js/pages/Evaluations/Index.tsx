import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
    const { can } = usePermission();
    const [search, setSearch] = useState(request?.search ?? '');

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this evaluation?')) {
            router.delete(route('evaluations.destroy', id));
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Evaluations', href: '/evaluations' },
    ];

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/evaluations', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluations" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Evaluations Management</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search evaluations..."
                            />
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {can('create evaluations') && (
                                <Link href={'/evaluations/create'}>
                                    <Button variant={'default'}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add New
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
                                    <TableHead className="font-bold text-white">Name</TableHead>
                                    <TableHead className="font-bold text-white">Evaluator Group</TableHead>
                                    <TableHead className="font-bold text-white">Evaluates Group</TableHead>
                                    <TableHead className="font-bold text-white">Type</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluations.data.map((evaluation: any, index: number) => (
                                    <TableRow key={evaluation.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(evaluations.from ?? 0) + index}</TableCell>
                                        <TableCell className="font-medium">{evaluation.name}</TableCell>
                                        <TableCell>{evaluation.evaluator_group?.name}</TableCell>
                                        <TableCell>{evaluation.evaluates_group?.name}</TableCell>
                                        <TableCell>{evaluation.evaluates_group?.evaluable_type ?? 'N/A'}</TableCell>
                                        <TableCell>{evaluation.status?.replace('_', ' ')}</TableCell>
                                        <TableCell>{evaluation.created_at ? new Date(evaluation.created_at).toLocaleDateString() : '—'}</TableCell>
                                        <TableCell>
                                            {can('update evaluations') && (
                                                <Link href={`/evaluations/${evaluation.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        <Pencil className="h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete evaluations') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => handleDelete(evaluation.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {evaluations.data.length > 0 ? (
                        <TablePagination total={evaluations.total} from={evaluations.from} to={evaluations.to} links={evaluations.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No Results Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

