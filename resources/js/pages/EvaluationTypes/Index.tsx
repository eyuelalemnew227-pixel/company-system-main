import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type EvaluationType } from '@/types/evaluation-types.d';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Evaluation Types',
        href: '/evaluation-types',
    },
];

export default function EvaluationTypes({ evaluationTypes }: { evaluationTypes: EvaluationType }) {
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
        router.get('/evaluation-types', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    function deleteEvaluationType(id: number) {
        if (confirm('Are you sure you want to delete this evaluation type?')) {
            router.delete(`/evaluation-types/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluation Types" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Evaluation Types Management</CardTitle>
                        <div className="ml-4 flex gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search evaluation types..."
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                            <Button variant="secondary" onClick={handleSearch}>Search</Button>
                        </div>
                        <CardAction>
                            {can('create evaluation types') && (
                                <Link href={'/evaluation-types/create'}>
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
                                    <TableHead className="font-bold text-white">Type</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluationTypes.data.map((type, index) => (
                                    <TableRow key={type.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{type.name}</TableCell>
                                        <TableCell>{type.evaluation_type}</TableCell>
                                        <TableCell>{type.created_at}</TableCell>
                                        <TableCell>
                                            {can('update evaluation types') && (
                                                <Link href={`/evaluation-types/${type.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete evaluation types') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => deleteEvaluationType(type.id)}
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
                    {evaluationTypes.data.length > 0 ? (
                        <TablePagination total={evaluationTypes.total} from={evaluationTypes.from} to={evaluationTypes.to} links={evaluationTypes.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center">No Evaluation Types Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}