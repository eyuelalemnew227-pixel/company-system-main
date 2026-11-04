import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useSidebar } from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    Pencil,
    Printer,
    Send,
    ShieldCheck,
    XCircle,
    AlertCircle,
    MinusCircle,
    Store,
    Calendar,
    User as UserIcon,
    PackageCheck,
    CheckSquare,
    CalendarClock,
    Layers,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import type { PageProps, BreadcrumbItem } from '@/types';

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

type Props = PageProps & {
    inspection: {
        id: number;
        reference_no: string;
        inspection_date: string;
        store_name: string;
        status: 'draft' | 'submitted' | 'approved' | 'rejected';
        submitted_at: string | null;
        approved_at: string | null;
        rejection_reason: string | null;
        inspector?: { id: number; name: string };
        approver?: { id: number; name: string };
        created_by?: { id: number; name: string };
        updated_by?: { id: number; name: string };
        items: Array<{
            id: number;
            tab_type?: 'custody_accuracy' | 'expiry_control' | 'store_condition';
            category_name: string;
            item_code: string;
            item_name: string;
            unit_of_measure: string;
            article_id?: string;
            wac?: number;
            main_store_balance: string | number;
            inspected_quantity: string | number | null;
            expiry_date?: string | null;
            status: 'none' | 'pass' | 'fail';
            remarks: string | null;
        }>;
    };
    stats: {
        total_items: number;
        passed_items: number;
        failed_items: number;
        none_items?: number;
        total_inspected_qty: number;
        custody_count?: number;
        expiry_count?: number;
        condition_count?: number;
        pass_rate: number;
    };
};

