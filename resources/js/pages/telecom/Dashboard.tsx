import BroadbandModal from '@/components/telecom/BroadbandModal';
import PhoneNumberModal, { EmployeeItem, OptionItem } from '@/components/telecom/PhoneNumberModal';
import TelecomHeaderNav from '@/components/telecom/TelecomHeaderNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import {
    BarChart3,
    Building2,
    Globe2,
    MapPin,
    Phone,
    Plus,
    Radio,
    ShieldAlert,
    Signal,
    Wifi,
} from 'lucide-react';
import React, { useState } from 'react';

type Stats = {
    total_phones: number;
    active_phones: number;
    total_phone_cost: number;
    total_broadbands: number;
    active_broadbands: number;
    wttx_count: number;
    total_broadband_cost: number;
    total_monthly_spend: number;
    total_providers: number;
};

type PhoneTypeStat = {
    service_type: string;
    count: number;
    total_cost: number;
};

type BroadbandTypeStat = {
    connection_type: string;
    count: number;
    total_cost: number;
};

type ProviderStat = {
    id: number;
    name: string;
    code?: string;
    phone_numbers_count: number;
    broadbands_count: number;
};

type BranchStat = {
    id: number;
    name: string;
    phone_count: number;
    broadband_count: number;
    total_cost: number;
};

type ExpiringBroadband = {
    id: number;
    connection_name: string;
    connection_type: string;
    contract_expiry_date: string;
    monthly_cost: number;
    provider?: { id: number; name: string };
    branch?: { id: number; name: string };
};

type PageProps = {
    stats: Stats;
    phone_types: PhoneTypeStat[];
    broadband_types: BroadbandTypeStat[];
    provider_stats: ProviderStat[];
    branch_stats?: BranchStat[];
    expiring_broadbands: ExpiringBroadband[];
    providers?: OptionItem[];
    branches?: OptionItem[];
    departments?: OptionItem[];
    employees?: EmployeeItem[];
};

export default function TelecomDashboard({
    stats,
    phone_types,
    broadband_types,
    provider_stats,
    branch_stats = [],
    expiring_broadbands,
    providers = [],
    branches = [],
    departments = [],
    employees = [],
}: PageProps) {
    const [openAddPhoneModal, setOpenAddPhoneModal] = useState(false);
    const [openAddBroadbandModal, setOpenAddBroadbandModal] = useState(false);

    const formatETB = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }).format(amount);
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Telecom Management', href: '/telecom/dashboard' },
                { title: 'Overview', href: '/telecom/dashboard' },
            ]}
        >
            <Head title="Telecom Management Overview" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Unified Header Navigation & Spend Badge */}
                <TelecomHeaderNav
                    totalMonthlySpend={stats.total_monthly_spend}
                    onOpenAddPhoneModal={() => setOpenAddPhoneModal(true)}
                    onOpenAddBroadbandModal={() => setOpenAddBroadbandModal(true)}
                />

                {/* Top KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-blue-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Phone Numbers & SIMs</CardTitle>
                            <Phone className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_phones} Lines</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.active_phones} Active</span> • Cost: {formatETB(stats.total_phone_cost)}/mo
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Broadband & WTTx</CardTitle>
                            <Wifi className="h-5 w-5 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_broadbands} Connections</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-semibold text-purple-600 dark:text-purple-400">{stats.wttx_count} WTTx</span> • Cost: {formatETB(stats.total_broadband_cost)}/mo
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Monthly Spend</CardTitle>
                            <BarChart3 className="h-5 w-5 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatETB(stats.total_monthly_spend)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Combined recurring active services
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Telecom Providers</CardTitle>
                            <Signal className="h-5 w-5 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_providers} Providers</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Ethio Telecom, Safaricom, etc.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Interactive Branch Telecom Cards */}
                {branch_stats.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" /> Branch Telecom Expenses & Connections
                            </h2>
                            <span className="text-xs text-muted-foreground">{branch_stats.length} Active Branch Locations</span>
                        </div>

                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {branch_stats.map((b) => (
                                <Card key={b.id} className="hover:shadow-md transition-all border-slate-200 dark:border-slate-800">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                            {b.name}
                                        </CardTitle>
                                        <Badge variant="secondary" className="font-mono text-[10px]">
                                            {formatETB(b.total_cost)}/mo
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="pt-0 space-y-2 text-xs">
                                        <div className="flex items-center justify-between text-muted-foreground border-b pb-1.5">
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5 text-blue-500" /> Phone Lines:
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{b.phone_count}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <Wifi className="h-3.5 w-3.5 text-purple-500" /> Broadband/WTTx:
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{b.broadband_count}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section Breakdowns */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Phone Lines Breakdown */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Phone className="h-4 w-4 text-blue-500" /> Phone Numbers by Service Type
                            </CardTitle>
                            <Link href="/telecom/phone-numbers">
                                <Button variant="ghost" size="sm">View All</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Service Type</TableHead>
                                        <TableHead className="text-center">Lines</TableHead>
                                        <TableHead className="text-right">Monthly Spend</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {phone_types.map((type) => (
                                        <TableRow key={type.service_type}>
                                            <TableCell className="font-medium">{type.service_type}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">{type.count}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{formatETB(type.total_cost)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {phone_types.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">No phone lines recorded yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Broadband & WTTx Breakdown */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Wifi className="h-4 w-4 text-purple-500" /> Internet Connections by Type
                            </CardTitle>
                            <Link href="/telecom/broadbands">
                                <Button variant="ghost" size="sm">View All</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Connection Type</TableHead>
                                        <TableHead className="text-center">Count</TableHead>
                                        <TableHead className="text-right">Monthly Spend</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {broadband_types.map((type) => (
                                        <TableRow key={type.connection_type}>
                                            <TableCell className="font-medium">{type.connection_type}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{type.count}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{formatETB(type.total_cost)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {broadband_types.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">No broadband / WTTx connections recorded yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming Contract Renewals & Providers */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Provider Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-amber-500" /> Telecom Service Providers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Provider</TableHead>
                                        <TableHead className="text-center">Phone Lines</TableHead>
                                        <TableHead className="text-center">Broadbands / WTTx</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {provider_stats.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell className="text-center font-semibold">{p.phone_numbers_count}</TableCell>
                                            <TableCell className="text-center font-semibold">{p.broadbands_count}</TableCell>
                                        </TableRow>
                                    ))}
                                    {provider_stats.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">No providers found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Expiring Broadbands */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Globe2 className="h-4 w-4 text-rose-500" /> Upcoming Contract Renewals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Connection</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead className="text-right">Expiry Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expiring_broadbands.map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell className="font-medium">
                                                <div>{b.connection_name}</div>
                                                <div className="text-xs text-muted-foreground">{b.connection_type}</div>
                                            </TableCell>
                                            <TableCell>{b.branch?.name ?? '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="destructive">{b.contract_expiry_date}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {expiring_broadbands.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">No contracts expiring in the next 45 days.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Quick Add Phone Line Modal */}
            <PhoneNumberModal
                open={openAddPhoneModal}
                onOpenChange={setOpenAddPhoneModal}
                providers={providers}
                branches={branches}
                departments={departments}
                employees={employees}
            />

            {/* Quick Add Broadband Modal */}
            <BroadbandModal
                open={openAddBroadbandModal}
                onOpenChange={setOpenAddBroadbandModal}
                providers={providers}
                branches={branches}
            />
        </AppLayout>
    );
}
