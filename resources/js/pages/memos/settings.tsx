import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import { Settings, Save, ArrowLeft, Building2, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Internal Memorandum', href: '/memos' },
    { title: 'Memo Settings', href: '/memo-settings' },
];

interface Props {
    settings: {
        COMPANY_NAME: string;
        COMPANY_LOGO_URL: string;
        MEMO_PREFIX: string;
        DEFAULT_SIGNATURE_TYPE: string;
        TELEGRAM_ENABLED: string;
    };
    telegramInfo: {
        is_active: boolean;
        bot_username: string;
        parse_mode: string;
    };
}

export default function MemoSettingsPage({ settings, telegramInfo }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        COMPANY_NAME: settings.COMPANY_NAME || "KALDI'S COFFEE P.L.C.",
        COMPANY_LOGO_URL: settings.COMPANY_LOGO_URL || '/images/logo.png',
        MEMO_PREFIX: settings.MEMO_PREFIX || 'KCM',
        DEFAULT_SIGNATURE_TYPE: settings.DEFAULT_SIGNATURE_TYPE || 'typed',
        TELEGRAM_ENABLED: settings.TELEGRAM_ENABLED || 'true',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/memo-settings', {
            onSuccess: () => toast.success('Internal Memorandum settings updated successfully!'),
            onError: () => toast.error('Failed to update settings.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Memo Settings" />

            <div className="mx-auto max-w-4xl space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            <Settings className="h-7 w-7 text-amber-700 dark:text-amber-500" />
                            Internal Memorandum Settings
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Configure company branding, memo prefixing, default signature type, and Telegram bot alerts.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.history.back()}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Company Information */}
                    <Card className="border border-slate-200 shadow-md dark:border-slate-800">
                        <CardHeader className="border-b bg-slate-50/50 pb-4 dark:bg-slate-900/50">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Building2 className="h-5 w-5 text-amber-700 dark:text-amber-500" />
                                Branding & Formatting
                            </CardTitle>
                            <CardDescription>Company title and logo printed on top of memorandums</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="COMPANY_NAME" className="font-semibold">
                                    Company Full Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="COMPANY_NAME"
                                    value={data.COMPANY_NAME}
                                    onChange={(e) => setData('COMPANY_NAME', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="COMPANY_LOGO_URL" className="font-semibold">
                                    Company Logo Image Path / URL
                                </Label>
                                <Input
                                    id="COMPANY_LOGO_URL"
                                    placeholder="/images/logo.png"
                                    value={data.COMPANY_LOGO_URL}
                                    onChange={(e) => setData('COMPANY_LOGO_URL', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Default local logo path: <code>/images/logo.png</code>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="MEMO_PREFIX" className="font-semibold">
                                    Memo Reference Code Prefix <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="MEMO_PREFIX"
                                    value={data.MEMO_PREFIX}
                                    onChange={(e) => setData('MEMO_PREFIX', e.target.value)}
                                    className="font-mono w-48"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Example: <code>KCM</code> generates IDs like <code>KCM-ABC123-20260821</code>
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Defaults & Telegram */}
                    <Card className="border border-slate-200 shadow-md dark:border-slate-800">
                        <CardHeader className="border-b bg-slate-50/50 pb-4 dark:bg-slate-900/50">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                Telegram Bot & Signature Defaults
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            {/* Telegram Bot Integration Status */}
                            <div className="rounded-lg border bg-blue-50/60 p-4 dark:bg-blue-950/20 dark:border-blue-900/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-sm text-blue-950 dark:text-blue-200">
                                        <Send className="h-4 w-4 text-blue-600" />
                                        Memorandum Telegram Bot Status
                                    </div>
                                    {telegramInfo?.is_active ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Bot Connected & Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                            Needs Bot Token
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Internal memorandums use the system Telegram Bot engine to send real-time alerts to target departments and branches when published.
                                </p>
                                <div className="pt-1">
                                    <Link href="/telegram-config" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400">
                                        Configure Telegram Bot Token & Webhook
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="TELEGRAM_ENABLED" className="font-semibold">
                                    Enable Telegram Alerts for Memorandums
                                </Label>
                                <Select
                                    value={data.TELEGRAM_ENABLED}
                                    onValueChange={(val) => setData('TELEGRAM_ENABLED', val)}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Enabled</SelectItem>
                                        <SelectItem value="false">Disabled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="DEFAULT_SIGNATURE_TYPE" className="font-semibold">
                                    Default Signature Input Method
                                </Label>
                                <Select
                                    value={data.DEFAULT_SIGNATURE_TYPE}
                                    onValueChange={(val) => setData('DEFAULT_SIGNATURE_TYPE', val)}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="typed">Typed Font Signature</SelectItem>
                                        <SelectItem value="drawn">Drawn Digital Signature</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="gap-2 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                        >
                            <Save className="h-4 w-4" />
                            {processing ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
