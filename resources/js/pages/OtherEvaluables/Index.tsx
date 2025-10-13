import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type OtherEvaluablePagination } from '@/types/other-evaluable.d';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Other Evaluables',
        href: '/other-evaluables',
    },
];

export default function OtherEvaluables({ otherEvaluables }: { otherEvaluables: OtherEvaluablePagination }) {
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
        router.get('/other-evaluables', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    function deleteOtherEvaluable(id: number) {
        if (confirm('Are you sure you want to delete this other evaluable?')) {
            router.delete(`/other-evaluables/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Other Evaluables" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Other Evaluables Management</CardTitle>
                        <div className="ml-4 flex gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search other evaluables..."
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                            <Button variant={'secondary'} onClick={handleSearch}>Search</Button>
                        </div>
                        <CardAction>
                            {can('create other evaluables') && (
                                <Link href={'/other-evaluables/create'}>
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
                                    <TableHead className="font-bold text-white">Description</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {otherEvaluables.data.map((item, index) => (
                                    <TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="max-w-md truncate">
                                            {item.description || 'No description'}
                                        </TableCell>
                                        <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {can('update other evaluables') && (
                                                <Link href={`/other-evaluables/${item.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete other evaluables') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => deleteOtherEvaluable(item.id)}
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
                    {otherEvaluables.data.length > 0 ? (
                        <TablePagination total={otherEvaluables.total} from={otherEvaluables.from} to={otherEvaluables.to} links={otherEvaluables.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No Other Evaluables Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

