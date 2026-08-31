import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    Activity,
    Bot,
    Building2,
    CheckCircle2,
    CheckSquare,
    Clock,
    Edit3,
    FileText,
    Filter,
    Layers,
    Link2Off,
    Lock,
    Megaphone,
    MessageSquare,
    Plus,
    RefreshCw,
    Save,
    Search,
    Send,
    Shield,
    ShieldAlert,
    Sparkles,
    Square,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    UserX,
    Volume2,
    XCircle,
    Zap,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'System Administration', href: '/users' },
    { title: 'Kaldis Communication', href: '/kaldis-communication' },
];

type SystemStats = {
    total_communications: number;
    recorded_communications: number;
    forwarded_communications: number;
    responded_communications: number;
    total_users: number;
    total_bindings: number;
};

const TOPIC_EMOJIS: Record<string, string> = {
    'Announcements': '📢',
    'Operations': '⚙️',
    'HR': '💼',
    'Finance': '💰',
    'Supply Chain': '📦',
    'IT': '💻',
    'Maintenance': '🔧',
    'F&B': '☕',
    'T&D': '🎓',
    'QA': '🛡️',
    'Logistics & BI': '🚚',
    'Suggestions & Improvements': '💡',
};

type ConfigData = {
    bot_token: string;
    region_groups: {
        'Region 1': number;
        'Region 2': number;
    };
    ho_group_chat_id: number;
    operations_director_user_id: number;
    database: string;
    anti_link_protection?: boolean;
    auto_welcome?: boolean;
    welcome_message?: string;
};

type RosterUser = {
    telegram_user_id: number;
    display_name: string;
    role: string;
    region: string | null;
    branch_name: string | null;
    department: string | null;
    can_forward: number;
    created_at: string;
    updated_at: string;
};

type TopicBinding = {
    group_key: string;
    thread_id: number;
    topic_name: string;
    department: string;
    created_at: string;
    updated_at: string;
};

type CommunicationRecord = {
    reference_no: string;
    region: string;
    branch_name: string | null;
    topic_name: string;
    department: string;
    source_chat_id: number;
    source_message_id: number;
    source_thread_id: number | null;
    sender_user_id: number | null;
    sender_display_name: string;
    ho_chat_id: number | null;
    ho_summary_message_id: number | null;
    ho_message_id: number | null;
    regional_manager_user_id: number | null;
    department_head_user_id: number | null;
    status: string;
    created_at: string;
    updated_at: string;
};

type Props = {
    stats: SystemStats;
    config: ConfigData;
    rosterUsers: RosterUser[];
    topicBindings: TopicBinding[];
    communications: CommunicationRecord[];
    defaultTopicMapping: Record<string, string>;
    departments: string[];
    branches: Array<{ id: number; name: string }>;
    systemUsers: Array<{ id: number; name: string; email: string; telegram_chat_id: string | null }>;
    filters: {
        search: string;
        region: string;
        status: string;
    };
    canManage: boolean;
};

