import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    AlertCircle,
    Bot,
    Building2,
    CheckCircle2,
    Edit3,
    Link2,
    MessageSquare,
    Power,
    PowerOff,
    RefreshCw,
    Send,
    Shield,
    Trash2,
    UserCheck,
    Users,
    UserX,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'System Administration', href: '/users' },
    { title: 'Telegram Config', href: '/telegram-config' },
];

type TelegramSettings = {
    id: number;
    bot_token: string | null;
    bot_username: string | null;
    webhook_url: string | null;
    is_active: boolean;
    parse_mode: string;
    deactivation_reason: string | null;
    updated_by: number | null;
    updater?: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
};

type UserItem = {
    id: number;
    name: string;
    email: string;
    phone_number: string | null;
    telegram_chat_id: string | null;
    telegram_username: string | null;
    department: string;
    branch: string;
    branch_id?: number | null;
    roles: string[];
    is_linked: boolean;
};

type BranchItem = {
    id: number;
    branch_code: string;
    name: string;
    location: string | null;
    telegram_chat_id: string | null;
    is_linked: boolean;
};

type Props = {
    settings: TelegramSettings;
    botInfo: any;
    webhookInfo: any;
    users: UserItem[];
    branches: BranchItem[];
    defaultWebhookUrl: string;
    userPermissions: string[];
};

