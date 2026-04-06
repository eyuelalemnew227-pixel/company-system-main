import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, router } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import TicketSettingsLayout from './layout';

type MainCategory = {
    id: number;
    name: string;
    is_active: boolean;
    department?: { name: string };
};

type Props = {
    mainCategories: {
        data: MainCategory[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
        department_id?: string;
    };
    departments: { id: number; name: string }[];
};

export default function MainCategories({ mainCategories, filters, departments }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                '/ticket-settings/main-categories',
                { ...filters, search: value },
                { preserveState: true, replace: true }
            );
        }, 500),
        [filters]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        debouncedSearch(e.target.value);
    };

    const handleDepartmentChange = (value: string) => {
        router.get(
            '/ticket-settings/main-categories',
            { ...filters, department_id: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const confirmDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this main category?')) {
            router.delete(`/ticket-main-categories/${id}`);
        }
    };

    return (
        <TicketSettingsLayout activeTab="main">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search main categories..."
                                value={search}
                                onChange={handleSearchChange}
                                className="pl-9"
                            />
                        </div>
                        <Select
                            value={filters.department_id ?? 'all'}
                            onValueChange={handleDepartmentChange}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments.map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>
                                        {d.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button asChild>
                        <Link href="/ticket-main-categories/create">Add Main Category</Link>
                    </Button>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-500 dark:bg-slate-700">
                            <TableRow>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Name</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-center">Department</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-center">Status</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mainCategories.data.map((c) => (
                                <TableRow key={c.id} className="odd:bg-muted/30">
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell className="text-center">{c.department?.name ?? '—'}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild size="sm" variant="outline" className="h-8">
                                                <Link href={`/ticket-main-categories/${c.id}/edit`}>Edit</Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="h-8"
                                                onClick={() => confirmDelete(c.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {mainCategories.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                        No main categories found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination
                    total={mainCategories.total}
                    from={mainCategories.from}
                    to={mainCategories.to}
                    links={mainCategories.links}
                />
            </div>
        </TicketSettingsLayout>
    );
}
