import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import TicketSettingsLayout from './layout';

type Asset = {
    id: number;
    name: string;
    article_code?: string | null;
    is_active: boolean;
    department?: { name: string };
    main_category?: { name: string };
    sub_category?: { name: string };
};

type Props = {
    assets: {
        data: Asset[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
        department_id?: string;
        main_category_id?: string;
        sub_category_id?: string;
    };
    departments: { id: number; name: string }[];
    mainCategories: { id: number; name: string }[];
    subCategories: { id: number; name: string }[];
};

export default function AssetsPage({ assets, filters, departments, mainCategories, subCategories }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                '/ticket-settings/assets',
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
            '/ticket-settings/assets',
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const confirmDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this asset?')) {
            router.delete(`/ticket-assets/${id}`);
        }
    };

    return (
        <TicketSettingsLayout activeTab="assets">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-wrap gap-4 items-center">
                        <div className="relative max-w-sm flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search assets..."
                                value={search}
                                onChange={handleSearchChange}
                                className="pl-9"
                            />
                        </div>
                        <Select
                            value={filters.department_id ?? 'all'}
                            onValueChange={(v) => handleFilterChange('department_id', v)}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="All Depts" />
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
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="All Main Cats" />
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
                        <Select
                            value={filters.sub_category_id ?? 'all'}
                            onValueChange={(v) => handleFilterChange('sub_category_id', v)}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="All Sub Cats" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sub Categories</SelectItem>
                                {subCategories.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button asChild className="shrink-0">
                        <Link href="/ticket-assets/create">Add Asset</Link>
                    </Button>
                </div>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-500 dark:bg-slate-700">
                            <TableRow>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Name</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Art. Code</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Department</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Main Cat.</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider">Sub Cat.</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-center">Status</TableHead>
                                <TableHead className="font-bold text-white uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.data.map((a) => (
                                <TableRow key={a.id} className="odd:bg-muted/30">
                                    <TableCell className="font-medium whitespace-nowrap">{a.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{a.article_code ?? '—'}</TableCell>
                                    <TableCell>{a.department?.name ?? '—'}</TableCell>
                                    <TableCell>{a.main_category?.name ?? '—'}</TableCell>
                                    <TableCell>{a.sub_category?.name ?? '—'}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {a.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild size="sm" variant="outline" className="h-8">
                                                <Link href={`/ticket-assets/${a.id}/edit`}>Edit</Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="h-8"
                                                onClick={() => confirmDelete(a.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {assets.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                                        No assets found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination
                    total={assets.total}
                    from={assets.from}
                    to={assets.to}
                    links={assets.links}
                />
            </div>
        </TicketSettingsLayout>
    );
}
