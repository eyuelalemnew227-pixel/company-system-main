import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type Category = {
    id: number;
    name: string;
    spare_parts_count: number;
    created_at: string;
};

type Paginated<T> = {
    data: T[];
    total: number;
    from: number;
    to: number;
    links: any[];
};

type PageProps = {
    categories: Paginated<Category>;
    filters: { search?: string };
    flash?: { success?: string };
};

export default function SparePartCategoriesIndex({ categories, filters = {}, flash }: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const { can } = usePermission();

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash?.success]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const params: Record<string, string> = {};
        if (search) params.search = search;
        router.get('/spare-part-categories', params, { preserveState: true, preserveScroll: true });
    }

    function deleteItem(id: number) {
        if (!confirm('Delete this category? All spare parts in this category will also be deleted.')) return;
        router.delete(route('spare-part-categories.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Deleted successfully'),
            onError: () => toast.error('Delete failed'),
        });
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Spare Part Categories', href: '/spare-part-categories' }]}>
            <Head title="Spare Part Categories" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Spare Part Categories</CardTitle>
                        <form className="ml-4 flex flex-wrap items-center gap-2" onSubmit={handleSearch}>
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." />
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {can('create spare part categories') && (
                                <Link href="/spare-part-categories/create">
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
                                    <TableHead className="font-bold text-white">#</TableHead>
                                    <TableHead className="font-bold text-white">Name</TableHead>
                                    <TableHead className="font-bold text-white text-center">Spare Parts</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.data.map((item, idx) => (
                                    <TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(categories.from ?? 0) + idx}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {item.spare_parts_count}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {can('update spare part categories') && (
                                                <Link href={`/spare-part-categories/${item.id}/edit`}>
                                                    <Button variant="outline" size="sm">Edit</Button>
                                                </Link>
                                            )}
                                            {can('delete spare part categories') && (
                                                <Button className="m-2" variant="destructive" size="sm" onClick={() => deleteItem(item.id)}>
                                                    Delete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {categories.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4}>No categories found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <TablePagination from={categories.from} to={categories.to} total={categories.total} links={categories.links} />
                </Card>
            </div>
        </AppLayout>
    );
}
