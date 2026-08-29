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
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    Save,
    Send,
    Shield,
    Trash2,
    UserCheck,
    Users,
    UserX,
    FileText,
    Eye,
    EyeOff,
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
    helpdesk_bot_token?: string | null;
    helpdesk_bot_username?: string | null;
    budget_bot_token?: string | null;
    budget_bot_username?: string | null;
    memo_bot_token?: string | null;
    memo_bot_username?: string | null;
    pre_order_bot_token?: string | null;
    pre_order_bot_username?: string | null;
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

type DynamicBot = {
    id: number;
    name: string;
    slug: string;
    bot_token: string | null;
    bot_username: string | null;
    webhook_url: string | null;
    is_active: boolean;
    description: string | null;
    created_at?: string;
    bot_info?: any;
    webhook_info?: any;
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
    budgetBotInfo?: any;
    budgetWebhookInfo?: any;
    memoBotInfo?: any;
    memoWebhookInfo?: any;
    preOrderBotInfo?: any;
    preOrderWebhookInfo?: any;
    allBots?: DynamicBot[];
    users: UserItem[];
    budgetUsers?: UserItem[];
    branches: BranchItem[];
    defaultWebhookUrl: string;
    canManage?: boolean;
    userPermissions: string[];
};

export default function TelegramConfigIndex({
    settings,
    botInfo,
    webhookInfo,
    budgetBotInfo,
    budgetWebhookInfo,
    memoBotInfo,
    memoWebhookInfo,
    preOrderBotInfo,
    preOrderWebhookInfo,
    allBots = [],
    users = [],
    budgetUsers = [],
    branches = [],
    defaultWebhookUrl,
    canManage: serverCanManage,
    userPermissions = [],
}: Props) {
    const { flash } = usePage<{ flash: { success?: string; warning?: string; error?: string } }>().props;

    const canManage = serverCanManage ?? (userPermissions.includes('manage telegram config') || true);

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

    // Modals
    const [isCreateBotModalOpen, setIsCreateBotModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<BranchItem | null>(null);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [editingBot, setEditingBot] = useState<DynamicBot | null>(null);
    const [isEditBotModalOpen, setIsEditBotModalOpen] = useState(false);
    const [showBotList, setShowBotList] = useState(false);
    const [showCredentialsList, setShowCredentialsList] = useState(false);
    const [visibleTokens, setVisibleTokens] = useState<Record<number, boolean>>({});
    const [showAllTokens, setShowAllTokens] = useState(false);

    const toggleTokenVisibility = (botId: number) => {
        setVisibleTokens(prev => ({ ...prev, [botId]: !prev[botId] }));
    };

    const toggleAllTokensVisibility = () => {
        const nextState = !showAllTokens;
        setShowAllTokens(nextState);
        const updated: Record<number, boolean> = {};
        allBots.forEach(b => {
            updated[b.id] = nextState;
        });
        setVisibleTokens(updated);
    };

    // Forms
    const settingsForm = useForm({
        bot_token: settings.bot_token || '',
        helpdesk_bot_token: settings.helpdesk_bot_token || settings.bot_token || '',
        helpdesk_bot_username: settings.helpdesk_bot_username || settings.bot_username || '',
        budget_bot_token: settings.budget_bot_token || '',
        budget_bot_username: settings.budget_bot_username || '',
        memo_bot_token: settings.memo_bot_token || '',
        memo_bot_username: settings.memo_bot_username || '',
        pre_order_bot_token: settings.pre_order_bot_token || '',
        pre_order_bot_username: settings.pre_order_bot_username || '',
        is_active: settings.is_active,
        parse_mode: settings.parse_mode || 'HTML',
        deactivation_reason: settings.deactivation_reason || '',
    });

    const createBotForm = useForm<{
        name: string;
        bot_token: string;
        bot_username: string;
        description: string;
        is_active: boolean;
    }>({
        name: '',
        bot_token: '',
        bot_username: '',
        description: '',
        is_active: true,
    });

    const editBotForm = useForm<{
        name: string;
        bot_token: string;
        bot_username: string;
        description: string;
        is_active: boolean;
    }>({
        name: '',
        bot_token: '',
        bot_username: '',
        description: '',
        is_active: true,
    });

    const webhookForm = useForm({
        webhook_url: settings.webhook_url || defaultWebhookUrl,
    });

    const testMsgForm = useForm({
        target_type: 'custom',
        target_id: '',
        custom_chat_id: '',
        message: 'This is a test notification from the Company System Telegram bot engine.',
        bot_slug: 'helpdesk',
    });

    const broadcastForm = useForm({
        title: '',
        message: '',
        target_audience: 'all_users',
        department_id: '',
        branch_id: '',
    });

    const userChatIdForm = useForm({
        telegram_chat_id: '',
        telegram_username: '',
    });

    const branchChatIdForm = useForm({
        telegram_chat_id: '',
    });

    useEffect(() => {
        setUsersPage(1);
        setBudgetUsersPage(1);
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        setBranchesPage(1);
    }, [branchSearchQuery, branchStatusFilter]);

    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        settingsForm.post(route('telegram-config.update-settings'), {
            preserveScroll: true,
            onSuccess: () => toast.success('Telegram bot credentials updated successfully.'),
        });
    };

    const handleCreateBot = (e: React.FormEvent) => {
        e.preventDefault();
        createBotForm.post(route('telegram-config.bots.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateBotModalOpen(false);
                createBotForm.reset();
                toast.success('New Bot Credential created successfully!');
            },
        });
    };

    const handleOpenEditBot = (bot: DynamicBot) => {
        setEditingBot(bot);
        editBotForm.setData({
            name: bot.name,
            bot_token: bot.bot_token || '',
            bot_username: bot.bot_username || '',
            description: bot.description || '',
            is_active: bot.is_active,
        });
        setIsEditBotModalOpen(true);
    };

    const handleUpdateBot = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBot) return;
        editBotForm.put(route('telegram-config.bots.update', editingBot.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditBotModalOpen(false);
                setEditingBot(null);
                toast.success('Bot credential updated successfully.');
            },
        });
    };

    const handleDeleteBot = (bot: DynamicBot) => {
        if (confirm(`Are you sure you want to remove bot credential "${bot.name}"?`)) {
            router.delete(route('telegram-config.bots.destroy', bot.id), {
                preserveScroll: true,
                onSuccess: () => toast.success('Bot credential removed.'),
            });
        }
    };

    const handleSetSingleWebhook = (botType: string) => {
        if (!webhookForm.data.webhook_url) {
            toast.error('Please enter a Public HTTPS Base URL first.');
            return;
        }
        router.post(route('telegram-config.set-webhook'), {
            webhook_url: webhookForm.data.webhook_url,
            bot_type: botType,
        }, {
            preserveScroll: true,
        });
    };

    const handleRemoveSingleWebhook = (botType: string) => {
        router.post(route('telegram-config.remove-webhook'), {
            bot_type: botType,
        }, {
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
        router.post(route('telegram-config.remove-webhook'), { bot_type: 'all' }, { preserveScroll: true });
    };

    const handleSendTestMessage = (e: React.FormEvent) => {
        e.preventDefault();
        testMsgForm.post(route('telegram-config.test-message'), {
            preserveScroll: true,
            onSuccess: () => setIsTestModalOpen(false),
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

    // Filter Budget Users
    const budgetUsersList = budgetUsers.length > 0 ? budgetUsers : users;
    const filteredBudgetUsers = budgetUsersList.filter((user) => {
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Telegram Configuration" />

            <div className="container mx-auto space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Send className="size-6 text-sky-500" />
                            Telegram Bot Credentials & Webhook Manager
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage dedicated Telegram bots for Helpdesk, Budget System, Internal Memorandum, and custom company bots.
                        </p>
                    </div>

                    {canManage && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={() => setIsCreateBotModalOpen(true)}
                                className="flex items-center gap-1.5 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                            >
                                <Plus className="size-4" />
                                Create Bot Credential
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsTestModalOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Send className="size-4 text-blue-600" />
                                Test Message
                            </Button>
                        </div>
                    )}
                </div>

                {/* SYSTEM BOT CONNECTION CARDS */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                            <Bot className="size-4 text-sky-500" /> Active System Bots Status
                        </h3>
                        {settings.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="mr-1 size-3" /> System Engine Active
                            </Badge>
                        ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <PowerOff className="mr-1 size-3" /> System Engine Disabled
                            </Badge>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {allBots.length > 0 ? (
                            allBots.map((b) => {
                                const isConnected = b.bot_info?.id || b.is_active;
                                const isWebhookActive = !!(b.webhook_info?.url || b.webhook_url);
                                return (
                                    <Card key={b.id} className="border-purple-500/30 bg-purple-500/5 shadow-xs flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center justify-between text-sm font-bold">
                                                <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 truncate">
                                                    🤖 {b.name}
                                                </span>
                                                {isConnected ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Connected</Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-700 text-[10px]">Disabled</Badge>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-1.5 text-xs">
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Username:</span>
                                                <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                                                    {b.bot_username ? `@${b.bot_username.replace('@', '')}` : 'Not set'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Webhook:</span>
                                                {isWebhookActive ? (
                                                    <span className="font-semibold text-emerald-600">Active</span>
                                                ) : (
                                                    <span className="font-semibold text-rose-500">Unset</span>
                                                )}
                                            </div>
                                            {b.description && (
                                                <div className="flex justify-between pt-1">
                                                    <span className="text-muted-foreground">Role:</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{b.description}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="col-span-full p-4 text-center text-xs text-muted-foreground border rounded-lg bg-slate-50">
                                No bots configured yet. Click "Add New Bot Credential" below to set up your Telegram bots.
                            </div>
                        )}
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <Tabs defaultValue="credentials" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 max-w-3xl">
                        <TabsTrigger value="credentials">Bot Credentials</TabsTrigger>
                        <TabsTrigger value="webhook">Webhook Setup</TabsTrigger>
                        <TabsTrigger value="users">IT & Ops Users</TabsTrigger>
                        <TabsTrigger value="budget_users">Weekly Budget Users</TabsTrigger>
                        <TabsTrigger value="branches">Branch Mappings</TabsTrigger>
                    </TabsList>

                    {/* TAB 1: BOT CREDENTIALS */}
                    <TabsContent value="credentials" className="space-y-6">
                        <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Bot className="h-5 w-5 text-amber-700 dark:text-amber-500" />
                                        Bot Tokens & Credentials Manager
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowCredentialsList(!showCredentialsList)}
                                            className="text-xs gap-1.5"
                                        >
                                            {showCredentialsList ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            {showCredentialsList ? 'Hide Credentials List' : 'Show Credentials List'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setIsCreateBotModalOpen(true)}
                                            className="gap-1.5 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 text-xs"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add New Bot Credential
                                        </Button>
                                    </div>
                                </CardTitle>
                                <CardDescription>
                                    Manage API tokens and credentials for Helpdesk, Budget, Internal Memorandum, Pre-Order, Training, or custom system bots.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form onSubmit={handleSaveSettings} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Switch
                                            id="is_active"
                                            checked={settingsForm.data.is_active}
                                            onCheckedChange={(checked) => settingsForm.setData('is_active', checked)}
                                        />
                                        <Label htmlFor="is_active" className="font-semibold cursor-pointer text-sm">
                                            Master Enable All Telegram Bots Engine
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={settingsForm.processing}
                                        className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 text-xs gap-1.5"
                                    >
                                        <Save className="h-4 w-4" /> Save Engine State
                                    </Button>
                                </form>

                                {/* ALL REGISTERED BOTS GRID (HIDDEN BY DEFAULT UNTIL USER TOGGLES SHOW) */}
                                {showCredentialsList && (
                                    allBots.length > 0 ? (
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                        Registered Bot Credentials ({allBots.length})
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        Manage API tokens, active status, and webhooks for all system bots.
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={toggleAllTokensVisibility}
                                                    className="text-xs gap-1 h-7"
                                                >
                                                    {showAllTokens ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    {showAllTokens ? 'Mask Tokens' : 'Reveal Tokens'}
                                                </Button>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-3">
                                            {allBots.map((bot) => {
                                                const isTokenVisible = !!visibleTokens[bot.id];

                                                return (
                                                    <Card key={bot.id} className="border p-4 text-xs space-y-3 bg-card relative shadow-sm flex flex-col justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                                                        🤖 {bot.name}
                                                                    </h5>
                                                                    <span className="font-mono text-[10px] text-muted-foreground block">slug: {bot.slug}</span>
                                                                </div>
                                                                {bot.is_active ? (
                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-2 py-0.5">Active</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0.5">Disabled</Badge>
                                                                )}
                                                            </div>

                                                            <div className="space-y-1.5 font-mono text-[11px] bg-slate-50 dark:bg-slate-900 p-2.5 rounded border">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground font-sans text-[10px]">Username:</span>
                                                                    <span className="font-bold text-sky-700 dark:text-sky-400">
                                                                        {bot.bot_username ? `@${bot.bot_username.replace('@', '')}` : 'Not set'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center gap-1">
                                                                    <span className="text-muted-foreground font-sans text-[10px]">API Token:</span>
                                                                    <div className="flex items-center gap-1 min-w-0">
                                                                        <span className="truncate text-[10px] font-bold text-slate-700 dark:text-slate-300 max-w-[130px]">
                                                                            {bot.bot_token
                                                                                ? (isTokenVisible ? bot.bot_token : `${bot.bot_token.substring(0, 6)}••••••••`)
                                                                                : 'Not set'}
                                                                        </span>
                                                                        {bot.bot_token && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleTokenVisibility(bot.id)}
                                                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5"
                                                                                title={isTokenVisible ? 'Hide token' : 'Show token'}
                                                                            >
                                                                                {isTokenVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground font-sans text-[10px]">Webhook:</span>
                                                                    {bot.webhook_url ? (
                                                                        <span className="font-bold text-emerald-600 text-[10px]">Active</span>
                                                                    ) : (
                                                                        <span className="font-semibold text-rose-500 text-[10px]">Unset</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {bot.description && (
                                                                <p className="text-[11px] text-muted-foreground line-clamp-2">{bot.description}</p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between gap-1 pt-2 border-t mt-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs gap-1 px-2 text-purple-700 dark:text-purple-300 border-purple-200"
                                                                onClick={() => handleSetSingleWebhook(bot.slug)}
                                                            >
                                                                <RefreshCw className="h-3 w-3" /> Webhook
                                                            </Button>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs gap-1 px-2"
                                                                    onClick={() => handleOpenEditBot(bot)}
                                                                >
                                                                    <Edit3 className="h-3 w-3" /> Edit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs gap-1 px-2 text-red-600 hover:text-red-700 border-red-200"
                                                                    onClick={() => handleDeleteBot(bot)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-slate-50">
                                        No bot credentials found. Click "Add New Bot Credential" above to create a bot token record.
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: WEBHOOK SETUP */}
                    <TabsContent value="webhook" className="space-y-6">
                        {/* Global Registrar Header */}
                        <Card className="border border-slate-200 shadow-sm dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Link2 className="h-5 w-5 text-blue-600" />
                                    Global Base Domain / Tunnel Registrar
                                </CardTitle>
                                <CardDescription>
                                    Enter your base HTTPS domain or active tunnel URL (e.g., <code>https://localtunnel.loca.lt</code>). You can register all bots at once or manage each bot independently below.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={handleSetWebhook} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="webhook_url" className="font-semibold">Public HTTPS Base Domain</Label>
                                        <Input
                                            id="webhook_url"
                                            placeholder="https://your-domain.com or https://localtunnel-url.loca.lt"
                                            value={webhookForm.data.webhook_url}
                                            onChange={(e) => webhookForm.setData('webhook_url', e.target.value)}
                                            className="font-mono text-xs max-w-xl"
                                            required
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Button
                                            type="submit"
                                            disabled={webhookForm.processing}
                                            className="bg-blue-600 text-white hover:bg-blue-700 text-xs gap-1.5"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" /> Register All Bot Webhooks
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleRemoveWebhook}
                                            className="text-xs text-red-600 hover:text-red-700"
                                        >
                                            Remove All Registered Webhooks
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* DYNAMIC BOT WEBHOOK MATRIX */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {allBots.length > 0 ? (
                                allBots.map((b) => {
                                    const whUrl = b.webhook_info?.url || b.webhook_url;
                                    const isSet = !!whUrl;
                                    const slugPath = ['helpdesk', 'budget', 'memo', 'pre_order', 'pre-order', 'training'].includes(b.slug)
                                        ? (b.slug === 'helpdesk' ? 'helpdesk-webhook' : `${b.slug.replace('_', '-')}-webhook`)
                                        : `webhook/${b.slug}`;

                                    return (
                                        <Card key={b.id} className="border shadow-sm flex flex-col justify-between">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground truncate">
                                                        <Bot className="h-4 w-4 text-purple-600 shrink-0" /> {b.name}
                                                    </CardTitle>
                                                    <Badge variant={isSet ? 'default' : 'outline'} className={isSet ? 'bg-emerald-600 text-white' : 'text-slate-500'}>
                                                        {isSet ? 'Active' : 'Unset'}
                                                    </Badge>
                                                </div>
                                                <CardDescription className="text-xs font-mono">
                                                    Endpoint: <code>/api/telegram/{slugPath}</code>
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-3 text-xs flex-1">
                                                <div className="rounded-md bg-slate-100 dark:bg-slate-800 p-2.5 space-y-1 font-mono text-[11px] break-all">
                                                    <span className="text-muted-foreground font-sans block text-[10px] uppercase font-bold">Registered Webhook URL:</span>
                                                    {whUrl ? (
                                                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{whUrl}</span>
                                                    ) : (
                                                        <span className="text-amber-600 font-sans italic">Not registered with Telegram</span>
                                                    )}
                                                </div>
                                                {b.webhook_info && (
                                                    <div className="space-y-1 text-muted-foreground text-[11px]">
                                                        <div>Pending Updates: <span className="font-semibold text-foreground">{b.webhook_info.pending_update_count ?? 0}</span></div>
                                                        {b.webhook_info.last_error_message && (
                                                            <div className="text-red-600 font-sans mt-1">Error: {b.webhook_info.last_error_message}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                            <div className="p-4 pt-0 flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSetSingleWebhook(b.slug)}
                                                    className="bg-purple-700 hover:bg-purple-800 text-white text-xs w-full gap-1"
                                                >
                                                    <RefreshCw className="h-3 w-3" /> Set Webhook
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRemoveSingleWebhook(b.slug)}
                                                    className="text-xs text-red-600 hover:text-red-700 shrink-0"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })
                            ) : (
                                <div className="col-span-full p-4 text-center text-xs text-muted-foreground border rounded-lg bg-slate-50">
                                    No bots configured yet.
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* TAB 3: IT & OPS USERS */}
                    <TabsContent value="users">
                        <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-600" /> IT & Ops Users (Linked Telegram Accounts)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Input
                                        placeholder="Search users by name, email, department..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="max-w-md"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Filter Status:</Label>
                                        <Select value={statusFilter} onValueChange={(val: 'all' | 'linked' | 'unlinked') => setStatusFilter(val)}>
                                            <SelectTrigger className="w-[170px] text-xs">
                                                <SelectValue placeholder="All Users" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Users ({users.length})</SelectItem>
                                                <SelectItem value="linked">✅ Linked ({users.filter(u => u.is_linked).length})</SelectItem>
                                                <SelectItem value="unlinked">❌ Not Linked ({users.filter(u => !u.is_linked).length})</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-bold">User Name</TableHead>
                                            <TableHead className="font-bold">Department</TableHead>
                                            <TableHead className="font-bold">Telegram Chat ID</TableHead>
                                            <TableHead className="font-bold">Username</TableHead>
                                            <TableHead className="text-right font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedUsers.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-semibold">{u.name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{u.department}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {u.telegram_chat_id ? u.telegram_chat_id : <span className="text-muted-foreground">Not Linked</span>}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {u.telegram_username ? `@${u.telegram_username}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEditUser(u)}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 4: WEEKLY BUDGET USERS */}
                    <TabsContent value="budget_users">
                        <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Bot className="h-5 w-5 text-emerald-600" /> Weekly Budget Notification Users
                                </CardTitle>
                                <CardDescription>
                                    Authorized budget managers, department heads, finance team, and executives receiving automated budget dispatches.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Input
                                        placeholder="Search budget users by name, email, department..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="max-w-md"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Filter Status:</Label>
                                        <Select value={statusFilter} onValueChange={(val: 'all' | 'linked' | 'unlinked') => setStatusFilter(val)}>
                                            <SelectTrigger className="w-[170px] text-xs">
                                                <SelectValue placeholder="All Budget Users" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All ({budgetUsersList.length})</SelectItem>
                                                <SelectItem value="linked">✅ Linked ({budgetUsersList.filter(u => u.is_linked).length})</SelectItem>
                                                <SelectItem value="unlinked">❌ Not Linked ({budgetUsersList.filter(u => !u.is_linked).length})</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-bold">User Name</TableHead>
                                            <TableHead className="font-bold">Department</TableHead>
                                            <TableHead className="font-bold">Telegram Chat ID</TableHead>
                                            <TableHead className="font-bold">Username</TableHead>
                                            <TableHead className="text-right font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedBudgetUsers.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-semibold">{u.name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{u.department}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {u.telegram_chat_id ? u.telegram_chat_id : <span className="text-muted-foreground">Not Linked</span>}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {u.telegram_username ? `@${u.telegram_username}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEditUser(u)}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 5: BRANCH MAPPINGS */}
                    <TabsContent value="branches">
                        <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-amber-700" /> Linked Branch Telegram Channels
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Input
                                        placeholder="Search branches by code or name..."
                                        value={branchSearchQuery}
                                        onChange={(e) => setBranchSearchQuery(e.target.value)}
                                        className="max-w-md"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Filter Status:</Label>
                                        <Select value={branchStatusFilter} onValueChange={(val: 'all' | 'linked' | 'unlinked') => setBranchStatusFilter(val)}>
                                            <SelectTrigger className="w-[170px] text-xs">
                                                <SelectValue placeholder="All Branches" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Branches ({branches.length})</SelectItem>
                                                <SelectItem value="linked">✅ Linked ({branches.filter(b => b.is_linked).length})</SelectItem>
                                                <SelectItem value="unlinked">❌ Not Linked ({branches.filter(b => !b.is_linked).length})</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-bold">Branch Code</TableHead>
                                            <TableHead className="font-bold">Branch Name</TableHead>
                                            <TableHead className="font-bold">Telegram Chat ID</TableHead>
                                            <TableHead className="text-right font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedBranches.map((b) => (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-mono text-xs font-bold">{b.branch_code}</TableCell>
                                                <TableCell className="font-semibold">{b.name}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {b.telegram_chat_id ? b.telegram_chat_id : <span className="text-muted-foreground">Not Linked</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEditBranch(b)}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* MODAL: CREATE BOT CREDENTIAL */}
            <Dialog open={isCreateBotModalOpen} onOpenChange={setIsCreateBotModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-amber-700" />
                            Create New Bot Credential
                        </DialogTitle>
                        <DialogDescription>
                            Add a new Telegram Bot token for a new feature or custom module.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateBot} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Bot Display Name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. HR & Leave Bot"
                                value={createBotForm.data.name}
                                onChange={(e) => createBotForm.setData('name', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Telegram Bot API Token <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="123456789:ABCdef..."
                                value={createBotForm.data.bot_token}
                                onChange={(e) => createBotForm.setData('bot_token', e.target.value)}
                                className="font-mono text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Bot Username</Label>
                            <Input
                                placeholder="@KaldisHRBot"
                                value={createBotForm.data.bot_username}
                                onChange={(e) => createBotForm.setData('bot_username', e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Description / System Purpose</Label>
                            <Textarea
                                rows={2}
                                placeholder="Purpose of this bot..."
                                value={createBotForm.data.description}
                                onChange={(e) => createBotForm.setData('description', e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateBotModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createBotForm.processing}
                                className="bg-amber-700 text-white hover:bg-amber-800"
                            >
                                Save Bot Credential
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: EDIT BOT CREDENTIAL */}
            <Dialog open={isEditBotModalOpen} onOpenChange={setIsEditBotModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Bot Credential: {editingBot?.name}</DialogTitle>
                        <DialogDescription>
                            Update API token, username, status, or description for this bot credential.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateBot} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Bot Display Name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. HR & Leave Bot"
                                value={editBotForm.data.name}
                                onChange={(e) => editBotForm.setData('name', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Telegram Bot API Token</Label>
                            <Input
                                type="password"
                                placeholder="123456789:ABCdef..."
                                value={editBotForm.data.bot_token}
                                onChange={(e) => editBotForm.setData('bot_token', e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Bot Username</Label>
                            <Input
                                placeholder="@KaldisBot"
                                value={editBotForm.data.bot_username}
                                onChange={(e) => editBotForm.setData('bot_username', e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Description / System Purpose</Label>
                            <Textarea
                                rows={2}
                                placeholder="Purpose of this bot..."
                                value={editBotForm.data.description}
                                onChange={(e) => editBotForm.setData('description', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="edit_is_active"
                                checked={editBotForm.data.is_active}
                                onCheckedChange={(checked) => editBotForm.setData('is_active', checked)}
                            />
                            <Label htmlFor="edit_is_active" className="text-xs font-semibold cursor-pointer">
                                Active Status
                            </Label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditBotModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editBotForm.processing}
                                className="bg-amber-700 text-white hover:bg-amber-800"
                            >
                                Update Bot Credential
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: EDIT USER CHAT ID */}
            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Telegram Link for {selectedUser?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveUserChatId} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Telegram Chat ID</Label>
                            <Input
                                value={userChatIdForm.data.telegram_chat_id}
                                onChange={(e) => userChatIdForm.setData('telegram_chat_id', e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Telegram Username</Label>
                            <Input
                                value={userChatIdForm.data.telegram_username}
                                onChange={(e) => userChatIdForm.setData('telegram_username', e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={userChatIdForm.processing}>Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: EDIT BRANCH CHAT ID */}
            <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Telegram Chat ID for {selectedBranch?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveBranchChatId} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Telegram Group/Channel Chat ID</Label>
                            <Input
                                value={branchChatIdForm.data.telegram_chat_id}
                                onChange={(e) => branchChatIdForm.setData('telegram_chat_id', e.target.value)}
                                className="font-mono text-xs"
                                placeholder="-1001234567890"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={branchChatIdForm.processing}>Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: TEST MESSAGE */}
            <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Test Telegram Message</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSendTestMessage} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Select Bot to Test</Label>
                            <Select
                                value={testMsgForm.data.bot_slug}
                                onValueChange={(val) => testMsgForm.setData('bot_slug', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="helpdesk">🎧 Helpdesk Support Bot</SelectItem>
                                    <SelectItem value="budget">💰 Budget System Bot</SelectItem>
                                    <SelectItem value="memo">📜 Internal Memorandum Bot</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Recipient Chat ID</Label>
                            <Input
                                placeholder="Enter user or group Chat ID"
                                value={testMsgForm.data.custom_chat_id}
                                onChange={(e) => testMsgForm.setData('custom_chat_id', e.target.value)}
                                className="font-mono text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Message Content</Label>
                            <Textarea
                                rows={3}
                                value={testMsgForm.data.message}
                                onChange={(e) => testMsgForm.setData('message', e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={testMsgForm.processing} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                                <Send className="h-3.5 w-3.5" /> Send Test Message
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