export default function ShowPurchaseInspection({
    inspection,
    stats = {
        total_items: 0,
        passed_items: 0,
        failed_items: 0,
        total_inspected_qty: 0,
        custody_count: 0,
        expiry_count: 0,
        condition_count: 0,
        pass_rate: 0,
    },
}: Props) {
    const { can } = usePermission();
    const [activeTab, setActiveTab] = useState<string>('all');

    if (!inspection) {
        return (
            <AppLayout breadcrumbs={[{ title: 'Purchase Inspections', href: '/purchase-inspections' }]}>
                <div className="p-8 text-center text-muted-foreground">Inspection not found.</div>
            </AppLayout>
        );
    }

    const items = inspection.items || [];
    const custodyItems = useMemo(
        () => items.filter((i) => !i.tab_type || i.tab_type === 'custody_accuracy'),
        [items]
    );
    const expiryItems = useMemo(
        () => items.filter((i) => i.tab_type === 'expiry_control'),
        [items]
    );
    const conditionItems = useMemo(
        () => items.filter((i) => i.tab_type === 'store_condition'),
        [items]
    );



    const renderConditionBadge = (status: string) => {
        const normalized = (status || 'none').toLowerCase();
        if (normalized === 'pass') {
            return (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> PASS
                </span>
            );
        }
        if (normalized === 'fail') {
            return (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
                    <XCircle className="mr-1 h-3 w-3" /> FAIL
                </span>
            );
        }
        return (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <MinusCircle className="mr-1 h-3 w-3" /> NONE
            </span>
        );
    };

    const canEdit = can('edit purchase inspections');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchase Inspections', href: '/purchase-inspections' },
        { title: inspection.reference_no, href: `/purchase-inspections/${inspection.id}`, className: 'text-[1.3125rem] font-semibold' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Inspection ${inspection.reference_no}`} />
            <CollapseSidebarOnMount />

            <div className="flex h-full flex-1 flex-col gap-1 overflow-x-auto rounded-xl px-4 pt-0 pb-4">
                {/* Top Card: Meta & Actions */}
                <Card className="py-0 shadow-sm border-slate-200 dark:border-slate-700">
                    <CardHeader className="px-6 pt-3 pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                        {inspection.reference_no}
                                    </CardTitle>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Inspected on {inspection.inspection_date} at {inspection.store_name}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Link href={route('purchase-inspections.index')}>
                                    <Button variant="outline" size="sm" className="h-8 text-xs">
                                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                                        Back
                                    </Button>
                                </Link>

                                <a href={route('purchase-inspections.export', inspection.id)} download>
                                    <Button variant="outline" size="sm" className="h-8 text-xs border-emerald-300 text-emerald-900 hover:bg-emerald-50">
                                        <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-700" />
                                        Export CSV
                                    </Button>
                                </a>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="hidden sm:inline-flex h-8 text-xs"
                                >
                                    <Printer className="mr-1 h-3.5 w-3.5" />
                                    Print
                                </Button>

                                {canEdit && (
                                    <Link href={route('purchase-inspections.edit', inspection.id)}>
                                        <Button variant="outline" size="sm" className="h-8 text-xs border-blue-300 text-blue-900 hover:bg-blue-50">
                                            <Pencil className="mr-1 h-3.5 w-3.5" />
                                            Edit
                                        </Button>
                                    </Link>
                                )}

                            </div>
                        </div>

                        {/* Meta info boxes */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-3 dark:bg-slate-800 dark:border-slate-700">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-600" /> Date
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                                    {inspection.inspection_date}
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                    <Store className="w-3 h-3 text-slate-600" /> Store / Branch
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                                    {inspection.store_name}
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                    <UserIcon className="w-3 h-3 text-slate-600" /> Inspector
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                                    {inspection.inspector?.name ?? 'N/A'}
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3 text-slate-600" /> Breakdown
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                                    {custodyItems.length} Custody · {expiryItems.length} Expiry · {conditionItems.length} Store
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                    <PackageCheck className="w-3 h-3 text-slate-600" /> Pass Rate
                                </span>
                                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                                    {stats.pass_rate}% ({stats.passed_items}/{stats.total_items})
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Tab Navigation (Exact CEO View Trapezoid Style) */}
                <div className="relative mt-2 pt-0 overflow-visible">
                    {/* Solid Line underneath */}
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#5f738a] dark:bg-slate-400 z-0"></div>

                    <div className="relative flex items-end pl-6 sm:pl-8 z-10">
                        {[
                            { id: 'all', label: 'All Items', count: items.length, icon: Layers },
                            { id: 'custody', label: 'Custody Accuracy', count: custodyItems.length, icon: CheckSquare },
                            { id: 'expiry', label: 'Expiry Control', count: expiryItems.length, icon: CalendarClock },
                            { id: 'condition', label: 'Store Condition', count: conditionItems.length, icon: Store },
                        ].map((tab, index) => {
                            const isActive = activeTab === tab.id;
                            const zIndex = isActive ? 40 : 30 - index;
                            const TabIcon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "relative px-5 sm:px-7 py-2.5 text-[12px] font-bold tracking-wider uppercase transition-colors group outline-none -mr-3 flex items-center gap-2",
                                        isActive ? "text-white dark:text-slate-900" : "text-[#5f738a] hover:text-[#4b5b6d] dark:text-slate-300 dark:hover:text-white"
                                    )}
                                    style={{ zIndex }}
                                >
                                    <div
                                        className={cn(
                                            "absolute inset-0 -top-1 origin-bottom [transform:perspective(100px)_rotateX(20deg)] rounded-t-[10px] -z-10 transition-all",
                                            isActive
                                                ? "bg-[#5f738a] dark:bg-slate-400 shadow-none"
                                                : "bg-[#eaedf1] dark:bg-slate-800 shadow-[0_-2px_8px_rgba(0,0,0,0.15)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.5)]"
                                        )}
                                    ></div>
                                    <TabIcon className="w-4 h-4 shrink-0" />
                                    <span>{tab.label}</span>
                                    <span
                                        className={cn(
                                            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                                            isActive
                                                ? "bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-900"
                                                : "bg-[#5f738a]/15 text-[#5f738a] dark:bg-slate-700 dark:text-slate-200"
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Inspection Table Card */}
                <Card className="mt-0 border-t-0 rounded-t-none shadow-sm border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4 sm:p-6 space-y-4">
                        {/* TAB: ALL ITEMS */}
                        {activeTab === 'all' && (
                                <div className="rounded-md border overflow-x-auto shadow-2xs">
                                    <Table>
                                        <TableHeader className="bg-slate-700 text-white">
                                            <TableRow className="hover:bg-slate-700 border-none">
                                                <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[120px]">Tab / Section</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[130px]">Category</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[110px]">Article Code</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[190px]">Item / Article</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap w-16 text-center">UOM</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-right">M/Store Bal</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-right">Inspected Qty</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Expiry Date</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Condition</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[150px]">Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                                        No inspection items recorded.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                items.map((item, idx) => {
                                                    const bal = Number(item.main_store_balance) || 0;
                                                    const inspected = item.inspected_quantity !== null && item.inspected_quantity !== undefined ? Number(item.inspected_quantity) : null;
                                                    const tab = item.tab_type || 'custody_accuracy';

                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            className={item.status === 'fail' ? 'bg-rose-50/60' : 'odd:bg-slate-50/70'}
                                                        >
                                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] font-semibold ${
                                                                        tab === 'expiry_control'
                                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                            : tab === 'store_condition'
                                                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                    }`}
                                                                >
                                                                    {tab === 'expiry_control'
                                                                        ? 'Expiry Control'
                                                                        : tab === 'store_condition'
                                                                        ? 'Store Condition'
                                                                        : 'Custody Accuracy'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-xs font-medium text-gray-700">
                                                                    {item.category_name || '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                                {item.item_code || '-'}
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-gray-900 text-xs">
                                                                {item.item_name}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-gray-600">
                                                                {item.unit_of_measure || 'Pcs'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs">
                                                                {tab === 'custody_accuracy' ? bal.toLocaleString() : '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs font-semibold">
                                                                {tab === 'custody_accuracy' && inspected !== null ? inspected.toLocaleString() : '—'}
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-xs">
                                                                {item.expiry_date ? String(item.expiry_date).slice(0, 10) : '—'}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {renderConditionBadge(item.status)}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {item.remarks || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                        )}

                        {/* TAB: CUSTODY ACCURACY */}
                        {activeTab === 'custody' && (
                                <div className="rounded-md border overflow-x-auto shadow-2xs">
                                    <Table>
                                        <TableHeader className="bg-slate-700 text-white">
                                            <TableRow className="hover:bg-slate-700 border-none">
                                                <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[140px]">Category</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[120px]">Article Code</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[200px]">Item / Article</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap w-20 text-center">UOM</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-right">M/Store Balance</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-right">Inspected Qty</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Variance</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Condition</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[160px]">Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {custodyItems.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                        No Custody Accuracy items in this inspection.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                custodyItems.map((item, idx) => {
                                                    const bal = Number(item.main_store_balance) || 0;
                                                    const inspected = Number(item.inspected_quantity) || 0;
                                                    const variance = Math.round((inspected - bal) * 100) / 100;

                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            className={item.status === 'fail' ? 'bg-rose-50/60' : 'odd:bg-slate-50/70'}
                                                        >
                                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-medium text-xs bg-white text-slate-700">
                                                                    {item.category_name || 'N/A'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                                {item.item_code || '-'}
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-gray-900 text-xs">
                                                                {item.item_name}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-gray-600">
                                                                {item.unit_of_measure || 'Pcs'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-medium text-xs">
                                                                {bal.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-semibold text-xs">
                                                                {inspected.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-xs">
                                                                {variance === 0 ? (
                                                                    <span className="text-emerald-700 font-semibold">0</span>
                                                                ) : variance > 0 ? (
                                                                    <span className="text-blue-700 font-semibold">+{variance}</span>
                                                                ) : (
                                                                    <span className="text-rose-700 font-semibold">{variance}</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {renderConditionBadge(item.status)}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {item.remarks || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                        )}

                        {/* TAB: EXPIRY CONTROL */}
                        {activeTab === 'expiry' && (
                                <div className="rounded-md border overflow-x-auto shadow-2xs">
                                    <Table>
                                        <TableHeader className="bg-slate-700 text-white">
                                            <TableRow className="hover:bg-slate-700 border-none">
                                                <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[140px]">Category</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[120px]">Article Code</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[200px]">Item / Article</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap w-20 text-center">UOM</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Expiry Date</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Shelf Life Status</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Condition</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[160px]">Remarks / Batch #</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {expiryItems.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                        No Expiry Control items in this inspection.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                expiryItems.map((item, idx) => {
                                                    let shelfLifeBadge = null;
                                                    if (item.expiry_date) {
                                                        const exp = new Date(item.expiry_date);
                                                        const inspDate = new Date(inspection.inspection_date);
                                                        const diffDays = Math.ceil((exp.getTime() - inspDate.getTime()) / (1000 * 60 * 60 * 24));

                                                        if (diffDays < 0) {
                                                            shelfLifeBadge = (
                                                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs">
                                                                    Expired ({Math.abs(diffDays)}d)
                                                                </Badge>
                                                            );
                                                        } else if (diffDays <= 30) {
                                                            shelfLifeBadge = (
                                                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                                                                    Near Expiry ({diffDays}d)
                                                                </Badge>
                                                            );
                                                        } else {
                                                            shelfLifeBadge = (
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                                                                    Valid ({diffDays}d)
                                                                </Badge>
                                                            );
                                                        }
                                                    }

                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            className={item.status === 'fail' ? 'bg-rose-50/60' : 'odd:bg-slate-50/70'}
                                                        >
                                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-medium text-xs bg-white text-slate-700">
                                                                    {item.category_name || 'N/A'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                                {item.item_code || '-'}
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-gray-900 text-xs">
                                                                {item.item_name}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-gray-600">
                                                                {item.unit_of_measure || 'Pcs'}
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono font-semibold text-xs text-gray-900">
                                                                {item.expiry_date ? String(item.expiry_date).slice(0, 10) : '—'}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {shelfLifeBadge || <span className="text-xs text-muted-foreground">—</span>}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {renderConditionBadge(item.status)}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {item.remarks || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                        )}

                        {/* TAB: STORE CONDITION */}
                        {activeTab === 'condition' && (
                                <div className="rounded-md border overflow-x-auto shadow-2xs">
                                    <Table>
                                        <TableHeader className="bg-slate-700 text-white">
                                            <TableRow className="hover:bg-slate-700 border-none">
                                                <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[140px]">Category</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[120px]">Article Code</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[220px]">Item / Article</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap w-20 text-center">UOM</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap text-center">Condition</TableHead>
                                                <TableHead className="font-bold text-white whitespace-nowrap min-w-[200px]">Remarks / Physical Findings</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {conditionItems.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                        No Store Condition items in this inspection.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                conditionItems.map((item, idx) => {
                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            className={item.status === 'fail' ? 'bg-rose-50/60' : 'odd:bg-slate-50/70'}
                                                        >
                                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-medium text-xs bg-white text-slate-700">
                                                                    {item.category_name || 'N/A'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                                {item.item_code || '-'}
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-gray-900 text-xs">
                                                                {item.item_name}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-gray-600">
                                                                {item.unit_of_measure || 'Pcs'}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {renderConditionBadge(item.status)}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {item.remarks || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}
