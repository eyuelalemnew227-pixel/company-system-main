import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Printer,
    Send,
    Edit,
    ArrowLeft,
    Copy,
    Check,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Internal Memorandum', href: '/memos' },
    { title: 'View Memorandum', href: '#' },
];

interface MemoItem {
    id: number;
    memo_id: string;
    title: string;
    memo_date: string;
    sender_name: string;
    sender_position?: string;
    recipient_name: string;
    content: string;
    priority: string;
    departments?: string[];
    signature_type: 'typed' | 'drawn';
    signature_data?: string;
    status: string;
    created_at: string;
}

interface Props {
    memo: MemoItem;
    companyInfo: {
        name: string;
        logo: string;
    };
    userPermissions: {
        canEdit: boolean;
    };
}

export default function MemoShow({
    memo,
    companyInfo,
    userPermissions,
}: Props) {
    const [copied, setCopied] = useState(false);

    // Format short date (YYYY-MM-DD)
    const formattedDate = memo.memo_date ? String(memo.memo_date).split('T')[0] : '';
    const logoUrl = companyInfo.logo || '/images/logo.png';

    const handlePrint = () => {
        window.print();
    };

    const formatContentHtml = (content: string) => {
        if (!content) return '';
        let html = content;
        // Parse Markdown bold **text** to <b>text</b>
        html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // Parse Markdown italic *text* to <i>text</i>
        html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<i>$1</i>');
        // Parse Markdown headers
        html = html.replace(/^### (.*$)/gim, '<h3 class="font-bold text-base mt-2 mb-1">$1</h3>');
        // Convert newlines to <br />
        return html.replace(/\n/g, '<br />');
    };

    const handleCopyLink = () => {
        const pdfUrl = `${window.location.origin}/memos/${memo.id}/pdf`;
        navigator.clipboard.writeText(pdfUrl);
        setCopied(true);
        toast.success('Direct PDF link copied to clipboard!');
        setTimeout(() => setCopied(false), 3000);
    };

    const handleSendTelegram = () => {
        router.post(
            `/memos/${memo.id}/send-telegram`,
            {},
            {
                onSuccess: () => toast.success('Telegram alert sent successfully!'),
                onError: () => toast.error('Failed to send Telegram alert.'),
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Memo - ${memo.memo_id}`} />

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    header, nav, aside, .print\\:hidden {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable-memo-card, #printable-memo-card * {
                        visibility: visible;
                    }
                    #printable-memo-card {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    @page {
                        margin: 1.5cm;
                    }
                }
            ` }} />

            <div className="mx-auto max-w-4xl space-y-6 p-6">
                {/* Top Actions Bar (Hidden on Print) */}
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.history.back()}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to List
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Copy Link Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            className="gap-2"
                            title="Copy direct PDF link"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copied!' : 'Copy PDF Link'}
                        </Button>

                        {/* Send Telegram Button */}
                        <Button variant="outline" size="sm" onClick={handleSendTelegram} className="gap-2">
                            <Send className="h-4 w-4 text-blue-600" />
                            Send to Telegram
                        </Button>

                        {userPermissions.canEdit && (
                            <Link href={`/memos/${memo.id}/edit`}>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Edit className="h-4 w-4 text-amber-600" />
                                    Edit
                                </Button>
                            </Link>
                        )}

                        {/* Print / Save PDF */}
                        <Button
                            size="sm"
                            onClick={handlePrint}
                            className="gap-2 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                        >
                            <Printer className="h-4 w-4" />
                            Print / Save PDF
                        </Button>
                    </div>
                </div>

                {/* MEMORANDUM DOCUMENT CONTAINER (Printable Target) */}
                <div id="printable-memo-card">
                <Card className="border border-slate-300 shadow-xl dark:border-slate-800 bg-white dark:bg-slate-950 p-8 md:p-12 print:border-none print:shadow-none print:p-0">
                    {/* Header Logo & Title */}
                    <div className="border-b-4 border-amber-900 pb-6 text-center dark:border-amber-700">
                        <img
                            src={logoUrl}
                            alt="Kaldi's Coffee Logo"
                            className="mx-auto mb-3 h-20 w-20 rounded-full border-2 border-amber-900 object-cover p-1 shadow-md bg-white print:block print:h-20 print:w-20 print:mx-auto"
                        />
                        <h1 className="text-2xl font-bold tracking-wider text-amber-950 dark:text-amber-300 uppercase">
                            {companyInfo.name || "KALDI'S COFFEE P.L.C."}
                        </h1>
                        <h2 className="mt-1 text-xl font-bold tracking-widest text-slate-800 dark:text-slate-200 uppercase">
                            INTERNAL MEMORANDUM
                        </h2>
                    </div>

                    {/* Metadata Information Box */}
                    <div className="my-6 rounded-lg border-l-4 border-amber-800 bg-amber-50/50 p-5 dark:border-amber-600 dark:bg-amber-950/20 text-sm space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">MEMO REF:</span>{' '}
                                <span className="font-mono font-bold text-amber-900 dark:text-amber-400">
                                    {memo.memo_id}
                                </span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">DATE:</span>{' '}
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{formattedDate}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                            <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">TO:</span>{' '}
                                <span className="font-semibold">{memo.recipient_name}</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">FROM:</span>{' '}
                                <span className="font-semibold">{memo.sender_name}</span>
                            </div>
                        </div>

                        <div className="pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                            <span className="font-bold text-slate-900 dark:text-slate-100">SUBJECT:</span>{' '}
                            <span className="font-bold text-slate-900 dark:text-slate-100 underline">
                                {memo.title}
                            </span>
                        </div>
                    </div>

                    {/* Memorandum Body Content */}
                    <div
                        className="min-h-[260px] py-4 text-slate-900 dark:text-slate-100 leading-relaxed font-sans text-base prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: formatContentHtml(memo.content) }}
                    />

                    {/* Sender Signature Block */}
                    <div className="mt-12 flex justify-end">
                        <div className="w-64 text-center space-y-1">
                            {memo.signature_type === 'drawn' && memo.signature_data ? (
                                <img
                                    src={memo.signature_data}
                                    alt="Sender Signature"
                                    className="mx-auto h-20 max-w-[200px] object-contain"
                                />
                            ) : (
                                <div className="font-serif italic text-2xl tracking-wide text-amber-950 dark:text-amber-200 py-2">
                                    {memo.signature_data || memo.sender_name}
                                </div>
                            )}
                            <div className="mx-auto w-48 border-b-2 border-slate-900 dark:border-slate-100" />
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                {memo.sender_name}
                            </div>
                            {memo.sender_position && (
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                                    {memo.sender_position}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
                </div>
            </div>
        </AppLayout>
    );
}
