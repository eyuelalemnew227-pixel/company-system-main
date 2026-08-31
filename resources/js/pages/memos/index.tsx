import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    FileText,
    Plus,
    Search,
    Send,
    Eye,
    Edit,
    Trash2,
    Settings,
    FileSpreadsheet,
    UserCheck,
    Clock,
    Copy,
    Check,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Internal Memorandum', href: '/memos' },
];

interface DepartmentItem {
    id: number;
    name: string;
}

interface MemoItem {
    id: number;
    memo_id: string;
    title: string;
    memo_date: string;
    sender_name: string;
    recipient_name: string;
    status: string;
    telegram_status: string;
    created_at: string;
}

interface Props {
    memos: {
        data: MemoItem[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search: string;
        department: string;
        tab: string;
    };
    stats: {
        total: number;
        myCount: number;
        todayCount: number;
    };
    departments: DepartmentItem[];
    isSuperAdmin?: boolean;
}

export default function MemosIndex({ memos, filters, stats, departments, isSuperAdmin }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [department, setDepartment] = useState(filters.department || 'all');
    const [tab, setTab] = useState(filters.tab || 'all');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const handleFilterChange = (newParams: Partial<typeof filters>) => {
        router.get(
            '/memos',
            {
                search,
                department,
                tab,
                ...newParams,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = (memoId: number, title: string) => {
        if (confirm(`Are you sure you want to delete memorandum "${title}"?`)) {
            router.delete(`/memos/${memoId}`, {
                onSuccess: () => toast.success('Memorandum deleted successfully.'),
                onError: () => toast.error('Failed to delete memorandum.'),
            });
        }
    };

    const handleSendTelegram = (memoId: number) => {
        router.post(`/memos/${memoId}/send-telegram`, {}, {
            onSuccess: () => toast.success('Telegram notification sent.'),
            onError: () => toast.error('Failed to send Telegram notification.'),
        });
    };

    const handleCopyLink = (memoId: number) => {
        const url = `${window.location.origin}/memos/${memoId}/pdf`;
        navigator.clipboard.writeText(url);
        setCopiedId(memoId);
        toast.success('Direct PDF link copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2500);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Internal Memorandum" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header Banner */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            <FileText className="h-6 w-6 text-amber-700 dark:text-amber-500" />
                            Internal Memorandum
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Create, dispatch, and view official internal company memorandums.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link href="/memo-templates">
                            <Button variant="outline" size="sm" className="gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Templates
                            </Button>
                        </Link>
                        {isSuperAdmin && (
                            <Link href="/memo-settings">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </Button>
                            </Link>
                        )}
                        <Link href="/memos/create">
                            <Button size="sm" className="gap-2 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700">
                                <Plus className="h-4 w-4" />
                                New Memorandum
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Total Memos
                            </CardTitle>
                            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {stats.total}
                            </div>
                            <p className="text-xs text-muted-foreground">Internal memorandums</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Authored by Me
                            </CardTitle>
                            <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {stats.myCount}
                            </div>
                            <p className="text-xs text-muted-foreground">Memos authored by your account</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Issued Today
                            </CardTitle>
                            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {stats.todayCount}
                            </div>
                            <p className="text-xs text-muted-foreground">Memos issued on current date</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Tabs Card */}
                <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                    <CardContent className="p-4 space-y-4">
                        {isSuperAdmin && (
                            <Tabs
                                value={tab}
                                onValueChange={(v) => {
                                    setTab(v);
                                    handleFilterChange({ tab: v });
                                }}
                            >
                                <TabsList className="grid w-full grid-cols-2 max-w-xs">
                                    <TabsTrigger value="all">All Memos</TabsTrigger>
                                    <TabsTrigger value="my">My Memos</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by Ref ID, Subject, Sender..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFilterChange({ search })}
                                    className="pl-9"
                                />
                            </div>

                            <Select
                                value={department}
                                onValueChange={(val) => {
                                    setDepartment(val);
                                    handleFilterChange({ department: val });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Department Filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.name}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Memos Table */}
                <Card className="border border-slate-200 shadow-md dark:border-slate-800">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900">
                            <TableRow>
                                <TableHead className="w-[140px] font-bold">Memo Ref ID</TableHead>
                                <TableHead className="font-bold">Subject / Title</TableHead>
                                <TableHead className="w-[130px] font-bold">Date</TableHead>
                                <TableHead className="font-bold">From</TableHead>
                                <TableHead className="font-bold">To / Recipient</TableHead>
                                <TableHead className="w-[110px] font-bold text-center">Telegram</TableHead>
                                <TableHead className="w-[140px] text-right font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {memos.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        No internal memorandums found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                memos.data.map((memo) => (
                                    <TableRow key={memo.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                                        <TableCell className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400">
                                            {memo.memo_id}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                            <Link href={`/memos/${memo.id}`} className="hover:underline">
                                                {memo.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {memo.memo_date}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {memo.sender_name}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {memo.recipient_name}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {memo.telegram_status === 'sent' ? (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                    Sent
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Link href={`/memos/${memo.id}`}>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" title="View Memorandum">
                                                        <Eye className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    title="Copy Link"
                                                    onClick={() => handleCopyLink(memo.id)}
                                                >
                                                    {copiedId === memo.id ? (
                                                        <Check className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                                    title="Send Telegram Alert"
                                                    onClick={() => handleSendTelegram(memo.id)}
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                                <Link href={`/memos/${memo.id}/edit`}>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:text-amber-700" title="Edit Memo">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                                    title="Delete Memo"
                                                    onClick={() => handleDelete(memo.id, memo.title)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}
