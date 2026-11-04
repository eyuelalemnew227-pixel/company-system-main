import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TablePagination from '@/components/table-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSidebar } from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Eye,
    FileSpreadsheet,
    FileText,
    Filter,
    Pencil,
    Plus,
    Trash2,
    XCircle,
    AlertCircle,
    RotateCcw,
    Boxes,
    Globe,
    Layers,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { PageProps, PaginationData, BreadcrumbItem } from '@/types';

function CollapseSidebarOnMount() {
    const { open, setOpen, isMobile, setOpenMobile } = useSidebar();

    useEffect(() => {
        if (isMobile) {
            setOpenMobile(false);
            return;
        }

        const wasOpen = open;
        setOpen(false);

        return () => setOpen(wasOpen);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

type InspectionRecord = {
    id: number;
    reference_no: string;
    inspection_date: string;
    store_name: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    submitted_at: string | null;
    approved_at: string | null;
    inspector?: { id: number; name: string };
    approver?: { id: number; name: string };
    items_count: number;
    passed_items_count: number;
    failed_items_count: number;
    none_items_count?: number;
};

type Props = PageProps & {
    inspections: PaginationData<InspectionRecord>;
    metrics: {
        total: number;
        draft: number;
        submitted: number;
        approved: number;
        rejected: number;
    };
    filters: {
        search?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        inspector_id?: string;
        category?: string;
    };
    categories: string[];
    inspectors: Array<{ id: number; name: string }>;
};

export default function PurchaseInspectionsIndex({
    inspections,
    metrics,
    filters,
    categories = [],
    inspectors = [],
    flash,
}: Props) {
    const { can } = usePermission();

    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryFilter, setCategoryFilter] = useState<string>(filters.category ?? 'all');
    const [inspectorFilter, setInspectorFilter] = useState<string>(filters.inspector_id ?? 'all');
    const [dateFrom, setDateFrom] = useState<string>(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState<string>(filters.date_to ?? '');

    useEffect(() => {
        if (flash.message) toast.success(flash.message);
        if (flash.error) toast.error(flash.error);
    }, [flash.message, flash.error]);

    const handleFilter = () => {
        const params: Record<string, string> = {};

        if (search) params.search = search;
        if (categoryFilter !== 'all') params.category = categoryFilter;
        if (inspectorFilter !== 'all') params.inspector_id = inspectorFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        router.get(route('purchase-inspections.index'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleResetFilters = () => {
        setSearch('');
        setCategoryFilter('all');
        setInspectorFilter('all');
        setDateFrom('');
        setDateTo('');

        router.get(route('purchase-inspections.index'), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = (id: number, refNo: string) => {
        if (!confirm(`Are you sure you want to delete inspection "${refNo}"? This action cannot be undone.`)) return;

        router.delete(route('purchase-inspections.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Deleted successfully'),
            onError: () => toast.error('Delete failed'),
        });
    };


    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Purchase Inspections',
            href: '/purchase-inspections',
            className: 'text-[1.3125rem] font-semibold',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Inspections" />
            <CollapseSidebarOnMount />
            <div className="flex h-full flex-1 flex-col gap-3 overflow-x-auto rounded-xl px-4 pt-0 pb-4">
                {/* Header / Parameter Card (CeoView Style) */}
                <Card className="w-full bg-[#f8fafc] dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                                    Purchase Inspections
                                </h1>
                                <Badge variant="outline" className="bg-[#5f738a]/10 text-[#5f738a] border-[#5f738a]/30 text-xs">
                                    <Globe className="w-3 h-3 mr-1" />
                                    M/Store API Powered
                                </Badge>
                                {metrics?.total !== undefined && (
                                    <Badge variant="secondary" className="text-xs font-semibold">
                                        {metrics.total} Records
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Central quality inspection, custody verification, and physical balance records for central warehouse items.
                            </p>
                        </div>
                        {can('create purchase inspections') && (
                            <Link href={route('purchase-inspections.create')}>
                                <Button size="sm" className="w-full sm:w-auto bg-[#5f738a] hover:bg-[#4b5c6f] text-white shadow-xs">
                                    <Plus className="mr-1 h-4 w-4" />
                                    New Inspection
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>

                <Card className="w-full shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="p-4 pb-3">
                        {/* Filters Toolbar */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleFilter();
                            }}
                            className=""
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search ref, item, category..."
                                    className="w-full h-9 text-xs bg-white"
                                />

                                <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
                                    <SelectTrigger className="w-full h-9 text-xs bg-white truncate">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((catName) => (
                                            <SelectItem key={catName} value={catName}>
                                                {catName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={inspectorFilter} onValueChange={(val) => setInspectorFilter(val)}>
                                    <SelectTrigger className="w-full h-9 text-xs bg-white">
                                        <SelectValue placeholder="Inspector" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Inspectors</SelectItem>
                                        {inspectors.map((inspector) => (
                                            <SelectItem key={inspector.id} value={String(inspector.id)}>
                                                {inspector.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full h-9 text-xs bg-white"
                                    title="Inspection date from"
                                />

                                <div className="flex gap-1.5">
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full h-9 text-xs bg-white"
                                        title="Inspection date to"
                                    />
                                    <Button type="submit" variant="default" size="sm" className="bg-[#5f738a] hover:bg-[#4b5c6f] text-white h-9 px-3 text-xs">
                                        <Filter className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        title="Reset filters"
                                        className="h-9 px-2 text-gray-500"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardHeader>
                    <hr />

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-700 text-white">
                                    <TableRow className="hover:bg-slate-700 border-none">
                                        <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                        <TableHead className="font-bold text-white whitespace-nowrap">Reference</TableHead>
                                        <TableHead className="font-bold text-white whitespace-nowrap">Date</TableHead>
                                        <TableHead className="font-bold text-white whitespace-nowrap">Store</TableHead>
                                        <TableHead className="font-bold text-white whitespace-nowrap">Inspector</TableHead>
                                        <TableHead className="font-bold text-white whitespace-nowrap text-center">Verified Items</TableHead>
                                        <TableHead className="font-bold text-white whitespace-nowrap text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inspections.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                No purchase inspections found matching your criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        inspections.data.map((item, idx) => (
                                            <TableRow key={item.id} className="odd:bg-slate-50/70 hover:bg-amber-50/40 transition-colors">
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                    {(inspections.from ?? 1) + idx}
                                                </TableCell>
                                                <TableCell className="font-mono font-semibold">
                                                    <Link
                                                        href={route('purchase-inspections.show', item.id)}
                                                        className="text-amber-800 hover:text-amber-950 hover:underline"
                                                    >
                                                        {item.reference_no}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs">{item.inspection_date}</TableCell>
                                                <TableCell className="text-xs font-medium text-gray-700">{item.store_name}</TableCell>
                                                <TableCell className="text-xs">{item.inspector?.name ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                                                        <span className="font-bold text-gray-900">{item.items_count}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            ({item.passed_items_count} pass
                                                            {item.failed_items_count > 0 && (
                                                                <span className="text-rose-600 font-semibold">, {item.failed_items_count} fail</span>
                                                            )}
                                                            {(item.none_items_count ?? 0) > 0 && (
                                                                <span className="text-slate-600 font-semibold">, {item.none_items_count} none</span>
                                                            )})
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link href={route('purchase-inspections.show', item.id)}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-700 hover:bg-amber-50" title="View Details">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>

                                                        {can('edit purchase inspections') && (
                                                            <Link href={route('purchase-inspections.edit', item.id)}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="Edit">
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                        )}

                                                        <a href={route('purchase-inspections.export', item.id)} download>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="Export CSV">
                                                                <FileSpreadsheet className="h-4 w-4" />
                                                            </Button>
                                                        </a>

                                                        {can('delete purchase inspections') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(item.id, item.reference_no)}
                                                                className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {inspections.total > inspections.per_page && (
                            <div className="p-4 border-t">
                                <TablePagination
                                    total={inspections.total}
                                    from={inspections.from}
                                    to={inspections.to}
                                    links={inspections.links}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
