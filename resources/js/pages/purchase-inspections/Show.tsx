import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Pencil,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    Store,
    Calendar,
    User as UserIcon,
    ShieldCheck,
    Send,
    Printer,
    FileText,
} from 'lucide-react';
import type { PageProps } from '@/types';
import { toast } from 'sonner';

type Props = PageProps & {
    inspection: {
        id: number;
        reference_no: string;
        inspection_date: string;
        store_name: string;
        status: 'draft' | 'submitted' | 'approved' | 'rejected';
        notes: string | null;
        submitted_at: string | null;
        approved_at: string | null;
        rejection_reason: string | null;
        inspector?: { id: number; name: string };
        approver?: { id: number; name: string };
        created_by?: { id: number; name: string };
        updated_by?: { id: number; name: string };
        items: Array<{
            id: number;
            child_category_id: number;
            product_id: number;
            main_store_balance: string | number;
            inspected_quantity: string | number;
            unit_of_measure: string | null;
            status: 'pass' | 'fail';
            remarks: string | null;
            child_category?: { id: number; child_name: string };
            product?: { id: number; product_name: string; product_code: string; measurement: string | null };
        }>;
    };
    stats: {
        total_items: number;
        passed_items: number;
        failed_items: number;
        total_inspected_qty: number;
        pass_rate: number;
    };
};

