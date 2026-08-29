import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, usePage } from '@inertiajs/react';
import { Building2, LayoutDashboard, Phone, Plus, Signal, Wifi } from 'lucide-react';
import React from 'react';

interface TelecomHeaderNavProps {
    totalMonthlySpend?: number;
    onOpenAddPhoneModal?: () => void;
    onOpenAddBroadbandModal?: () => void;
}

export default function TelecomHeaderNav({
    totalMonthlySpend,
    onOpenAddPhoneModal,
    onOpenAddBroadbandModal,
}: TelecomHeaderNavProps) {
    const { url } = usePage();

    const tabs = [
        {
            name: 'Overview',
            href: '/telecom/dashboard',
            icon: LayoutDashboard,
            active: url.startsWith('/telecom/dashboard'),
        },
        {
            name: 'Phone Lines & SIMs',
            href: '/telecom/phone-numbers',
            icon: Phone,
            active: url.startsWith('/telecom/phone-numbers'),
        },
        {
            name: 'Broadband & WTTx',
            href: '/telecom/broadbands',
            icon: Wifi,
            active: url.startsWith('/telecom/broadbands'),
        },
        {
            name: 'Service Providers',
            href: '/telecom/providers',
            icon: Building2,
            active: url.startsWith('/telecom/providers'),
        },
    ];

    const formatETB = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-xs dark:bg-slate-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
                        <Signal className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Telecom & Network Management
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Centralized hub for corporate phone lines, WTTx, broadband, and telecom budgets
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {typeof totalMonthlySpend === 'number' && (
                        <div className="flex items-center gap-1.5 rounded-lg border bg-slate-50 px-3 py-1.5 dark:bg-slate-900">
                            <span className="text-xs text-muted-foreground font-medium">Monthly Spend:</span>
                            <Badge variant="default" className="bg-emerald-600 font-mono text-xs">
                                {formatETB(totalMonthlySpend)}/mo
                            </Badge>
                        </div>
                    )}

                    {onOpenAddPhoneModal && (
                        <Button size="sm" onClick={onOpenAddPhoneModal} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4" /> Quick Add Phone Line
                        </Button>
                    )}

                    {onOpenAddBroadbandModal && (
                        <Button size="sm" variant="outline" onClick={onOpenAddBroadbandModal} className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950">
                            <Plus className="h-4 w-4 text-purple-600" /> Quick Add Broadband
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-t pt-3 scrollbar-none">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                                tab.active
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{tab.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
