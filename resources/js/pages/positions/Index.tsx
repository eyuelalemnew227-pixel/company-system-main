import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Position } from '@/types/positions';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Positions',
        href: '/positions',
    },
];

export default function Positions({ positions, request }: { positions: { data: Position[], total: number, from: number, to: number, links: any[] }, request?: { search?: string } }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const [search, setSearch] = useState<string>(request?.search ?? '');
    const { can } = usePermission();

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/positions', { search }, { preserveState: true, replace: true });
    }

    function deletePosition(id: number) {
        if (confirm('Are you sure you want to delete this position?')) {
            router.delete(`/positions/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Positions" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Positions Management</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search positions..."
                            />
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {can('create positions') && (
                                <Link href="/positions/create">
                                    <Button variant="default">Add New</Button>
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
                                    <TableHead className="font-bold text-white">Title</TableHead>
                                    <TableHead className="font-bold text-white">Level</TableHead>
                                    <TableHead className="font-bold text-white">Description</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {positions.data
                                    .map((position, index) => (
                                    <TableRow key={position.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{position.title}</TableCell>
                                        <TableCell>{position.level}</TableCell>
                                        <TableCell>{position.description || 'N/A'}</TableCell>
                                        <TableCell>{position.created_at}</TableCell>
                                        <TableCell>
                                            {can('update positions') && (
                                                <Link href={`/positions/${position.id}/edit`}>
                                                    <Button variant="outline" size="sm">
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete positions') && (
                                                <Button
                                                    className="m-2"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => deletePosition(position.id)}
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
                    {positions.data.length > 0 ? (
                        <TablePagination
                            total={positions.total}
                            from={positions.from}
                            to={positions.to}
                            links={positions.links}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">No Results Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}