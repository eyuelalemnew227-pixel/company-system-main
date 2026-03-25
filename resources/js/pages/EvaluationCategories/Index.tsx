import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type EvaluationCategory = {
    id: number;
    name: string;
    weight: number;
    is_active: boolean;
    created_at: string;
};

type PaginatedCategories = {
    data: EvaluationCategory[];
    total: number;
    from: number;
    to: number;
    links: any[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Evaluation Categories',
        href: '/evaluation-categories',
    },
];

export default function Index({ categories }: { categories: PaginatedCategories }) {
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
        router.get('/evaluation-categories', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    function deleteCategory(id: number) {
        if (confirm('Are you sure you want to delete this evaluation category?')) {
            router.delete(`/evaluation-categories/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluation Categories" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Evaluation Categories Management</CardTitle>
                        <div className="ml-4 flex gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search categories..."
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                            <Button variant="secondary" onClick={handleSearch}>Search</Button>
                        </div>
                        <CardAction>
                            {can('create evaluation categories') && (
                                <Link href={'/evaluation-categories/create'}>
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
                                    <TableHead className="font-bold text-white">Weight (%)</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.data.map((category, index) => (
                                    <TableRow key={category.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{categories.from + index}</TableCell>
                                        <TableCell>{category.name}</TableCell>
                                        <TableCell>{category.weight}%</TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {category.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {can('update evaluation categories') && (
                                                <Link href={`/evaluation-categories/${category.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete evaluation categories') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => deleteCategory(category.id)}
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
                    {categories.data.length > 0 ? (
                        <TablePagination total={categories.total} from={categories.from} to={categories.to} links={categories.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-4">No Evaluation Categories Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
