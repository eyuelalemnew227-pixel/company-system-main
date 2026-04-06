import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, router } from '@inertiajs/react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import TicketSettingsLayout from './layout';

type SubCategory = {
    id: number;
    name: string;
    is_active: boolean;
    main_category?: { name: string; department?: { name: string } };
};

type Props = {
    subCategories: {
        data: SubCategory[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
        main_category_id?: string;
        department_id?: string;
    };
    mainCategories: { id: number; name: string }[];
    departments: { id: number; name: string }[];
};

export default function SubCategories({ subCategories, filters, mainCategories, departments }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                '/ticket-settings/sub-categories',
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

    const handleFilterChange = (key: string, value: string) => {
        router.get(
            '/ticket-settings/sub-categories',
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const toggleStatus = (id: number) => {
        router.patch(`/ticket-sub-categories/${id}/toggle-status`, {}, {
            preserveScroll: true,
        });
    };

    const confirmDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this sub category?')) {
            router.delete(`/ticket-sub-categories/${id}`);
        }
    };

    return (
        <TicketSettingsLayout activeTab="sub">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search sub categories..."
                                value={search}
                                onChange={handleSearchChange}
                                className="pl-9"
                            />
                        </div>
                        <Select
                            value={filters.department_id ?? 'all'}
                            onValueChange={(v) => handleFilterChange('department_id', v)}
                        >
                            <SelectTrigger className="w-[180px]">
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
                        <Select
                            value={filters.main_category_id ?? 'all'}
                            onValueChange={(v) => handleFilterChange('main_category_id', v)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Main Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Main Categories</SelectItem>
                                {mainCategories.map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                        {m.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button asChild>
                        <Link href="/ticket-sub-categories/create">Add Sub Category</Link>
                    </Button>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-500 dark:bg-slate-700">
                            <TableRow>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Name</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Main Category</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-center">Department</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-center">Status</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subCategories.data.map((c) => (
                                <TableRow key={c.id} className="odd:bg-muted/30">
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>{c.main_category?.name}</TableCell>
                                    <TableCell className="text-center">{c.main_category?.department?.name ?? '—'}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            <Switch
                                                checked={!!c.is_active}
                                                onCheckedChange={() => toggleStatus(c.id)}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild size="sm" variant="outline" className="h-8">
                                                <Link href={`/ticket-sub-categories/${c.id}/edit`}>Edit</Link>
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
                            {subCategories.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                                        No sub categories found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination
                    total={subCategories.total}
                    from={subCategories.from}
                    to={subCategories.to}
                    links={subCategories.links}
                />
            </div>
        </TicketSettingsLayout>
    );
}
