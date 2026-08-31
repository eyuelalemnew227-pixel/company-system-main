import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Building2, MessageSquare, Send, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
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

interface Props {
    senderDepartment: string;
    departments: DepartmentItem[];
    linkedBranchesCount: number;
    linkedUsersCount: number;
}

export default function BroadcastAnnouncementsIndex({
    senderDepartment,
    departments,
    linkedBranchesCount,
    linkedUsersCount,
}: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        message: '',
        target: 'all',
        department_id: '',
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
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                                            <span className="font-bold text-slate-900 dark:text-slate-100">Branch Channels Only</span>
                                        </div>
                                        <span className="mt-1 text-xs text-muted-foreground">Broadcast to official branch channels only</span>
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
            </div>
        </AppLayout>
    );
}