export default function KaldisCommunicationPage({
    stats,
    config,
    rosterUsers,
    topicBindings,
    communications,
    defaultTopicMapping,
    departments,
    branches,
    systemUsers,
    filters,
    canManage,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [regionFilter, setRegionFilter] = useState(filters.region || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // Dialog state
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isAddBindingOpen, setIsAddBindingOpen] = useState(false);
    const [isSyncingTopics, setIsSyncingTopics] = useState(false);

    // Bulk Selection State
    const [selectedBindings, setSelectedBindings] = useState<string[]>([]);
    const [topicSubTab, setTopicSubTab] = useState('region1');

    const handleSyncTopics = (force: boolean = false, targetGroup: string = 'all') => {
        setIsSyncingTopics(true);
        router.post(route('kaldis-communication.sync-topics'), { force, target_group: targetGroup }, {
            onFinish: () => setIsSyncingTopics(false),
            onSuccess: () => toast.success(`Topic creation & sync request finished for ${targetGroup}!`),
            onError: (errors: any) => toast.error(errors.sync || 'Failed to sync topics with Telegram groups.'),
        });
    };

    const toggleSelectBinding = (key: string) => {
        if (selectedBindings.includes(key)) {
            setSelectedBindings(selectedBindings.filter(k => k !== key));
        } else {
            setSelectedBindings([...selectedBindings, key]);
        }
    };

    const toggleSelectAllGroup = (groupBindings: TopicBinding[]) => {
        const groupKeys = groupBindings.map(b => `${b.group_key}:${b.thread_id}`);
        const allSelected = groupKeys.every(k => selectedBindings.includes(k));
        if (allSelected) {
            setSelectedBindings(selectedBindings.filter(k => !groupKeys.includes(k)));
        } else {
            setSelectedBindings(Array.from(new Set([...selectedBindings, ...groupKeys])));
        }
    };

    const handleBulkDelete = (deleteFromTelegram: boolean) => {
        if (selectedBindings.length === 0) {
            toast.error('No topics selected for deletion.');
            return;
        }
        const bindingsToDelete = selectedBindings.map(k => {
            const [group_key, thread_id] = k.split(':');
            return { group_key, thread_id: parseInt(thread_id, 10) };
        });

        const msg = deleteFromTelegram
            ? `PERMANENTLY DELETE ${selectedBindings.length} selected topics from Telegram Groups AND System?`
            : `Unbind ${selectedBindings.length} selected topics from System database?`;

        if (confirm(msg)) {
            router.post(route('kaldis-communication.bulk-delete-bindings'), {
                bindings: bindingsToDelete,
                delete_from_telegram: deleteFromTelegram,
            }, {
                onSuccess: () => {
                    toast.success('Selected topics deleted successfully!');
                    setSelectedBindings([]);
                },
                onError: () => toast.error('Failed to bulk delete topics.'),
            });
        }
    };

    // Config form
    const configForm = useForm({
        bot_token: config.bot_token || '',
        region_1_chat_id: config.region_groups?.['Region 1'] || '',
        region_2_chat_id: config.region_groups?.['Region 2'] || '',
        ho_group_chat_id: config.ho_group_chat_id || '',
        operations_director_user_id: config.operations_director_user_id || '',
    });

    // User form
    const userForm = useForm({
        telegram_user_id: '',
        display_name: '',
        role: 'branch_manager',
        region: 'Region 1',
        branch_name: '',
        department: 'Operations',
        can_forward: false,
    });

    // Binding form
    const bindingForm = useForm({
        group_key: 'Region 1',
        thread_id: '',
        topic_name: 'Operations',
        department: 'Operations',
    });

    // Edit Binding form
    const [isEditBindingOpen, setIsEditBindingOpen] = useState(false);
    const editBindingForm = useForm<{
        group_key: string;
        thread_id: number;
        topic_name: string;
        department: string;
        sync_to_telegram: boolean;
    }>({
        group_key: 'Region 1',
        thread_id: 0,
        topic_name: '',
        department: '',
        sync_to_telegram: true,
    });

    const openEditBinding = (b: TopicBinding) => {
        editBindingForm.setData({
            group_key: b.group_key,
            thread_id: b.thread_id,
            topic_name: b.topic_name,
            department: b.department,
            sync_to_telegram: true,
        });
        setIsEditBindingOpen(true);
    };

    const handleUpdateBinding = (e: React.FormEvent) => {
        e.preventDefault();
        editBindingForm.put(route('kaldis-communication.update-binding'), {
            onSuccess: () => {
                toast.success('Topic binding updated successfully!');
                setIsEditBindingOpen(false);
            },
            onError: (errors: any) => toast.error(errors.update || 'Failed to update topic binding.'),
        });
    };

    const [isRegisteringCmds, setIsRegisteringCmds] = useState(false);

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        configForm.post(route('kaldis-communication.update-config'), {
            onSuccess: () => toast.success('Bot configuration saved & commands registered in Telegram!'),
            onError: () => toast.error('Failed to save configuration.'),
        });
    };

    const handleRegisterCommands = () => {
        setIsRegisteringCmds(true);
        router.post(route('kaldis-communication.register-commands'), {}, {
            onFinish: () => setIsRegisteringCmds(false),
            onSuccess: () => toast.success('Registered 13 slash commands in Telegram for all group chats!'),
            onError: (errors: any) => toast.error(errors.commands || 'Failed to register commands with Telegram API.'),
        });
    };

    const [customWebhookUrl, setCustomWebhookUrl] = useState('');
    const [isSettingWebhook, setIsSettingWebhook] = useState(false);

    const handleSetWebhook = () => {
        setIsSettingWebhook(true);
        router.post(route('kaldis-communication.set-webhook'), {
            webhook_url: customWebhookUrl,
        }, {
            onFinish: () => setIsSettingWebhook(false),
            onSuccess: () => toast.success('Live Telegram Webhook activated! Group messages, topic commands (/it, /hr), and member joins are now live.'),
            onError: (errors: any) => toast.error(errors.webhook || 'Failed to set Telegram webhook.'),
        });
    };

    const handleGenerateInviteLink = (u: RosterUser) => {
        const groupKey = u.region || (u.role === 'department_head' || u.role === 'operations_director' ? 'Head Office' : 'Region 1');
        router.post(route('kaldis-communication.generate-invite-link'), {
            telegram_user_id: u.telegram_user_id,
            group_key: groupKey,
        }, {
            onSuccess: () => toast.success(`Generated and sent group join link for ${u.display_name}!`),
            onError: (errors: any) => toast.error(errors.invite || 'Failed to generate invite link.'),
        });
    };

    const [isSyncingMembers, setIsSyncingMembers] = useState(false);

    const handleSyncMembers = () => {
        setIsSyncingMembers(true);
        router.post(route('kaldis-communication.sync-members'), {}, {
            onFinish: () => setIsSyncingMembers(false),
            onSuccess: () => toast.success('Telegram group members synced to Staff Roster successfully! You can now edit member details.'),
            onError: (errors: any) => toast.error(errors.sync || 'Failed to sync members from Telegram.'),
        });
    };

    const [editingUser, setEditingUser] = useState<RosterUser | null>(null);
    const editUserForm = useForm<{
        telegram_user_id: number;
        display_name: string;
        role: string;
        region: string;
        branch_name: string;
        department: string;
        can_forward: boolean;
    }>({
        telegram_user_id: 0,
        display_name: '',
        role: 'branch_manager',
        region: 'Region 1',
        branch_name: '',
        department: '',
        can_forward: false,
    });

    const openEditUser = (u: RosterUser) => {
        setEditingUser(u);
        editUserForm.setData({
            telegram_user_id: u.telegram_user_id,
            display_name: u.display_name,
            role: u.role,
            region: u.region || 'Region 1',
            branch_name: u.branch_name || '',
            department: u.department || '',
            can_forward: u.can_forward === 1,
        });
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        editUserForm.put(route('kaldis-communication.update-user'), {
            onSuccess: () => {
                toast.success('Staff member profile updated successfully!');
                setEditingUser(null);
            },
            onError: () => toast.error('Failed to update member profile.'),
        });
    };

    const [isFetchingMember, setIsFetchingMember] = useState(false);

    const handleFetchMember = () => {
        if (!userForm.data.telegram_user_id) {
            toast.error('Please enter a Telegram User ID first.');
            return;
        }
        setIsFetchingMember(true);
        router.post(route('kaldis-communication.fetch-member'), {
            telegram_user_id: userForm.data.telegram_user_id,
        }, {
            onFinish: () => setIsFetchingMember(false),
            onSuccess: () => {
                toast.success('Fetched member info from Telegram successfully!');
                setIsAddUserOpen(false);
            },
            onError: (errors: any) => toast.error(errors.fetch || 'Could not find user in Telegram groups.'),
        });
    };

    // Moderation forms
    const moderationForm = useForm<{
        anti_link_protection: boolean;
        auto_welcome: boolean;
        welcome_message: string;
    }>({
        anti_link_protection: config.anti_link_protection ?? false,
        auto_welcome: config.auto_welcome ?? false,
        welcome_message: config.welcome_message || 'Welcome {name} to {group}! Please follow group rules and post under relevant topics.',
    });

    const handleSaveModeration = (e: React.FormEvent) => {
        e.preventDefault();
        moderationForm.post(route('kaldis-communication.moderation.settings'), {
            onSuccess: () => toast.success('Group moderation & anti-link settings updated!'),
            onError: () => toast.error('Failed to update moderation settings.'),
        });
    };

    const memberActionForm = useForm({
        action: 'ban',
        chat_id: String(config.region_groups?.['Region 1'] || config.ho_group_chat_id || ''),
        telegram_user_id: '',
    });

    const handleMemberAction = (e: React.FormEvent) => {
        e.preventDefault();
        memberActionForm.post(route('kaldis-communication.moderation.member'), {
            onSuccess: () => {
                toast.success(`Member action (${memberActionForm.data.action}) executed successfully!`);
                memberActionForm.reset('telegram_user_id');
            },
            onError: (errors: any) => toast.error(errors.moderation || 'Failed to execute member action.'),
        });
    };

    const broadcastForm = useForm<{
        chat_id: string;
        message: string;
        pin: boolean;
    }>({
        chat_id: String(config.ho_group_chat_id || config.region_groups?.['Region 1'] || ''),
        message: '',
        pin: true,
    });

    const handleBroadcast = (e: React.FormEvent) => {
        e.preventDefault();
        broadcastForm.post(route('kaldis-communication.moderation.broadcast'), {
            onSuccess: () => {
                toast.success('Broadcast message posted successfully!');
                broadcastForm.reset('message');
            },
            onError: (errors: any) => toast.error(errors.broadcast || 'Failed to post broadcast message.'),
        });
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        userForm.post(route('kaldis-communication.store-user'), {
            onSuccess: () => {
                toast.success('Roster user saved successfully!');
                setIsAddUserOpen(false);
                userForm.reset();
            },
            onError: () => toast.error('Failed to save user.'),
        });
    };

    const handleDeleteUser = (telegramUserId: number, displayName: string) => {
        if (confirm(`Are you sure you want to remove "${displayName}" from the roster?`)) {
            router.delete(route('kaldis-communication.delete-user', telegramUserId), {
                onSuccess: () => toast.success('User removed from roster.'),
            });
        }
    };

    const handleAddBinding = (e: React.FormEvent) => {
        e.preventDefault();
        bindingForm.post(route('kaldis-communication.store-binding'), {
            onSuccess: () => {
                toast.success('Topic binding saved!');
                setIsAddBindingOpen(false);
                bindingForm.reset();
            },
            onError: () => toast.error('Failed to save topic binding.'),
        });
    };

    const handleDeleteBinding = (groupKey: string, threadId: number, deleteFromTelegram: boolean = false) => {
        const confirmMsg = deleteFromTelegram
            ? `⚠️ PERMANENT DELETE WARNING:\nAre you sure you want to delete topic (Thread ID: ${threadId}) directly from the ${groupKey} Telegram group? This will permanently delete the topic and all messages inside it in Telegram.`
            : `Remove topic binding for Thread ID ${threadId} in ${groupKey}?`;

        if (confirm(confirmMsg)) {
            router.delete(route('kaldis-communication.delete-binding'), {
                data: {
                    group_key: groupKey,
                    thread_id: threadId,
                    delete_from_telegram: deleteFromTelegram,
                },
                onSuccess: () => toast.success(deleteFromTelegram ? 'Topic deleted from Telegram group & system database!' : 'Binding removed.'),
                onError: (errors: any) => toast.error(errors.delete || 'Failed to remove topic binding.'),
            });
        }
    };

    const handleFilterChange = (newSearch?: string, newRegion?: string, newStatus?: string) => {
        const queryParams: Record<string, string> = {};
        const s = newSearch !== undefined ? newSearch : search;
        const r = newRegion !== undefined ? newRegion : regionFilter;
        const st = newStatus !== undefined ? newStatus : statusFilter;

        if (s) queryParams.search = s;
        if (r && r !== 'all') queryParams.region = r;
        if (st && st !== 'all') queryParams.status = st;

        router.get(route('kaldis-communication.index'), queryParams, { preserveState: true, replace: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'recorded':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Recorded</Badge>;
            case 'forwarded':
            case 'forwarded_to_ho':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Forwarded to HO</Badge>;
            case 'responded':
                return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Responded</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'branch_manager':
                return <Badge variant="outline" className="border-blue-500 text-blue-600">Branch Manager</Badge>;
            case 'regional_manager':
                return <Badge variant="outline" className="border-purple-500 text-purple-600">Regional Manager</Badge>;
            case 'department_head':
                return <Badge variant="outline" className="border-emerald-500 text-emerald-600">Department Head</Badge>;
            case 'operations_director':
                return <Badge variant="outline" className="border-rose-500 text-rose-600 font-bold">Ops Director</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kaldis Branch Communication Platform" />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header Banner */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4 dark:border-neutral-800">
                    <div>
                        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                            <Send className="h-7 w-7 text-amber-600 dark:text-amber-500" />
                            KALDIS Branch Communication Telegram Bot
                        </h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Standardized Telegram communication platform across Regions 1 & 2 and Head Office departments.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.reload()}
                            className="gap-1.5"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        {canManage && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => handleSyncTopics(false)}
                                    disabled={isSyncingTopics}
                                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <Zap className="h-4 w-4" />
                                    {isSyncingTopics ? 'Syncing...' : 'Auto-Create & Sync Topics'}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setIsAddUserOpen(true)}
                                    className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Add Roster Member
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Key Stat Metrics */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-medium text-neutral-500">Total Communications</CardDescription>
                            <CardTitle className="text-2xl font-bold">{stats.total_communications}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <span className="text-xs text-neutral-400">Recorded messages</span>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-medium text-amber-600 dark:text-amber-400">Recorded</CardDescription>
                            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.recorded_communications}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <span className="text-xs text-neutral-400">Regional messages</span>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-medium text-blue-600 dark:text-blue-400">Forwarded to HO</CardDescription>
                            <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.forwarded_communications}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <span className="text-xs text-neutral-400">Sent to HO Dept</span>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Responded</CardDescription>
                            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.responded_communications}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <span className="text-xs text-neutral-400">HO Resolved</span>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-medium text-purple-600 dark:text-purple-400">Roster Staff</CardDescription>
                            <CardTitle className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.total_users}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <span className="text-xs text-neutral-400">Registered users</span>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Topic Bindings</CardDescription>
                            <CardTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.total_bindings}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <span className="text-xs text-neutral-400">Mapped thread IDs</span>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Tabs Container */}
                <Tabs defaultValue="communications" className="space-y-6">
                    <TabsList className="bg-neutral-100 dark:bg-neutral-900 p-1">
                        <TabsTrigger value="communications" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Communications Tracker
                        </TabsTrigger>
                        <TabsTrigger value="topics" className="gap-2">
                            <Layers className="h-4 w-4" />
                            Topic Mappings
                        </TabsTrigger>
                        <TabsTrigger value="roster" className="gap-2">
                            <Users className="h-4 w-4" />
                            Staff Roster
                        </TabsTrigger>
                        <TabsTrigger value="config" className="gap-2">
                            <Bot className="h-4 w-4" />
                            Bot Configuration
                        </TabsTrigger>
                        <TabsTrigger value="moderation" className="gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            Group Moderation
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Communications Tracker */}
                    <TabsContent value="communications" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-amber-600" />
                                            Live Communication Log & Tracking
                                        </CardTitle>
                                        <CardDescription>
                                            Every message posted in Region 1 & Region 2 groups is tagged with a reference number and routed to Head Office.
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative w-64">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                                            <Input
                                                placeholder="Search ref, branch, topic..."
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value);
                                                    handleFilterChange(e.target.value, undefined, undefined);
                                                }}
                                                className="pl-9 h-9"
                                            />
                                        </div>
                                        <Select
                                            value={regionFilter}
                                            onValueChange={(val) => {
                                                setRegionFilter(val);
                                                handleFilterChange(undefined, val, undefined);
                                            }}
                                        >
                                            <SelectTrigger className="w-36 h-9">
                                                <SelectValue placeholder="Region" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Regions</SelectItem>
                                                <SelectItem value="Region 1">Region 1</SelectItem>
                                                <SelectItem value="Region 2">Region 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={statusFilter}
                                            onValueChange={(val) => {
                                                setStatusFilter(val);
                                                handleFilterChange(undefined, undefined, val);
                                            }}
                                        >
                                            <SelectTrigger className="w-36 h-9">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="recorded">Recorded</SelectItem>
                                                <SelectItem value="forwarded">Forwarded to HO</SelectItem>
                                                <SelectItem value="responded">Responded</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
                                            <TableRow>
                                                <TableHead>Ref Number</TableHead>
                                                <TableHead>Region & Branch</TableHead>
                                                <TableHead>Topic & Department</TableHead>
                                                <TableHead>Sender</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Timestamp</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {communications.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-neutral-500">
                                                        No communication logs found matching your filters.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                communications.map((comm) => (
                                                    <TableRow key={comm.reference_no} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                                        <TableCell className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                                                            {comm.reference_no}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">{comm.branch_name || 'Branch N/A'}</span>
                                                                <span className="text-xs text-neutral-500">{comm.region}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">{comm.topic_name}</span>
                                                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">➡️ {comm.department}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm font-medium">
                                                            {comm.sender_display_name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(comm.status)}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-neutral-500">
                                                            {new Date(comm.created_at).toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 2: Topic Mappings & Sync */}
                    <TabsContent value="topics" className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant={topicSubTab === 'region1' ? 'default' : 'outline'}
                                    onClick={() => setTopicSubTab('region1')}
                                    className={topicSubTab === 'region1' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                                >
                                    Region 1 Group
                                </Button>
                                <Button
                                    size="sm"
                                    variant={topicSubTab === 'region2' ? 'default' : 'outline'}
                                    onClick={() => setTopicSubTab('region2')}
                                    className={topicSubTab === 'region2' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                                >
                                    Region 2 Group
                                </Button>
                                <Button
                                    size="sm"
                                    variant={topicSubTab === 'headOffice' ? 'default' : 'outline'}
                                    onClick={() => setTopicSubTab('headOffice')}
                                    className={topicSubTab === 'headOffice' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                                >
                                    Head Office Group
                                </Button>
                            </div>

                            {canManage && selectedBindings.length > 0 && (
                                <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 p-1.5 px-3 rounded border border-rose-200 dark:border-rose-900">
                                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                                        {selectedBindings.length} Selected
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleBulkDelete(false)}
                                        className="h-7 text-xs border-amber-600 text-amber-700 hover:bg-amber-100"
                                    >
                                        Unbind System
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleBulkDelete(true)}
                                        className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                                    >
                                        Delete Telegram & System
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Render Sub-Tab content based on topicSubTab */}
                        {['region1', 'region2', 'headOffice'].map((groupTab) => {
                            if (topicSubTab !== groupTab) return null;

                            const groupKeyName = groupTab === 'region1' ? 'Region 1' : groupTab === 'region2' ? 'Region 2' : 'Head Office';
                            const filteredBindings = topicBindings.filter((b) => {
                                if (groupTab === 'region1') return b.group_key === 'Region 1';
                                if (groupTab === 'region2') return b.group_key === 'Region 2';
                                return b.group_key === 'Head Office' || b.group_key.startsWith('ho:');
                            });

                            return (
                                <div key={groupTab} className="grid gap-6 md:grid-cols-3">
                                    <Card className="md:col-span-2">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                                    <Building2 className="h-5 w-5 text-amber-600" />
                                                    {groupKeyName} Topic Thread Mappings
                                                </CardTitle>
                                                <CardDescription>
                                                    Active Telegram topic threads and department routes for {groupKeyName}.
                                                </CardDescription>
                                            </div>
                                            {canManage && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSyncTopics(false, groupKeyName)}
                                                        disabled={isSyncingTopics}
                                                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                    >
                                                        <Zap className="h-4 w-4" />
                                                        {isSyncingTopics ? 'Syncing...' : `Sync ${groupKeyName}`}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSyncTopics(true, groupKeyName)}
                                                        disabled={isSyncingTopics}
                                                        className="gap-1.5 border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                        title="Force re-creation with custom Emojis and post welcome message"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                        Force Sync with Emojis
                                                    </Button>
                                                    <Button size="sm" onClick={() => setIsAddBindingOpen(true)} className="gap-1.5">
                                                        <Plus className="h-4 w-4" />
                                                        Add Binding
                                                    </Button>
                                                </div>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            <div className="rounded-md border border-neutral-200 dark:border-neutral-800">
                                                <Table>
                                                    <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
                                                        <TableRow>
                                                            {canManage && (
                                                                <TableHead className="w-10 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={filteredBindings.length > 0 && filteredBindings.every(b => selectedBindings.includes(`${b.group_key}:${b.thread_id}`))}
                                                                        onChange={() => toggleSelectAllGroup(filteredBindings)}
                                                                        className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                                                                    />
                                                                </TableHead>
                                                            )}
                                                            <TableHead>Group</TableHead>
                                                            <TableHead>Thread ID</TableHead>
                                                            <TableHead>Topic Name & Emoji</TableHead>
                                                            <TableHead>Target HO Dept</TableHead>
                                                            {canManage && <TableHead className="w-28 text-right">Actions</TableHead>}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredBindings.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={canManage ? 6 : 4} className="h-24 text-center text-neutral-500">
                                                                    No topic thread bindings created for {groupKeyName} yet. Click <b>Sync {groupKeyName}</b> or <b>Force Sync with Emojis</b> above!
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            filteredBindings.map((b) => {
                                                                const bindingKey = `${b.group_key}:${b.thread_id}`;
                                                                const isSelected = selectedBindings.includes(bindingKey);
                                                                const emoji = TOPIC_EMOJIS[b.topic_name] || '📌';
                                                                return (
                                                                    <TableRow key={bindingKey} className={isSelected ? 'bg-amber-50/60 dark:bg-amber-950/30' : ''}>
                                                                        {canManage && (
                                                                            <TableCell className="text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => toggleSelectBinding(bindingKey)}
                                                                                    className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                                                                                />
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell className="font-medium text-sm">{b.group_key}</TableCell>
                                                                        <TableCell className="font-mono text-xs">{b.thread_id}</TableCell>
                                                                        <TableCell className="font-semibold flex items-center gap-1.5 text-base">
                                                                            <span>{emoji}</span>
                                                                            <span>{b.topic_name}</span>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant="outline" className="border-indigo-500 text-indigo-600">
                                                                                {b.department}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        {canManage && (
                                                                            <TableCell className="text-right">
                                                                                <div className="flex items-center justify-end gap-1">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        title="Edit topic binding"
                                                                                        onClick={() => openEditBinding(b)}
                                                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                                                                    >
                                                                                        <Edit3 className="h-4 w-4" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        title="Unbind from system only"
                                                                                        onClick={() => handleDeleteBinding(b.group_key, b.thread_id, false)}
                                                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                                                                                    >
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        title="Delete topic from Telegram Group & System"
                                                                                        onClick={() => handleDeleteBinding(b.group_key, b.thread_id, true)}
                                                                                        className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                                                                                    >
                                                                                        <XCircle className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            </TableCell>
                                                                        )}
                                                                    </TableRow>
                                                                );
                                                            })
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-amber-500" />
                                                Standard Topics & Emojis Scope
                                            </CardTitle>
                                            <CardDescription>
                                                Standard proposal topics with official emojis & target HO departments.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            <div className="rounded-md border p-3 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
                                                {Object.entries(defaultTopicMapping).map(([topic, dept]) => {
                                                    const emoji = TOPIC_EMOJIS[topic] || '📌';
                                                    return (
                                                        <div key={topic} className="flex items-center justify-between text-xs py-1 border-b last:border-0 dark:border-neutral-800">
                                                            <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                                                <span>{emoji}</span>
                                                                <span>{topic}</span>
                                                            </span>
                                                            <span className="font-semibold text-amber-600 dark:text-amber-400">➡️ {dept}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}
                    </TabsContent>

                    {/* Tab 5: Group Moderation */}
                    <TabsContent value="moderation" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Card 1: Anti-Spam & Auto Welcome */}
                            <Card className="md:col-span-1 border-neutral-200 dark:border-neutral-800">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <ShieldAlert className="h-5 w-5 text-rose-600" />
                                        Security & Protection
                                    </CardTitle>
                                    <CardDescription>
                                        Anti-spam link auto-deletion and new member welcome messages.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSaveModeration} className="space-y-4">
                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-neutral-50 dark:bg-neutral-900">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="anti_link_protection" className="font-medium text-sm flex items-center gap-1.5">
                                                    <Link2Off className="h-4 w-4 text-rose-600" />
                                                    Anti-Link Protection
                                                </Label>
                                                <p className="text-xs text-neutral-500">Auto-delete unverified links from non-admins.</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                id="anti_link_protection"
                                                checked={moderationForm.data.anti_link_protection}
                                                onChange={(e) => moderationForm.setData('anti_link_protection', e.target.checked)}
                                                className="h-5 w-5 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-neutral-50 dark:bg-neutral-900">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="auto_welcome" className="font-medium text-sm flex items-center gap-1.5">
                                                    <Volume2 className="h-4 w-4 text-indigo-600" />
                                                    Auto Welcome Message
                                                </Label>
                                                <p className="text-xs text-neutral-500">Greet new members when joining group.</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                id="auto_welcome"
                                                checked={moderationForm.data.auto_welcome}
                                                onChange={(e) => moderationForm.setData('auto_welcome', e.target.checked)}
                                                className="h-5 w-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="welcome_message">Welcome Message Template</Label>
                                            <textarea
                                                id="welcome_message"
                                                rows={3}
                                                value={moderationForm.data.welcome_message}
                                                onChange={(e) => moderationForm.setData('welcome_message', e.target.value)}
                                                className="w-full text-xs p-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                                placeholder="Welcome {name} to {group}!"
                                            />
                                            <p className="text-[10px] text-neutral-400">Use placeholders <code>{'{name}'}</code> and <code>{'{group}'}</code></p>
                                        </div>

                                        <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={moderationForm.processing}>
                                            Save Moderation Settings
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Card 2: Member Management Console (Ban/Unban/Kick) */}
                            <Card className="md:col-span-1 border-neutral-200 dark:border-neutral-800">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <UserX className="h-5 w-5 text-amber-600" />
                                        Member Action Console
                                    </CardTitle>
                                    <CardDescription>
                                        Ban, unban, or kick members by Telegram User ID across connected groups.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleMemberAction} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="mod_chat_id">Target Group / Channel</Label>
                                            <Select
                                                value={memberActionForm.data.chat_id}
                                                onValueChange={(val) => memberActionForm.setData('chat_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {config.region_groups?.['Region 1'] && (
                                                        <SelectItem value={String(config.region_groups['Region 1'])}>
                                                            Region 1 Group ({config.region_groups['Region 1']})
                                                        </SelectItem>
                                                    )}
                                                    {config.region_groups?.['Region 2'] && (
                                                        <SelectItem value={String(config.region_groups['Region 2'])}>
                                                            Region 2 Group ({config.region_groups['Region 2']})
                                                        </SelectItem>
                                                    )}
                                                    {config.ho_group_chat_id && (
                                                        <SelectItem value={String(config.ho_group_chat_id)}>
                                                            Head Office Group ({config.ho_group_chat_id})
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mod_user_id">Telegram User ID</Label>
                                            <Input
                                                id="mod_user_id"
                                                placeholder="e.g. 123456789"
                                                value={memberActionForm.data.telegram_user_id}
                                                onChange={(e) => memberActionForm.setData('telegram_user_id', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mod_action">Action</Label>
                                            <Select
                                                value={memberActionForm.data.action}
                                                onValueChange={(val) => memberActionForm.setData('action', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Action" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ban">Ban Member (Permanent)</SelectItem>
                                                    <SelectItem value="kick">Kick Member (Allow Rejoin)</SelectItem>
                                                    <SelectItem value="unban">Unban Member</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Button
                                            type="submit"
                                            variant={memberActionForm.data.action === 'ban' ? 'destructive' : 'default'}
                                            className="w-full gap-2"
                                            disabled={memberActionForm.processing}
                                        >
                                            <UserX className="h-4 w-4" />
                                            Execute {memberActionForm.data.action.toUpperCase()}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Card 3: Channel Broadcast & Pin */}
                            <Card className="md:col-span-1 border-neutral-200 dark:border-neutral-800">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Megaphone className="h-5 w-5 text-indigo-600" />
                                        Channel & Group Broadcast
                                    </CardTitle>
                                    <CardDescription>
                                        Broadcast announcement & pin to target group or channel.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleBroadcast} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="bc_chat_id">Target Group / Channel</Label>
                                            <Select
                                                value={broadcastForm.data.chat_id}
                                                onValueChange={(val) => broadcastForm.setData('chat_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Target" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {config.ho_group_chat_id && (
                                                        <SelectItem value={String(config.ho_group_chat_id)}>
                                                            Head Office Group ({config.ho_group_chat_id})
                                                        </SelectItem>
                                                    )}
                                                    {config.region_groups?.['Region 1'] && (
                                                        <SelectItem value={String(config.region_groups['Region 1'])}>
                                                            Region 1 Group ({config.region_groups['Region 1']})
                                                        </SelectItem>
                                                    )}
                                                    {config.region_groups?.['Region 2'] && (
                                                        <SelectItem value={String(config.region_groups['Region 2'])}>
                                                            Region 2 Group ({config.region_groups['Region 2']})
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bc_message">Broadcast Message (HTML)</Label>
                                            <textarea
                                                id="bc_message"
                                                rows={4}
                                                value={broadcastForm.data.message}
                                                onChange={(e) => broadcastForm.setData('message', e.target.value)}
                                                className="w-full text-xs p-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                                                placeholder="<b>ANNOUNCEMENT:</b> Urgent notice..."
                                                required
                                            />
                                        </div>

                                        <div className="flex items-center space-x-2 pt-1">
                                            <input
                                                type="checkbox"
                                                id="bc_pin"
                                                checked={broadcastForm.data.pin}
                                                onChange={(e) => broadcastForm.setData('pin', e.target.checked)}
                                                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <Label htmlFor="bc_pin" className="text-xs text-neutral-600 dark:text-neutral-400">
                                                Pin announcement at top of group
                                            </Label>
                                        </div>

                                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2" disabled={broadcastForm.processing}>
                                            <Send className="h-4 w-4" />
                                            Post Broadcast Announcement
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab 3: Staff Roster */}
                    <TabsContent value="roster" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Users className="h-5 w-5 text-purple-600" />
                                        Registered Telegram Staff Roster
                                    </CardTitle>
                                    <CardDescription>
                                        Registered Branch Managers, Regional Managers, Department Heads, and Operations Director.
                                    </CardDescription>
                                </div>
                                {canManage && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleSyncMembers}
                                            disabled={isSyncingMembers}
                                            className="gap-1.5 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                                            title="Scrape and sync all members/admins from Telegram groups into system roster"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isSyncingMembers ? 'animate-spin' : ''}`} />
                                            {isSyncingMembers ? 'Syncing...' : 'Sync Members from Telegram'}
                                        </Button>
                                        <Button size="sm" onClick={() => setIsAddUserOpen(true)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                                            <UserPlus className="h-4 w-4" />
                                            Register User
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border border-neutral-200 dark:border-neutral-800">
                                    <Table>
                                        <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
                                            <TableRow>
                                                <TableHead>Telegram User ID</TableHead>
                                                <TableHead>Display Name</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Region / Branch</TableHead>
                                                <TableHead>HO Department</TableHead>
                                                <TableHead>Can Forward</TableHead>
                                                {canManage && <TableHead className="w-24 text-right">Action</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rosterUsers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={canManage ? 7 : 6} className="h-20 text-center text-neutral-500">
                                                        No staff registered in the roster yet. Click "Sync Members from Telegram" to import group members.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rosterUsers.map((u) => (
                                                    <TableRow key={u.telegram_user_id}>
                                                        <TableCell className="font-mono text-xs font-semibold">{u.telegram_user_id}</TableCell>
                                                        <TableCell className="font-medium text-sm">{u.display_name}</TableCell>
                                                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                                                        <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                                                            {u.region ? u.region : ''} {u.branch_name ? `• ${u.branch_name}` : ''}
                                                            {!u.region && !u.branch_name ? '—' : ''}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                            {u.department || '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {u.can_forward === 1 ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Yes</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-neutral-400">No</Badge>
                                                            )}
                                                        </TableCell>
                                                        {canManage && (
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Edit Member Profile (Branch/Department/Role)"
                                                                        onClick={() => openEditUser(u)}
                                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                                                                    >
                                                                        <Edit3 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Generate & Send Telegram Group Join Link"
                                                                        onClick={() => handleGenerateInviteLink(u)}
                                                                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                                    >
                                                                        <Send className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Remove user from roster"
                                                                        onClick={() => handleDeleteUser(u.telegram_user_id, u.display_name)}
                                                                        className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 4: Bot Configuration */}
                    <TabsContent value="config" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Bot className="h-5 w-5 text-amber-600" />
                                    Telegram Groups & Bot API Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure Telegram Bot API token, Group Chat IDs, and Operations Director Telegram User ID.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveConfig} className="space-y-4 max-w-2xl">
                                    <div className="space-y-2">
                                        <Label htmlFor="bot_token">Telegram Bot Token (from @BotFather)</Label>
                                        <Input
                                            id="bot_token"
                                            type="password"
                                            placeholder="7123456789:ABC..."
                                            value={configForm.data.bot_token}
                                            onChange={(e) => configForm.setData('bot_token', e.target.value)}
                                            disabled={!canManage}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="region_1_chat_id">Region 1 Group Chat ID</Label>
                                            <Input
                                                id="region_1_chat_id"
                                                placeholder="-1001234567890"
                                                value={configForm.data.region_1_chat_id}
                                                onChange={(e) => configForm.setData('region_1_chat_id', e.target.value)}
                                                disabled={!canManage}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="region_2_chat_id">Region 2 Group Chat ID</Label>
                                            <Input
                                                id="region_2_chat_id"
                                                placeholder="-1001234567891"
                                                value={configForm.data.region_2_chat_id}
                                                onChange={(e) => configForm.setData('region_2_chat_id', e.target.value)}
                                                disabled={!canManage}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="ho_group_chat_id">Head Office Group Chat ID</Label>
                                            <Input
                                                id="ho_group_chat_id"
                                                placeholder="-1001234567892"
                                                value={configForm.data.ho_group_chat_id}
                                                onChange={(e) => configForm.setData('ho_group_chat_id', e.target.value)}
                                                disabled={!canManage}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="operations_director_user_id">Operations Director User ID</Label>
                                            <Input
                                                id="operations_director_user_id"
                                                placeholder="987654321"
                                                value={configForm.data.operations_director_user_id}
                                                onChange={(e) => configForm.setData('operations_director_user_id', e.target.value)}
                                                disabled={!canManage}
                                            />
                                        </div>
                                    </div>

                                    {canManage && (
                                        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Button type="submit" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white" disabled={configForm.processing}>
                                                    <Save className="h-4 w-4" />
                                                    Save Bot Settings
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleRegisterCommands}
                                                    disabled={isRegisteringCmds}
                                                    className="gap-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                    title="Register slash commands (/it, /hr, /topics) with Telegram for all groups"
                                                >
                                                    <Zap className="h-4 w-4" />
                                                    {isRegisteringCmds ? 'Registering...' : 'Register Slash Commands'}
                                                </Button>
                                            </div>

                                            <div className="pt-2 space-y-2.5 bg-neutral-50 dark:bg-neutral-900 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                                <Label htmlFor="webhook_url" className="text-xs font-semibold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                                    <Activity className="h-4 w-4" />
                                                    Telegram Live Webhook Configuration (HTTPS Required)
                                                </Label>
                                                <p className="text-[11px] text-neutral-500">
                                                    Telegram API strictly requires an <b>HTTPS</b> URL starting with <code>https://</code>. Enter your domain or tunnel URL below (e.g. <code>https://your-domain.com</code> or <code>https://xxxx.ngrok-free.app</code>):
                                                </p>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="webhook_url"
                                                        placeholder="https://your-domain.com (or leave blank to auto-detect https)"
                                                        value={customWebhookUrl}
                                                        onChange={(e) => setCustomWebhookUrl(e.target.value)}
                                                        className="text-xs font-mono"
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={handleSetWebhook}
                                                        disabled={isSettingWebhook}
                                                        className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                                    >
                                                        <Activity className="h-3.5 w-3.5" />
                                                        {isSettingWebhook ? 'Connecting...' : 'Set HTTPS Webhook'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal: Add Roster Member */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Register Staff Roster Member</DialogTitle>
                        <DialogDescription>
                            Add a Branch Manager, Regional Manager, Department Head, or Operations Director.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddUser} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="telegram_user_id">Telegram User ID</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="telegram_user_id"
                                    placeholder="123456789"
                                    value={userForm.data.telegram_user_id}
                                    onChange={(e) => userForm.setData('telegram_user_id', e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleFetchMember}
                                    disabled={isFetchingMember}
                                    className="shrink-0 text-xs border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                    title="Auto-fetch member name and profile from Telegram groups API"
                                >
                                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                                    {isFetchingMember ? 'Fetching...' : 'Fetch Info'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="display_name">Display Name / Title</Label>
                            <Input
                                id="display_name"
                                placeholder="e.g. Abebe Kebede (Bole Manager)"
                                value={userForm.data.display_name}
                                onChange={(e) => userForm.setData('display_name', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={userForm.data.role}
                                onValueChange={(val) => userForm.setData('role', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="branch_manager">Branch Manager</SelectItem>
                                    <SelectItem value="regional_manager">Regional Manager</SelectItem>
                                    <SelectItem value="department_head">Department Head</SelectItem>
                                    <SelectItem value="operations_director">Operations Director</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(userForm.data.role === 'branch_manager' || userForm.data.role === 'regional_manager') && (
                            <div className="space-y-2">
                                <Label htmlFor="region">Region</Label>
                                <Select
                                    value={userForm.data.region}
                                    onValueChange={(val) => userForm.setData('region', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Region 1">Region 1</SelectItem>
                                        <SelectItem value="Region 2">Region 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {userForm.data.role === 'branch_manager' && (
                            <div className="space-y-2">
                                <Label htmlFor="branch_name">Branch Name</Label>
                                <Select
                                    value={userForm.data.branch_name}
                                    onValueChange={(val) => userForm.setData('branch_name', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.name}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {userForm.data.role === 'department_head' && (
                            <div className="space-y-2">
                                <Label htmlFor="department">HO Department</Label>
                                <Select
                                    value={userForm.data.department}
                                    onValueChange={(val) => userForm.setData('department', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={userForm.processing}>
                                Save User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Topic Binding */}
            <Dialog open={isAddBindingOpen} onOpenChange={setIsAddBindingOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bind Topic Thread to Department</DialogTitle>
                        <DialogDescription>
                            Link a Telegram Topic Thread ID to its corresponding Head Office department.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddBinding} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="group_key">Group</Label>
                            <Select
                                value={bindingForm.data.group_key}
                                onValueChange={(val) => bindingForm.setData('group_key', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Region 1">Region 1 Group</SelectItem>
                                    <SelectItem value="Region 2">Region 2 Group</SelectItem>
                                    <SelectItem value="Head Office">Head Office Group</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="thread_id">Topic Thread ID</Label>
                            <Input
                                id="thread_id"
                                placeholder="e.g. 12"
                                value={bindingForm.data.thread_id}
                                onChange={(e) => bindingForm.setData('thread_id', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="topic_name">Topic Name</Label>
                            <Input
                                id="topic_name"
                                placeholder="e.g. HR"
                                value={bindingForm.data.topic_name}
                                onChange={(e) => bindingForm.setData('topic_name', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Target HO Department</Label>
                            <Select
                                value={bindingForm.data.department}
                                onValueChange={(val) => bindingForm.setData('department', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddBindingOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={bindingForm.processing}>
                                Save Binding
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Edit Topic Binding */}
            <Dialog open={isEditBindingOpen} onOpenChange={setIsEditBindingOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Topic Binding & Sync</DialogTitle>
                        <DialogDescription>
                            Update topic name, target HO department, or sync name change to Telegram group.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateBinding} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Group & Thread ID</Label>
                            <div className="text-sm font-mono p-2 bg-neutral-100 dark:bg-neutral-800 rounded">
                                {editBindingForm.data.group_key} • Thread ID: {editBindingForm.data.thread_id}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_topic_name">Topic Name</Label>
                            <Input
                                id="edit_topic_name"
                                value={editBindingForm.data.topic_name}
                                onChange={(e) => editBindingForm.setData('topic_name', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_department">Target HO Department</Label>
                            <Select
                                value={editBindingForm.data.department}
                                onValueChange={(val) => editBindingForm.setData('department', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 pt-1">
                            <input
                                type="checkbox"
                                id="sync_to_telegram"
                                checked={editBindingForm.data.sync_to_telegram}
                                onChange={(e) => editBindingForm.setData('sync_to_telegram', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                            />
                            <Label htmlFor="sync_to_telegram" className="text-xs text-neutral-600 dark:text-neutral-400">
                                Sync updated topic name to Telegram group via API
                            </Label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditBindingOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={editBindingForm.processing}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Edit Roster Member */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Staff Member Profile</DialogTitle>
                        <DialogDescription>
                            Update member's Display Name, Role, Region, Branch, and Department details.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateUser} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit_usr_id">Telegram User ID</Label>
                            <Input
                                id="edit_usr_id"
                                value={editUserForm.data.telegram_user_id}
                                disabled
                                className="font-mono bg-neutral-100 dark:bg-neutral-800"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_usr_name">Display / Full Name</Label>
                            <Input
                                id="edit_usr_name"
                                value={editUserForm.data.display_name}
                                onChange={(e) => editUserForm.setData('display_name', e.target.value)}
                                placeholder="e.g., Abebe Bikila (@abebe)"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_usr_role">Role</Label>
                            <Select
                                value={editUserForm.data.role}
                                onValueChange={(val) => editUserForm.setData('role', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="branch_manager">Branch Manager</SelectItem>
                                    <SelectItem value="regional_manager">Regional Manager</SelectItem>
                                    <SelectItem value="department_head">HO Department Head</SelectItem>
                                    <SelectItem value="operations_director">Operations Director</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_usr_region">Region</Label>
                            <Select
                                value={editUserForm.data.region}
                                onValueChange={(val) => editUserForm.setData('region', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Region" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Region 1">Region 1</SelectItem>
                                    <SelectItem value="Region 2">Region 2</SelectItem>
                                    <SelectItem value="Head Office">Head Office</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_usr_branch">Branch Name</Label>
                            <Input
                                id="edit_usr_branch"
                                value={editUserForm.data.branch_name}
                                onChange={(e) => editUserForm.setData('branch_name', e.target.value)}
                                placeholder="e.g., Bole Medhanialem"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_usr_dept">HO Department</Label>
                            <Select
                                value={editUserForm.data.department}
                                onValueChange={(val) => editUserForm.setData('department', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department (if HO)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 pt-1">
                            <input
                                type="checkbox"
                                id="edit_usr_fwd"
                                checked={editUserForm.data.can_forward}
                                onChange={(e) => editUserForm.setData('can_forward', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                            />
                            <Label htmlFor="edit_usr_fwd" className="text-xs text-neutral-600 dark:text-neutral-400">
                                Allow forwarding communications to Head Office
                            </Label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={editUserForm.processing}>
                                Save Profile Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
