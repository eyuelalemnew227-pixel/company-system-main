import { Head, Link, router, usePage } from '@inertiajs/react';
import TablePagination from '@/components/table-pagination';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import type { FiscalMonthPagination } from '@/types/fiscal-month';
import type { FiscalYear } from '@/types/fiscal-year';
import type { PageProps } from '@/types';

type Props = PageProps & {
    fiscalMonths: FiscalMonthPagination;
    fiscalYears: FiscalYear[];
    request: {
        search?: string;
        status?: string;
        fiscal_year?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ethiopian Fiscal Months', href: '/fiscal-months' },
];

export default function Index({ fiscalMonths, fiscalYears, request }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [search, setSearch] = useState(request.search || '');
    const [fiscalYearFilter, setFiscalYearFilter] = useState(request.fiscal_year || 'all');

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/fiscal-months', { search, fiscal_year: fiscalYearFilter }, { preserveState: true, replace: true });
    }

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this fiscal month?')) {
            router.delete(route('fiscal-months.destroy', id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fiscal Months" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Ethiopian Fiscal Months</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search fiscal months..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={fiscalYearFilter} onValueChange={setFiscalYearFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {fiscalYears.map((year) => (
                                        <SelectItem key={year.id} value={year.id.toString()}>
                                            {year.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {auth.permissions.includes('create fiscal months') && (
                                <Link href={route('fiscal-months.create')}>
                                    <Button variant="default">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Fiscal Month
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
                                    <TableHead className="font-bold text-white">Fiscal Year</TableHead>
                                    <TableHead className="font-bold text-white">Month</TableHead>
                                    <TableHead className="font-bold text-white">Month #</TableHead>
                                    <TableHead className="font-bold text-white">Start Date</TableHead>
                                    <TableHead className="font-bold text-white">End Date</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fiscalMonths.data
                                    .filter((month) => {
                                        const matchesSearch = !search ||
                                            (month.name || '').toLowerCase().includes(search.toLowerCase()) ||
                                            (month.fiscal_year?.name || '').toLowerCase().includes(search.toLowerCase());
                                        const matchesYear = fiscalYearFilter === 'all' || month.fiscal_year_id?.toString() === fiscalYearFilter;
                                        return matchesSearch && matchesYear;
                                    })
                                    .map((month, index) => (
                                    <TableRow key={month.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(fiscalMonths.from ?? 0) + index}</TableCell>
                                        <TableCell className="font-medium">{month.fiscal_year?.name}</TableCell>
                                        <TableCell>{month.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">{month.efy_month_number}</TableCell>
                                        <TableCell className="text-sm">{month.gregorian_start_date}</TableCell>
                                        <TableCell className="text-sm">{month.gregorian_end_date}</TableCell>
                                        <TableCell>
                                            {auth.permissions.includes('update fiscal months') && (
                                                <Link href={route('fiscal-months.edit', month.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {auth.permissions.includes('delete fiscal months') && (
                                                <Button
                                                    className="m-2"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(month.id)}
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
                    {fiscalMonths.data.length > 0 ? (
                        <TablePagination total={fiscalMonths.total} from={fiscalMonths.from} to={fiscalMonths.to} links={fiscalMonths.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No fiscal months found</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

