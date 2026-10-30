import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Eye,
    FileSpreadsheet,
    ClipboardCheck,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Store,
    Calendar,
    User as UserIcon,
} from 'lucide-react';
import type { PageProps } from '@/types';
import { toast } from 'sonner';

type Props = PageProps & {
    inspections: {
        data: Array<{
            id: number;
            reference_no: string;
            inspection_date: string;
            store_name: string;
            status: 'draft' | 'submitted' | 'approved' | 'rejected';
            notes: string | null;
            items_count: number;
            passed_items_count: number;
            failed_items_count: number;
            inspector?: { id: number; name: string };
            approver?: { id: number; name: string };
            approved_at?: string | null;
        }>;
        last_page: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
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
        child_category_id?: string;
    };
    childCategories: Array<{ id: number; child_name: string }>;
    inspectors: Array<{ id: number; name: string }>;
};

export default function Index({
    auth,
    inspections,
    metrics,
    filters,
    childCategories,
    inspectors,
    flash,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [inspectorFilter, setInspectorFilter] = useState(filters.inspector_id || 'all');
    const [categoryFilter, setCategoryFilter] = useState(filters.child_category_id || 'all');

    useEffect(() => {
        if (flash.message) toast.success(flash.message);
        if (flash.error) toast.error(flash.error);
    }, [flash.message, flash.error]);

    const handleFilterChange = (overrideStatus?: string) => {
        const nextStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
        router.get(
            route('purchase-inspections.index'),
            {
                search: searchQuery || undefined,
                status: nextStatus === 'all' ? undefined : nextStatus,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                inspector_id: inspectorFilter === 'all' ? undefined : inspectorFilter,
                child_category_id: categoryFilter === 'all' ? undefined : categoryFilter,
            },
            { preserveState: true, replace: true }
        );
    };

    // Debounce text search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (filters.search || '')) {
                handleFilterChange();
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle dropdown/date changes immediately
    useEffect(() => {
        if (
            statusFilter !== (filters.status || 'all') ||
            dateFrom !== (filters.date_from || '') ||
            dateTo !== (filters.date_to || '') ||
            inspectorFilter !== (filters.inspector_id || 'all') ||
            categoryFilter !== (filters.child_category_id || 'all')
        ) {
            handleFilterChange();
        }
    }, [statusFilter, dateFrom, dateTo, inspectorFilter, categoryFilter]);

    const handleDelete = (id: number, refNo: string) => {
        if (confirm(`Are you sure you want to delete inspection "${refNo}"? This action cannot be undone.`)) {
            router.delete(route('purchase-inspections.destroy', id), {
                onSuccess: () => toast.success('Inspection deleted successfully'),
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approved
                    </Badge>
                );
            case 'submitted':
                return (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300 font-medium">
                        <Clock className="w-3.5 h-3.5 mr-1" /> Submitted
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 font-medium">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Rejected
                    </Badge>
                );
            case 'draft':
            default:
                return (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Draft
                    </Badge>
                );
        }
    };

    return (
        <AppLayout>
            <Head title="Purchase Inspections" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                                Purchase Inspection
                            </h1>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                M/Store
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Inspect purchased products, balance verification with Main Store, and track approval workflows.
                        </p>
                    </div>

                    {auth.permissions.includes('create purchase inspections') && (
                        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all">
                            <Link href={route('purchase-inspections.create')} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                New Inspection
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <Card
                        onClick={() => {
                            setStatusFilter('all');
                            handleFilterChange('all');
                        }}
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                            statusFilter === 'all' ? 'border-l-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20' : 'border-l-gray-300'
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">All Inspections</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{metrics.total}</div>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => {
                            setStatusFilter('draft');
                            handleFilterChange('draft');
                        }}
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                            statusFilter === 'draft' ? 'border-l-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20' : 'border-l-amber-400'
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Draft</div>
                            <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-1">{metrics.draft}</div>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => {
                            setStatusFilter('submitted');
                            handleFilterChange('submitted');
                        }}
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                            statusFilter === 'submitted' ? 'border-l-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20' : 'border-l-blue-400'
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Submitted</div>
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{metrics.submitted}</div>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => {
                            setStatusFilter('approved');
                            handleFilterChange('approved');
                        }}
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                            statusFilter === 'approved' ? 'border-l-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-l-emerald-400'
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Approved</div>
                            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{metrics.approved}</div>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => {
                            setStatusFilter('rejected');
                            handleFilterChange('rejected');
                        }}
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                            statusFilter === 'rejected' ? 'border-l-rose-600 ring-2 ring-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20' : 'border-l-rose-400'
                        }`}
                    >
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">Rejected</div>
                            <div className="text-2xl font-bold text-rose-900 dark:text-rose-200 mt-1">{metrics.rejected}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Card */}
                <Card className="p-5 shadow-sm border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search ref, notes, product..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 text-sm"
                            />
                        </div>

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All Child Categories</option>
                            {childCategories.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                    {c.child_name}
                                </option>
                            ))}
                        </select>

                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={inspectorFilter}
                            onChange={(e) => setInspectorFilter(e.target.value)}
                        >
                            <option value="all">All Inspectors</option>
                            {inspectors.map((u) => (
                                <option key={u.id} value={String(u.id)}>
                                    {u.name}
                                </option>
                            ))}
                        </select>

                        <Input
                            type="date"
                            placeholder="From Date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-10 text-sm"
                            title="From Inspection Date"
                        />

                        <Input
                            type="date"
                            placeholder="To Date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-10 text-sm"
                            title="To Inspection Date"
                        />
                    </div>
                </Card>

                {/* Inspections Table */}
                <Card className="overflow-hidden shadow-sm border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b font-semibold">
                                <tr>
                                    <th className="py-3.5 px-4">Reference No</th>
                                    <th className="py-3.5 px-4">Date & Store</th>
                                    <th className="py-3.5 px-4">Inspector</th>
                                    <th className="py-3.5 px-4 text-center">Items & Result</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4">Approver</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {inspections.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <ClipboardCheck className="w-10 h-10 text-gray-400 stroke-[1.5]" />
                                                <span className="font-medium text-base text-gray-700 dark:text-gray-300">
                                                    No purchase inspections found
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Try adjusting your search filters or create a new inspection.
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    inspections.data.map((inspection) => {
                                        const passRate =
                                            inspection.items_count > 0
                                                ? Math.round(
                                                      (inspection.passed_items_count / inspection.items_count) * 100
                                                  )
                                                : 0;

                                        return (
                                            <tr
                                                key={inspection.id}
                                                className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                                            >
                                                <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                                    <Link
                                                        href={route('purchase-inspections.show', inspection.id)}
                                                        className="hover:underline flex items-center gap-1.5"
                                                    >
                                                        {inspection.reference_no}
                                                    </Link>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {inspection.inspection_date}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Store className="w-3 h-3 text-gray-400" />
                                                        {inspection.store_name}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                                                        {inspection.inspector?.name ?? 'N/A'}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {inspection.items_count} products
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2 text-xs mt-1">
                                                        <span className="text-emerald-600 font-medium">
                                                            {inspection.passed_items_count} passed
                                                        </span>
                                                        {inspection.failed_items_count > 0 && (
                                                            <span className="text-rose-600 font-medium">
                                                                {inspection.failed_items_count} failed
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 text-center">
                                                    {getStatusBadge(inspection.status)}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    {inspection.approver ? (
                                                        <div>
                                                            <div className="font-medium text-gray-800 dark:text-gray-200">
                                                                {inspection.approver.name}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                {inspection.approved_at?.slice(0, 16) ?? ''}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Pending</span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                            className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
                                                            title="View Details"
                                                        >
                                                            <Link href={route('purchase-inspections.show', inspection.id)}>
                                                                <Eye className="w-4 h-4" />
                                                            </Link>
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                            className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600"
                                                            title="Download CSV"
                                                        >
                                                            <a href={route('purchase-inspections.export', inspection.id)} download>
                                                                <FileSpreadsheet className="w-4 h-4" />
                                                            </a>
                                                        </Button>

                                                        {(inspection.status === 'draft' || inspection.status === 'rejected') && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    asChild
                                                                    className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                                                                    title="Edit Inspection"
                                                                >
                                                                    <Link href={route('purchase-inspections.edit', inspection.id)}>
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Link>
                                                                </Button>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(inspection.id, inspection.reference_no)}
                                                                    className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {inspections.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="text-xs text-gray-500">
                                Showing <span className="font-medium">{inspections.data.length}</span> of{' '}
                                <span className="font-medium">{inspections.total}</span> records
                            </div>
                            <div className="flex items-center gap-1">
                                {inspections.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="h-8 px-3 text-xs"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