export default function TelegramConfigIndex({
    settings,
    botInfo,
    webhookInfo,
    users,
    branches = [],
    defaultWebhookUrl,
    userPermissions,
}: Props) {
    const { flash } = usePage<{ flash: { success?: string; warning?: string; error?: string } }>().props;

    const canManage = userPermissions.includes('manage telegram config');

    // Filter states for Users table
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

    // Filter states for Branches table
    const [branchSearchQuery, setBranchSearchQuery] = useState('');
    const [branchStatusFilter, setBranchStatusFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

    const [branchesPage, setBranchesPage] = useState(1);
    const [usersPage, setUsersPage] = useState(1);
    const [budgetUsersPage, setBudgetUsersPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Reset pagination when filters change
    useEffect(() => {
        setUsersPage(1);
        setBudgetUsersPage(1);
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        setBranchesPage(1);
    }, [branchSearchQuery, branchStatusFilter]);

    // Edit User Chat ID Dialog State
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    // Edit Branch Chat ID Dialog State
    const [selectedBranch, setSelectedBranch] = useState<BranchItem | null>(null);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

    // Test Message Dialog State
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);

    // Forms
    const settingsForm = useForm({
        bot_token: settings.bot_token || '',
        is_active: settings.is_active,
        parse_mode: settings.parse_mode || 'HTML',
        deactivation_reason: settings.deactivation_reason || '',
    });

    const webhookForm = useForm({
        webhook_url: settings.webhook_url || defaultWebhookUrl,
    });

    const testMsgForm = useForm({
        chat_id: '',
        message: 'This is a test notification from the Company Ticketing System Telegram bot.',
    });

    const userChatIdForm = useForm({
        telegram_chat_id: '',
        telegram_username: '',
    });

    const branchChatIdForm = useForm({
        telegram_chat_id: '',
    });

    if (flash?.success) {
        toast.success(flash.success);
    }
    if (flash?.error) {
        toast.error(flash.error);
    }

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        settingsForm.post(route('telegram-config.update-settings'), {
            preserveScroll: true,
        });
    };

    const handleSetWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        webhookForm.post(route('telegram-config.set-webhook'), {
            preserveScroll: true,
        });
    };

    const handleRemoveWebhook = () => {
        router.post(
            route('telegram-config.remove-webhook'),
            {},
            {
                preserveScroll: true,
            }
        );
    };

    const handleSendTestMessage = (e: React.FormEvent) => {
        e.preventDefault();
        testMsgForm.post(route('telegram-config.test-message'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsTestModalOpen(false);
            },
        });
    };

    const handleOpenEditUser = (user: UserItem) => {
        setSelectedUser(user);
        userChatIdForm.setData({
            telegram_chat_id: user.telegram_chat_id || '',
            telegram_username: user.telegram_username || '',
        });
        setIsUserModalOpen(true);
    };

    const handleSaveUserChatId = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        userChatIdForm.put(route('telegram-config.update-user', selectedUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsUserModalOpen(false);
                setSelectedUser(null);
            },
        });
    };

    const handleOpenEditBranch = (branch: BranchItem) => {
        setSelectedBranch(branch);
        branchChatIdForm.setData({
            telegram_chat_id: branch.telegram_chat_id || '',
        });
        setIsBranchModalOpen(true);
    };

    const handleSaveBranchChatId = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBranch) return;

        branchChatIdForm.put(route('telegram-config.update-branch', selectedBranch.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsBranchModalOpen(false);
                setSelectedBranch(null);
            },
        });
    };

    // Filter Users
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.telegram_chat_id && user.telegram_chat_id.includes(searchQuery));

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'linked' && user.is_linked) ||
            (statusFilter === 'unlinked' && !user.is_linked);

        return matchesSearch && matchesStatus;
    });

    const paginatedUsers = filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE);
    const totalUsersPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

    const budgetUsers = users.filter((user) => user.branch_id === 5);
    const filteredBudgetUsers = budgetUsers.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.telegram_chat_id && user.telegram_chat_id.includes(searchQuery));

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'linked' && user.is_linked) ||
            (statusFilter === 'unlinked' && !user.is_linked);

        return matchesSearch && matchesStatus;
    });

    const paginatedBudgetUsers = filteredBudgetUsers.slice((budgetUsersPage - 1) * ITEMS_PER_PAGE, budgetUsersPage * ITEMS_PER_PAGE);
    const totalBudgetUsersPages = Math.max(1, Math.ceil(filteredBudgetUsers.length / ITEMS_PER_PAGE));

    // Filter Branches
    const filteredBranches = branches.filter((branch) => {
        const matchesSearch =
            branch.name.toLowerCase().includes(branchSearchQuery.toLowerCase()) ||
            branch.branch_code.toLowerCase().includes(branchSearchQuery.toLowerCase()) ||
            (branch.location && branch.location.toLowerCase().includes(branchSearchQuery.toLowerCase())) ||
            (branch.telegram_chat_id && branch.telegram_chat_id.includes(branchSearchQuery));

        const matchesStatus =
            branchStatusFilter === 'all' ||
            (branchStatusFilter === 'linked' && branch.is_linked) ||
            (branchStatusFilter === 'unlinked' && !branch.is_linked);

        return matchesSearch && matchesStatus;
    });

    const paginatedBranches = filteredBranches.slice((branchesPage - 1) * ITEMS_PER_PAGE, branchesPage * ITEMS_PER_PAGE);
    const totalBranchesPages = Math.max(1, Math.ceil(filteredBranches.length / ITEMS_PER_PAGE));

    const isBotOk = botInfo?.ok && botInfo?.result?.id;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Telegram Configuration" />

            <div className="container mx-auto space-y-6 p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Send className="size-6 text-sky-500" />
                            Telegram Bot Configuration & Webhook
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Configure Telegram Bot API token, register Webhooks, and view active notification status for ticketing users.
                        </p>
                    </div>
                    {canManage && (
                        <Button
                            variant="outline"
                            onClick={() => setIsTestModalOpen(true)}
                            disabled={!settings.is_active || !settings.bot_token}
                            className="flex items-center gap-2"
                        >
                            <Send className="size-4" />
                            Test Message
                        </Button>
                    )}
                </div>

                {/* Status Dashboard Grid */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Bot Service Status */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-base">
                                Bot Service Status
                                {settings.is_active ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        <CheckCircle2 className="mr-1 size-3" /> Enabled
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        <PowerOff className="mr-1 size-3" /> Disabled
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">Bot Connected:</span>
                                {isBotOk ? (
                                    <span className="font-semibold text-emerald-600">Yes (@{botInfo.result.username})</span>
                                ) : (
                                    <span className="font-semibold text-red-500">Not Connected</span>
                                )}
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">Parse Mode:</span>
                                <span className="font-mono font-medium">{settings.parse_mode}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-muted-foreground">Last Updated By:</span>
                                <span>{settings.updater?.name || 'System'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bot Identity Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Bot className="size-4 text-sky-500" />
                                Bot Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {isBotOk ? (
                                <>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-muted-foreground">Bot Name:</span>
                                        <span className="font-medium">{botInfo.result.first_name}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-muted-foreground">Username:</span>
                                        <span className="font-mono font-medium">@{botInfo.result.username}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-muted-foreground">Bot ID:</span>
                                        <span className="font-mono">{botInfo.result.id}</span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">
                                    Please set a valid Bot Token below to retrieve Bot information from Telegram.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Webhook Status */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Link2 className="size-4 text-sky-500" />
                                Webhook Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">Webhook Set:</span>
                                {webhookInfo?.result?.url ? (
                                    <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                                        Registered
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                                        Not Registered
                                    </Badge>
                                )}
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">Pending Updates:</span>
                                <span>{webhookInfo?.result?.pending_update_count ?? 0}</span>
                            </div>
                            <div className="flex justify-between pt-1 truncate">
                                <span className="text-muted-foreground">Registered URL:</span>
                                <span className="font-mono text-xs truncate max-w-[160px]" title={webhookInfo?.result?.url || 'None'}>
                                    {webhookInfo?.result?.url || 'None'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Settings Forms & Webhook Manager Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Bot Settings Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Bot Credentials & Settings</CardTitle>
                            <CardDescription>
                                Set the Bot Token generated via @BotFather in Telegram.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bot_token">Bot Token</Label>
                                    <Input
                                        id="bot_token"
                                        type="password"
                                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                                        value={settingsForm.data.bot_token}
                                        onChange={(e) => settingsForm.setData('bot_token', e.target.value)}
                                        disabled={!canManage}
                                    />
                                    {settingsForm.errors.bot_token && (
                                        <p className="text-xs text-red-500">{settingsForm.errors.bot_token}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="parse_mode">Message Formatting</Label>
                                        <Select
                                            value={settingsForm.data.parse_mode}
                                            onValueChange={(val) => settingsForm.setData('parse_mode', val)}
                                            disabled={!canManage}
                                        >
                                            <SelectTrigger id="parse_mode">
                                                <SelectValue placeholder="Select parse mode" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="HTML">HTML (Recommended)</SelectItem>
                                                <SelectItem value="Markdown">Markdown</SelectItem>
                                                <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col justify-end space-y-2">
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <Label htmlFor="is_active" className="cursor-pointer font-medium">
                                                Enable Bot
                                            </Label>
                                            <Switch
                                                id="is_active"
                                                checked={settingsForm.data.is_active}
                                                onCheckedChange={(checked) => settingsForm.setData('is_active', checked)}
                                                disabled={!canManage}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!settingsForm.data.is_active && (
                                    <div className="space-y-2">
                                        <Label htmlFor="deactivation_reason">Deactivation Reason</Label>
                                        <Textarea
                                            id="deactivation_reason"
                                            rows={2}
                                            placeholder="Provide reason for disabling Telegram notifications..."
                                            value={settingsForm.data.deactivation_reason}
                                            onChange={(e) => settingsForm.setData('deactivation_reason', e.target.value)}
                                            disabled={!canManage}
                                        />
                                    </div>
                                )}

                                {canManage && (
                                    <Button type="submit" disabled={settingsForm.processing} className="w-full">
                                        Save Bot Settings
                                    </Button>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Webhook Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Telegram Webhook Manager</CardTitle>
                            <CardDescription>
                                Register a Webhook URL so Telegram sends real-time user commands (`/start`, `/chatid`) to your system.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 p-3 text-xs text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                💡 <b>Note:</b> Telegram requires a secure <b>HTTPS</b> URL for incoming webhooks (e.g. <code>https://yourdomain.com/api/telegram/webhook</code>). Outbound notifications do <b>not</b> require a webhook—messages send automatically once user/branch Chat IDs are linked!
                            </div>

                            <form onSubmit={handleSetWebhook} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="webhook_url">Webhook Endpoint URL</Label>
                                        <button
                                            type="button"
                                            onClick={() => webhookForm.setData('webhook_url', defaultWebhookUrl)}
                                            className="text-[11px] font-semibold text-sky-600 hover:underline"
                                        >
                                            Use Default Endpoint
                                        </button>
                                    </div>
                                    <Input
                                        id="webhook_url"
                                        type="url"
                                        placeholder="https://yourdomain.com/api/telegram/webhook"
                                        value={webhookForm.data.webhook_url}
                                        onChange={(e) => webhookForm.setData('webhook_url', e.target.value)}
                                        disabled={!canManage}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Default endpoint: <code className="bg-muted px-1 rounded">{defaultWebhookUrl}</code>
                                    </p>
                                    {webhookForm.errors.webhook_url && (
                                        <p className="text-xs font-semibold text-red-500">{webhookForm.errors.webhook_url}</p>
                                    )}
                                </div>

                                {canManage && (
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={webhookForm.processing} className="flex-1 font-bold">
                                            <Link2 className="mr-2 size-4" />
                                            Register Webhook
                                        </Button>

                                        {webhookInfo?.result?.url && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleRemoveWebhook}
                                                className="text-red-500 hover:text-red-600 font-bold"
                                            >
                                                <Trash2 className="mr-2 size-4" />
                                                Remove Webhook
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </form>

                            {webhookInfo?.result?.last_error_message && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                                    <span className="font-semibold">Last Webhook Error:</span> {webhookInfo.result.last_error_message}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Separate Notification Mapping Cards using Tabs */}
                <Tabs defaultValue="branches" className="w-full space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold tracking-tight">Notification Recipient Mappings</h3>
                            <p className="text-xs text-muted-foreground">
                                Configure dedicated Chat IDs for Branches vs. individual User Chat IDs for IT, Maintenance & Operations staff.
                            </p>
                        </div>
                        <TabsList className="grid grid-cols-3 w-full sm:w-[620px]">
                            <TabsTrigger value="branches" className="flex items-center gap-2">
                                <Building2 className="size-4" />
                                <span className="hidden sm:inline">Branch Mappings</span>
                                <span className="sm:hidden">Branches</span>
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                                    {branches.filter((b) => b.is_linked).length}/{branches.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="users" className="flex items-center gap-2">
                                <Users className="size-4" />
                                <span className="hidden sm:inline">IT & Ops Users</span>
                                <span className="sm:hidden">IT/Ops</span>
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                                    {users.filter((u) => u.is_linked).length}/{users.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="budget-users" className="flex items-center gap-2">
                                <UserCheck className="size-4" />
                                <span className="hidden sm:inline">Weekly Budget Users</span>
                                <span className="sm:hidden">Budget</span>
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                                    {budgetUsers.filter((u) => u.is_linked).length}/{budgetUsers.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Tab 1: Branch Telegram Linking Table */}
                    <TabsContent value="branches" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="size-5 text-primary" />
                                            Branch Telegram Chat ID Mapping
                                        </CardTitle>
                                        <CardDescription>
                                            Assign Telegram Chat IDs for Branches so branch-level ticket notifications are delivered to the branch channel or group.
                                        </CardDescription>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            placeholder="Search branch code, name, chat ID..."
                                            value={branchSearchQuery}
                                            onChange={(e) => setBranchSearchQuery(e.target.value)}
                                            className="w-full sm:w-64"
                                        />

                                        <Select value={branchStatusFilter} onValueChange={(val: any) => setBranchStatusFilter(val)}>
                                            <SelectTrigger className="w-full sm:w-36">
                                                <SelectValue placeholder="Status Filter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Branches</SelectItem>
                                                <SelectItem value="linked">Linked</SelectItem>
                                                <SelectItem value="unlinked">Not Linked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Branch Code</TableHead>
                                                <TableHead>Branch Name</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>Telegram Chat ID</TableHead>
                                                <TableHead>Telegram Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBranches.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                        No branches found matching your filter criteria.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedBranches.map((branch) => (
                                                    <TableRow key={branch.id}>
                                                        <TableCell className="font-mono text-xs font-semibold">
                                                            {branch.branch_code}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {branch.name}
                                                        </TableCell>
                                                        <TableCell>{branch.location || '-'}</TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {branch.telegram_chat_id ? branch.telegram_chat_id : <span className="text-muted-foreground italic">None</span>}
                                                        </TableCell>
                                                        <TableCell>
                                                            {branch.is_linked ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    <UserCheck className="mr-1 size-3" /> Linked
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-amber-500 text-amber-600">
                                                                    <UserX className="mr-1 size-3" /> Not Linked
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {canManage && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleOpenEditBranch(branch)}
                                                                    title="Edit Branch Chat ID"
                                                                >
                                                                    <Edit3 className="size-4" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {totalBranchesPages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-muted-foreground">
                                            Showing {(branchesPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(branchesPage * ITEMS_PER_PAGE, filteredBranches.length)} of {filteredBranches.length}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setBranchesPage(p => Math.max(1, p - 1))} disabled={branchesPage === 1}>Previous</Button>
                                            <div className="text-xs font-medium px-2">Page {branchesPage} of {totalBranchesPages}</div>
                                            <Button variant="outline" size="sm" onClick={() => setBranchesPage(p => Math.min(totalBranchesPages, p + 1))} disabled={branchesPage === totalBranchesPages}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 2: Users Telegram Linking Table */}
                    <TabsContent value="users" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="size-5 text-primary" />
                                            User Telegram Chat ID Mapping (IT & Operations Staff)
                                        </CardTitle>
                                        <CardDescription>
                                            Manage Telegram Chat IDs for Department Managers, IT Technicians, and Operations staff users so they receive assigned/escalation alerts.
                                        </CardDescription>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            placeholder="Search users, dept, chat ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full sm:w-64"
                                        />

                                        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                            <SelectTrigger className="w-full sm:w-36">
                                                <SelectValue placeholder="Status Filter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Users</SelectItem>
                                                <SelectItem value="linked">Linked</SelectItem>
                                                <SelectItem value="unlinked">Not Linked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User Name</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Roles</TableHead>
                                                <TableHead>Telegram Chat ID</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Telegram Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                                        No users found matching your filter criteria.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedUsers.map((user) => (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="font-medium">
                                                            <div>
                                                                <div>{user.name}</div>
                                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{user.department}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {user.roles.map((r, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                                        {r}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {user.telegram_chat_id ? user.telegram_chat_id : <span className="text-muted-foreground italic">None</span>}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {user.telegram_username ? `@${user.telegram_username}` : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.is_linked ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    <UserCheck className="mr-1 size-3" /> Linked
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-amber-500 text-amber-600">
                                                                    <UserX className="mr-1 size-3" /> Not Linked
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {canManage && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleOpenEditUser(user)}
                                                                    title="Edit Chat ID"
                                                                >
                                                                    <Edit3 className="size-4" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {totalUsersPages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-muted-foreground">
                                            Showing {(usersPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(usersPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setUsersPage(p => Math.max(1, p - 1))} disabled={usersPage === 1}>Previous</Button>
                                            <div className="text-xs font-medium px-2">Page {usersPage} of {totalUsersPages}</div>
                                            <Button variant="outline" size="sm" onClick={() => setUsersPage(p => Math.min(totalUsersPages, p + 1))} disabled={usersPage === totalUsersPages}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {/* Tab 3: Weekly Budget Users Telegram Linking Table */}
                    <TabsContent value="budget-users" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <UserCheck className="size-5 text-primary" />
                                            Weekly Budget Users Telegram Chat ID Mapping (Head Office)
                                        </CardTitle>
                                        <CardDescription>
                                            Manage Telegram Chat IDs for Head Office users involved in the Weekly Budget workflow.
                                        </CardDescription>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            placeholder="Search users, dept, chat ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full sm:w-64"
                                        />

                                        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                            <SelectTrigger className="w-full sm:w-36">
                                                <SelectValue placeholder="Status Filter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Users</SelectItem>
                                                <SelectItem value="linked">Linked</SelectItem>
                                                <SelectItem value="unlinked">Not Linked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User Name</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Roles</TableHead>
                                                <TableHead>Telegram Chat ID</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Telegram Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBudgetUsers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                                        No users found matching your filter criteria.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedBudgetUsers.map((user) => (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="font-medium">
                                                            <div>
                                                                <div>{user.name}</div>
                                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{user.department}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {user.roles.map((r, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                                        {r}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {user.telegram_chat_id ? user.telegram_chat_id : <span className="text-muted-foreground italic">None</span>}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {user.telegram_username ? `@${user.telegram_username}` : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.is_linked ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    <UserCheck className="mr-1 size-3" /> Linked
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-amber-500 text-amber-600">
                                                                    <UserX className="mr-1 size-3" /> Not Linked
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {canManage && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleOpenEditUser(user)}
                                                                    title="Edit Chat ID"
                                                                >
                                                                    <Edit3 className="size-4" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {totalBudgetUsersPages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-muted-foreground">
                                            Showing {(budgetUsersPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(budgetUsersPage * ITEMS_PER_PAGE, filteredBudgetUsers.length)} of {filteredBudgetUsers.length}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setBudgetUsersPage(p => Math.max(1, p - 1))} disabled={budgetUsersPage === 1}>Previous</Button>
                                            <div className="text-xs font-medium px-2">Page {budgetUsersPage} of {totalBudgetUsersPages}</div>
                                            <Button variant="outline" size="sm" onClick={() => setBudgetUsersPage(p => Math.min(totalBudgetUsersPages, p + 1))} disabled={budgetUsersPage === totalBudgetUsersPages}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal: Edit Branch Telegram Chat ID */}
            <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Branch Telegram Details</DialogTitle>
                        <DialogDescription>
                            Set Telegram Chat ID for branch <b>{selectedBranch?.name} ({selectedBranch?.branch_code})</b> to receive branch ticket notifications.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveBranchChatId} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="branch_chat_id">Branch Telegram Chat ID</Label>
                            <Input
                                id="branch_chat_id"
                                placeholder="e.g. -100123456789 or 123456789"
                                value={branchChatIdForm.data.telegram_chat_id}
                                onChange={(e) => branchChatIdForm.setData('telegram_chat_id', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                For Telegram group channels, ensure the bot is added as an administrator and use the Group/Channel Chat ID (starts with <code>-100</code>).
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsBranchModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={branchChatIdForm.processing}>
                                Save Details
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Edit User Telegram Chat ID */}
            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Telegram Details</DialogTitle>
                        <DialogDescription>
                            Set Telegram Chat ID for user <b>{selectedUser?.name}</b> to receive instant ticket notifications.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveUserChatId} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="user_chat_id">Telegram Chat ID</Label>
                            <Input
                                id="user_chat_id"
                                placeholder="e.g. 123456789"
                                value={userChatIdForm.data.telegram_chat_id}
                                onChange={(e) => userChatIdForm.setData('telegram_chat_id', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Users can get their Chat ID by messaging <code>/start</code> to the Telegram bot.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="user_username">Telegram Username (Optional)</Label>
                            <Input
                                id="user_username"
                                placeholder="e.g. username (without @)"
                                value={userChatIdForm.data.telegram_username}
                                onChange={(e) => userChatIdForm.setData('telegram_username', e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={userChatIdForm.processing}>
                                Save Details
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Send Test Message */}
            <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Test Telegram Message</DialogTitle>
                        <DialogDescription>
                            Send a test message to a Telegram Chat ID to verify bot credentials and notification delivery.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendTestMessage} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="test_chat_id">Recipient Chat ID</Label>
                            <Input
                                id="test_chat_id"
                                placeholder="Enter Telegram Chat ID (e.g. 987654321)"
                                value={testMsgForm.data.chat_id}
                                onChange={(e) => testMsgForm.setData('chat_id', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="test_message">Message Content</Label>
                            <Textarea
                                id="test_message"
                                rows={3}
                                value={testMsgForm.data.message}
                                onChange={(e) => testMsgForm.setData('message', e.target.value)}
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={testMsgForm.processing}>
                                <Send className="mr-2 size-4" /> Send Test
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
