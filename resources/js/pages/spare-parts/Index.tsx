import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type SparePart = {
    id: number;
    name: string;
    article_code?: string | null;
    description?: string | null;
    spare_part_category_id: number;
    category?: { id: number; name: string } | null;
};

type Category = {
    id: number;
    name: string;
};

type Paginated<T> = {
    data: T[];
    total: number;
    from: number;
    to: number;
    links: any[];
};

type PageProps = {
    spareParts: Paginated<SparePart>;
    categories: Category[];
    filters: { search?: string; spare_part_category_id?: string };
    flash?: { success?: string };
};

export default function SparePartsIndex({ spareParts, categories = [], filters = {}, flash }: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryFilter, setCategoryFilter] = useState<string>(filters.spare_part_category_id ?? 'all');
    const { can } = usePermission();

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash?.success]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (categoryFilter !== 'all') params.spare_part_category_id = categoryFilter;
        router.get('/spare-parts', params, { preserveState: true, preserveScroll: true });
    }

    function deleteItem(id: number) {
        if (!confirm('Delete this spare part?')) return;
        router.delete(route('spare-parts.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Deleted successfully'),
            onError: () => toast.error('Delete failed'),
        });
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Spare Parts', href: '/spare-parts' }]}>
            <Head title="Spare Parts" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Spare Parts</CardTitle>
                        <form className="ml-4 flex flex-wrap items-center gap-2" onSubmit={handleSearch}>
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {can('create spare parts') && (
                                <Link href="/spare-parts/create">
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
                                    <TableHead className="font-bold text-white">Article Code</TableHead>
                                    <TableHead className="font-bold text-white">Category</TableHead>
                                    <TableHead className="font-bold text-white">Description</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {spareParts.data.map((item, idx) => (
                                    <TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(spareParts.from ?? 0) + idx}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.article_code ?? '-'}</TableCell>
                                        <TableCell>{item.category?.name ?? 'N/A'}</TableCell>
                                        <TableCell className="max-w-xs truncate">{item.description ?? '-'}</TableCell>
                                        <TableCell>
                                            {can('update spare parts') && (
                                                <Link href={`/spare-parts/${item.id}/edit`}>
                                                    <Button variant="outline" size="sm">Edit</Button>
                                                </Link>
                                            )}
                                            {can('delete spare parts') && (
                                                <Button className="m-2" variant="destructive" size="sm" onClick={() => deleteItem(item.id)}>
                                                    Delete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {spareParts.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6}>No spare parts found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <TablePagination from={spareParts.from} to={spareParts.to} total={spareParts.total} links={spareParts.links} />
                </Card>
            </div>
        </AppLayout>
    );
}
