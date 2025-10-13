import TablePagination from '@/components/table-pagination';
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
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { FiscalYearPagination } from '@/types/fiscal-year';
import type { PageProps } from '@/types';

type Props = PageProps & {
    fiscalYears: FiscalYearPagination;
    request: {
        search?: string;
        status?: string;
    };
};

export default function Index({ fiscalYears, request }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [search, setSearch] = useState(request.search || '');
    const [statusFilter, setStatusFilter] = useState('all');

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/fiscal-years', { search }, { preserveState: true, replace: true });
    }

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this fiscal year?')) {
            router.delete(route('fiscal-years.destroy', id));
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ethiopian Fiscal Years', href: '/fiscal-years' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fiscal Years" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Ethiopian Fiscal Years</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search fiscal years..."
                            />
                            {/* Status filter removed */}
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {auth.permissions.includes('create fiscal years') && (
                                <Link href={route('fiscal-years.create')}>
                                    <Button variant="default">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Fiscal Year
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
                                    <TableHead className="font-bold text-white">Start Date</TableHead>
                                    <TableHead className="font-bold text-white">End Date</TableHead>
                                    <TableHead className="font-bold text-white">Months</TableHead>
                                    {/* Status column removed */}
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fiscalYears.data.map((year, index) => (
                                    <TableRow key={year.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(fiscalYears.from ?? 0) + index}</TableCell>
                                        <TableCell className="font-medium">{year.name}</TableCell>
                                        <TableCell className="text-sm">{year.gregorian_start_date}</TableCell>
                                        <TableCell className="text-sm">{year.gregorian_end_date}</TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">{year.fiscal_months_count || 0} months</span>
                                        </TableCell>
                                        {/* Status cell removed */}
                                        <TableCell>
                                            {auth.permissions.includes('update fiscal years') && (
                                                <Link href={route('fiscal-years.edit', year.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {auth.permissions.includes('delete fiscal years') && (
                                                <Button
                                                    className="m-2"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(year.id)}
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
                    {fiscalYears.data.length > 0 ? (
                        <TablePagination total={fiscalYears.total} from={fiscalYears.from} to={fiscalYears.to} links={fiscalYears.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No fiscal years found</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

