import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Building2, CheckCircle2, Clock, Eye, History, MessageSquare, Search, Send, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Ticketing', href: '/tickets' },
    { title: 'Broadcast Announcement', href: '/broadcast-announcements' },
];

interface DepartmentItem {
    id: number;
    name: string;
}

interface BranchItem {
    id: number;
    name: string;
}

interface BroadcastHistoryItem {
    id: number;
    sender_name: string;
    department_name: string;
    branch_name: string | null;
    target_audience: string;
    title: string;
    message: string;
    recipients_count: number;
    sent_count: number;
    created_at: string;
}

interface Props {
    senderDepartment: string;
    departments: DepartmentItem[];
    branches?: BranchItem[];
    linkedBranchesCount: number;
    linkedUsersCount: number;
    broadcastHistory?: BroadcastHistoryItem[];
}

export default function BroadcastAnnouncementsIndex({
    senderDepartment,
    departments,
    branches = [],
    linkedBranchesCount,
    linkedUsersCount,
    broadcastHistory = [],
}: Props) {
    const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastHistoryItem | null>(null);
    const [historySearch, setHistorySearch] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        message: '',
        target: 'all',
        department_id: '',
        branch_id: '',
    });

    const activeDeptName =
        departments.find((d) => String(d.id) === String(data.department_id))?.name || senderDepartment;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/broadcast-announcements', {
            onSuccess: () => {
                toast.success('Broadcast announcement dispatched successfully!');
                reset('title', 'message');
            },
            onError: (errs) => {
                console.error('Broadcast errors:', errs);
                toast.error('Failed to send broadcast announcement. Please check form inputs.');
            },
        });
    };

    const filteredHistory = broadcastHistory.filter((item) => {
        const query = historySearch.toLowerCase();
        return (
            item.title.toLowerCase().includes(query) ||
            item.department_name.toLowerCase().includes(query) ||
            item.sender_name.toLowerCase().includes(query) ||
            (item.branch_name && item.branch_name.toLowerCase().includes(query)) ||
            item.message.toLowerCase().includes(query)
        );
    });

    const renderAudienceBadge = (target: string, branchName?: string | null) => {
        switch (target) {
            case 'everything':
                return <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">All Recipients</Badge>;
            case 'all_branches':
                return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">All Branches</Badge>;
            case 'all_users':
                return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Staff & Users</Badge>;
            case 'department_users':
                return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Department Users</Badge>;
            case 'specific_branch':
                return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{branchName || 'Branch'}</Badge>;
            default:
                return <Badge variant="outline">{target}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Broadcast Announcement" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            <Send className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Broadcast Announcement
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Publish instant Telegram broadcasts to linked branch channels and technical staff.
                        </p>
                    </div>
                    <Badge variant="outline" className="w-fit bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        🏢 Department: {activeDeptName}
                    </Badge>
                </div>

                {/* Audience Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Linked Branch Channels
                            </CardTitle>
                            <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {linkedBranchesCount}
                            </div>
                            <p className="text-xs text-muted-foreground">Branches configured for Telegram alerts</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Linked Staff & Users
                            </CardTitle>
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {linkedUsersCount}
                            </div>
                            <p className="text-xs text-muted-foreground">User accounts linked to Telegram</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm dark:border-slate-800 sm:col-span-2 lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Total Reachable Audience
                            </CardTitle>
                            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {linkedBranchesCount + linkedUsersCount}
                            </div>
                            <p className="text-xs text-muted-foreground">Active Telegram channels & chat IDs</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Broadcast Composer Form */}
                <Card className="border border-slate-200 shadow-md dark:border-slate-800">
                    <CardHeader className="border-b bg-slate-50/50 pb-4 dark:bg-slate-900/50">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <Send className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            Compose Announcement
                        </CardTitle>
                        <CardDescription>
                            Select the publishing department and fill in the title and content to send your broadcast.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Department Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="department_id" className="font-semibold text-slate-800 dark:text-slate-200">
                                    Publishing Department <span className="text-red-500">*</span>
                                </Label>
                                <SearchableSelect
                                    options={departments}
                                    value={data.department_id}
                                    onValueChange={(val) => setData('department_id', val)}
                                    placeholder={`Default: ${senderDepartment}`}
                                    searchPlaceholder="Type to search department..."
                                    emptyText="No matching department found"
                                    className="h-11 w-full"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Recipients will see this department name clearly on top of the announcement.
                                </p>
                                {errors.department_id && <p className="text-xs font-medium text-red-500">{errors.department_id}</p>}
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title" className="font-semibold text-slate-800 dark:text-slate-200">
                                    Announcement Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. System Maintenance Notice"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    required
                                    className="h-11 text-base"
                                />
                                {errors.title && <p className="text-xs font-medium text-red-500">{errors.title}</p>}
                            </div>

                            {/* Target Audience */}
                            <div className="space-y-2">
                                <Label className="font-semibold text-slate-800 dark:text-slate-200">
                                    Target Audience <span className="text-red-500">*</span>
                                </Label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <label
                                        className={`flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                                            data.target === 'all'
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="target"
                                                value="all"
                                                checked={data.target === 'all'}
                                                onChange={(e) => setData('target', e.target.value)}
                                                className="h-4 w-4 text-indigo-600"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-slate-100">All Recipients</span>
                                        </div>
                                        <span className="mt-1 text-xs text-muted-foreground">Broadcast to all branches and users</span>
                                    </label>

                                    <label
                                        className={`flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                                            data.target === 'branches'
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="target"
                                                value="branches"
                                                checked={data.target === 'branches'}
                                                onChange={(e) => setData('target', e.target.value)}
                                                className="h-4 w-4 text-indigo-600"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-slate-100">All Branch Channels</span>
                                        </div>
                                        <span className="mt-1 text-xs text-muted-foreground">Broadcast to official branch channels only</span>
                                    </label>

                                    <label
                                        className={`flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                                            data.target === 'specific_branch'
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="target"
                                                value="specific_branch"
                                                checked={data.target === 'specific_branch'}
                                                onChange={(e) => setData('target', e.target.value)}
                                                className="h-4 w-4 text-indigo-600"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-slate-100">Selected Branch Only</span>
                                        </div>
                                        <span className="mt-1 text-xs text-muted-foreground">Target a single specific branch channel</span>
                                    </label>

                                    <label
                                        className={`flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                                            data.target === 'users'
                                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="target"
                                                value="users"
                                                checked={data.target === 'users'}
                                                onChange={(e) => setData('target', e.target.value)}
                                                className="h-4 w-4 text-indigo-600"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-slate-100">Staff & Users Only</span>
                                        </div>
                                        <span className="mt-1 text-xs text-muted-foreground">Broadcast to linked individual user accounts</span>
                                    </label>
                                </div>
                                {errors.target && <p className="text-xs font-medium text-red-500">{errors.target}</p>}
                            </div>

                            {/* Specific Branch Selector */}
                            {data.target === 'specific_branch' && (
                                <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                                    <Label htmlFor="branch_id" className="font-semibold text-slate-800 dark:text-slate-200">
                                        Select Target Branch <span className="text-red-500">*</span>
                                    </Label>
                                    <SearchableSelect
                                        options={branches}
                                        value={data.branch_id}
                                        onValueChange={(val) => setData('branch_id', val)}
                                        placeholder="Select branch to receive announcement..."
                                        searchPlaceholder="Type to search branch..."
                                        emptyText="No matching branch found"
                                        className="h-11 w-full bg-white dark:bg-slate-900"
                                    />
                                    {errors.branch_id && <p className="text-xs font-medium text-red-500">{errors.branch_id}</p>}
                                </div>
                            )}

                            {/* Message */}
                            <div className="space-y-2">
                                <Label htmlFor="message" className="font-semibold text-slate-800 dark:text-slate-200">
                                    Announcement Content <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="message"
                                    placeholder="Type your message text here..."
                                    rows={6}
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    required
                                    className="text-base"
                                />
                                {errors.message && <p className="text-xs font-medium text-red-500">{errors.message}</p>}
                            </div>

                            {/* Info Banner */}
                            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div>
                                    <p className="font-bold">Sender Header Notice:</p>
                                    <p>
                                        This broadcast will be delivered with header: <code className="font-mono font-bold">📢 ANNOUNCEMENT from {activeDeptName}</code>.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-indigo-600 px-6 font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {processing ? 'Sending Broadcast...' : '📢 Send Broadcast Announcement'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Broadcast History Table */}
                <Card className="border border-slate-200 shadow-md dark:border-slate-800">
                    <CardHeader className="border-b bg-slate-50/50 pb-4 dark:bg-slate-900/50">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                    <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    Broadcast History
                                </CardTitle>
                                <CardDescription>
                                    Log of previously sent announcement broadcasts and delivery metrics.
                                </CardDescription>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter history log..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="pl-8 text-sm"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Target Audience</TableHead>
                                    <TableHead>Dispatched By</TableHead>
                                    <TableHead className="text-center">Delivery Success</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No broadcast history records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredHistory.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                    {new Date(item.created_at).toLocaleString()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                                {item.department_name}
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[220px] truncate">
                                                {item.title}
                                            </TableCell>
                                            <TableCell>
                                                {renderAudienceBadge(item.target_audience, item.branch_name)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {item.sender_name}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`gap-1 font-mono text-xs ${
                                                        item.sent_count > 0 && item.sent_count === item.recipients_count
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
                                                    }`}
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {item.sent_count} / {item.recipients_count} Sent
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                                    onClick={() => setSelectedBroadcast(item)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Details Dialog */}
                <Dialog open={!!selectedBroadcast} onOpenChange={() => setSelectedBroadcast(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Send className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                {selectedBroadcast?.title}
                            </DialogTitle>
                            <DialogDescription>
                                Broadcast Announcement Metadata & Full Content
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBroadcast && (
                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-900 text-sm">
                                    <div>
                                        <span className="text-muted-foreground text-xs block">Department</span>
                                        <span className="font-semibold">{selectedBroadcast.department_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block">Sender</span>
                                        <span className="font-semibold">{selectedBroadcast.sender_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block">Audience</span>
                                        <div className="mt-0.5">
                                            {renderAudienceBadge(selectedBroadcast.target_audience, selectedBroadcast.branch_name)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block">Sent Date</span>
                                        <span className="font-semibold">{new Date(selectedBroadcast.created_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-muted-foreground">Delivered Metrics</Label>
                                    <div className="flex items-center gap-2 font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Successfully delivered to {selectedBroadcast.sent_count} out of {selectedBroadcast.recipients_count} targeted channel(s).
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Announcement Message Text</Label>
                                    <div className="rounded-lg border bg-white p-4 font-mono text-sm whitespace-pre-wrap dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed max-h-60 overflow-y-auto">
                                        {selectedBroadcast.message}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