export default function Show({ auth, inspection, stats }: Props) {
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleApprove = () => {
        if (confirm('Are you sure you want to approve this purchase inspection?')) {
            router.post(
                route('purchase-inspections.approve', inspection.id),
                {},
                {
                    onSuccess: () => toast.success('Inspection approved successfully!'),
                }
            );
        }
    };

    const handleReject = () => {
        if (!rejectionReason.trim()) {
            toast.error('Please specify a rejection reason.');
            return;
        }

        setSubmitting(true);
        router.post(
            route('purchase-inspections.reject', inspection.id),
            { rejection_reason: rejectionReason },
            {
                onSuccess: () => {
                    setRejectModalOpen(false);
                    toast.success('Inspection rejected.');
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    const handleSubmitForReview = () => {
        if (confirm('Submit this inspection for manager review and approval?')) {
            router.post(
                route('purchase-inspections.submit', inspection.id),
                {},
                {
                    onSuccess: () => toast.success('Inspection submitted!'),
                }
            );
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 text-xs px-2.5 py-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approved
                    </Badge>
                );
            case 'submitted':
                return (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300 text-xs px-2.5 py-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 mr-1" /> Submitted for Review
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 text-xs px-2.5 py-1 font-semibold">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Rejected
                    </Badge>
                );
            case 'draft':
            default:
                return (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 text-xs px-2.5 py-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Draft
                    </Badge>
                );
        }
    };

    const canApprove =
        inspection.status === 'submitted' && auth.permissions.includes('approve purchase inspections');
    const canEdit =
        (inspection.status === 'draft' || inspection.status === 'rejected') &&
        (auth.permissions.includes('edit purchase inspections') ||
            auth.user.id === inspection.inspector?.id);

    return (
        <AppLayout>
            <Head title={`Inspection ${inspection.reference_no}`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0">
                            <Link href={route('purchase-inspections.index')}>
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                                    {inspection.reference_no}
                                </h1>
                                {getStatusBadge(inspection.status)}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                Conducted on {inspection.inspection_date} at {inspection.store_name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5"
                            title="Print Inspection Report"
                        >
                            <Printer className="w-4 h-4 text-gray-500" />
                            Print
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 border-emerald-200"
                        >
                            <a href={route('purchase-inspections.export', inspection.id)} download>
                                <FileSpreadsheet className="w-4 h-4" />
                                Export CSV
                            </a>
                        </Button>

                        {inspection.status === 'draft' && (
                            <Button
                                size="sm"
                                onClick={handleSubmitForReview}
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                            >
                                <Send className="w-4 h-4" />
                                Submit for Review
                            </Button>
                        )}

                        {canEdit && (
                            <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="flex items-center gap-1.5"
                            >
                                <Link href={route('purchase-inspections.edit', inspection.id)}>
                                    <Pencil className="w-4 h-4 text-blue-600" />
                                    Edit Inspection
                                </Link>
                            </Button>
                        )}

                        {canApprove && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={handleApprove}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Approve
                                </Button>

                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejectModalOpen(true)}
                                    className="flex items-center gap-1.5"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Rejection notice */}
                {inspection.status === 'rejected' && inspection.rejection_reason && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                        <div className="text-sm font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            Inspection Rejected by {inspection.approver?.name ?? 'Manager'}
                        </div>
                        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                            Reason: {inspection.rejection_reason}
                        </p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-indigo-600">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Products
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                {stats.total_items}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-600">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Inspected Qty
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                {Number(stats.total_inspected_qty).toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
                                Passed Condition
                            </div>
                            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                                {stats.passed_items}
                                <span className="text-xs font-normal text-emerald-600 ml-1.5">
                                    ({stats.pass_rate}%)
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-rose-600">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">
                                Failed Condition
                            </div>
                            <div className="text-2xl font-bold text-rose-900 dark:text-rose-200 mt-1">
                                {stats.failed_items}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Inspection Info & Workflow Summary */}
                <Card className="shadow-sm border">
                    <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            Inspection Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                            <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                    Inspector
                                </span>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-1.5">
                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                    {inspection.inspector?.name ?? 'N/A'}
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                    Store & Location
                                </span>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-1.5">
                                    <Store className="w-4 h-4 text-gray-400" />
                                    {inspection.store_name}
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                    Inspection Date
                                </span>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {inspection.inspection_date}
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                    Approver Review
                                </span>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                                    {inspection.approver ? (
                                        <span>
                                            {inspection.approver.name}{' '}
                                            <span className="text-xs text-gray-400 block font-normal">
                                                {inspection.approved_at?.slice(0, 16)}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 italic font-normal">Pending approval</span>
                                    )}
                                </div>
                            </div>

                            {inspection.notes && (
                                <div className="sm:col-span-4 border-t pt-3 mt-1">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                        Notes / Memo
                                    </span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                                        {inspection.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Products Table */}
                <Card className="overflow-hidden shadow-sm border">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">
                            Inspection Items & Balances
                        </CardTitle>
                        <CardDescription>
                            Comparison between Main Store confirmed balance and inspected incoming quantity.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b font-semibold">
                                    <tr>
                                        <th className="py-3 px-4 w-12 text-center">#</th>
                                        <th className="py-3 px-4">Child Category</th>
                                        <th className="py-3 px-4">Product Code</th>
                                        <th className="py-3 px-4">Product Name</th>
                                        <th className="py-3 px-4 text-right">Main Store Balance</th>
                                        <th className="py-3 px-4 text-right">Inspected Qty</th>
                                        <th className="py-3 px-4 text-center">UOM</th>
                                        <th className="py-3 px-4 text-center">Condition</th>
                                        <th className="py-3 px-4">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {inspection.items.map((item, idx) => (
                                        <tr
                                            key={item.id}
                                            className={`transition-colors ${
                                                item.status === 'fail'
                                                    ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/40'
                                            }`}
                                        >
                                            <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-400">
                                                {idx + 1}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <Badge
                                                    variant="outline"
                                                    className="font-normal text-xs bg-slate-50 dark:bg-slate-800"
                                                >
                                                    {item.child_category?.child_name ?? 'N/A'}
                                                </Badge>
                                            </td>

                                            <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                                                {item.product?.product_code || '-'}
                                            </td>

                                            <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-gray-100">
                                                {item.product?.product_name ?? `Product #${item.product_id}`}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300">
                                                {Number(item.main_store_balance).toLocaleString()}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                                                {Number(item.inspected_quantity).toLocaleString()}
                                            </td>

                                            <td className="py-3.5 px-4 text-center text-xs text-gray-500">
                                                {item.unit_of_measure || '-'}
                                            </td>

                                            <td className="py-3.5 px-4 text-center">
                                                {item.status === 'pass' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Pass
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                                                        <XCircle className="w-3 h-3 mr-1" /> Fail
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                                                {item.remarks || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Rejection Modal */}
                <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-rose-600 flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                Reject Purchase Inspection
                            </DialogTitle>
                            <DialogDescription>
                                Provide a reason for rejecting this inspection. The inspector will be able to review and correct the inspection.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-2">
                            <Textarea
                                placeholder="State the reason for rejection (e.g., incorrect store balance, quantity mismatch, failed product condition)..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                                className="text-sm"
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRejectModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={submitting || !rejectionReason.trim()}
                                onClick={handleReject}
                            >
                                Confirm Rejection
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
