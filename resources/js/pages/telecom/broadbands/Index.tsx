import BroadbandModal, { BroadbandRecord } from '@/components/telecom/BroadbandModal';
import { OptionItem } from '@/components/telecom/PhoneNumberModal';
import TelecomHeaderNav from '@/components/telecom/TelecomHeaderNav';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Download, Edit, Plus, Trash2, Wifi } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Broadband = {
    id: number;
    account_number?: string | null;
    connection_name: string;
    connection_type: string;
    package_type?: string | null;
    bandwidth_speed?: string | null;
    monthly_cost: number;
    billing_type: string;
    installation_address?: string | null;
    ip_address?: string | null;
    equipment_details?: string | null;
    contract_start_date?: string | null;
    contract_expiry_date?: string | null;
    status: string;
    notes?: string | null;
    provider?: { id: number; name: string } | null;
    branch?: { id: number; name: string } | null;
    department?: { id: number; name: string } | null;
};

type Paginated<T> = {
    data: T[];
    total: number;
    from: number;
    to: number;
    links: any[];
};

type PageProps = {
    broadbands: Paginated<Broadband>;
    providers: OptionItem[];
    branches: OptionItem[];
    departments: OptionItem[];
    filters: {
        search?: string;
        connection_type?: string;
        telecom_provider_id?: string;
        status?: string;
        branch_id?: string;
    };
    flash?: { success?: string; error?: string };
};

export default function BroadbandsIndex({ broadbands, providers = [], branches = [], filters = {}, flash }: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [typeFilter, setTypeFilter] = useState(filters.connection_type ?? 'all');
    const [providerFilter, setProviderFilter] = useState(filters.telecom_provider_id ?? 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [branchFilter, setBranchFilter] = useState(filters.branch_id ?? 'all');

    const [openAddModal, setOpenAddModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState<BroadbandRecord | null>(null);

    const { can } = usePermission();

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (typeFilter !== 'all') params.connection_type = typeFilter;
        if (providerFilter !== 'all') params.telecom_provider_id = providerFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (branchFilter !== 'all') params.branch_id = branchFilter;

        router.get('/telecom/broadbands', params, { preserveState: true, preserveScroll: true });
    }

    function handleDelete(id: number, name: string) {
        if (!confirm(`Are you sure you want to delete connection "${name}"?`)) return;
        router.delete(`/telecom/broadbands/${id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Broadband / WTTx connection deleted'),
            onError: () => toast.error('Failed to delete connection'),
        });
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'Active':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700">Active</Badge>;
            case 'Suspended':
                return <Badge variant="outline" className="text-amber-600 border-amber-600">Suspended</Badge>;
            case 'Inactive':
                return <Badge variant="secondary">Inactive</Badge>;
            case 'Pending Installation':
                return <Badge className="bg-blue-600 hover:bg-blue-700">Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Telecom Management', href: '/telecom/dashboard' },
                { title: 'Broadband & WTTx', href: '/telecom/broadbands' },
            ]}
        >
            <Head title="Broadband & WTTx Connections" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Unified Header Navigation */}
                <TelecomHeaderNav
                    onOpenAddBroadbandModal={() => setOpenAddModal(true)}
                />

                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Wifi className="h-5 w-5 text-purple-500" /> Broadband, Fiber & WTTx Connections
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Track internet bandwidth, circuits, static IPs, and branch connections
                            </p>
                        </div>
                        <CardAction className="flex flex-wrap items-center gap-2">
                            <a href={`/telecom/broadbands/export?search=${encodeURIComponent(search)}`}>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Download className="h-4 w-4" /> Export CSV
                                </Button>
                            </a>
                            {can('manage telecom connections') && (
                                <Button size="sm" onClick={() => setOpenAddModal(true)} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
                                    <Plus className="h-4 w-4" /> Add Broadband / WTTx
                                </Button>
                            )}
                        </CardAction>
                    </CardHeader>
                    <hr />

                    {/* Filters */}
                    <div className="p-4 bg-muted/30 border-b">
                        <form className="grid gap-3 md:grid-cols-5" onSubmit={handleSearch}>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, IP, package, account..."
                            />

                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Connection Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="WTTx (Fixed Wireless)">WTTx (4G/5G Wireless)</SelectItem>
                                    <SelectItem value="Fiber / FTTH">Fiber / FTTH</SelectItem>
                                    <SelectItem value="Broadband ADSL">Broadband ADSL</SelectItem>
                                    <SelectItem value="Leased Line">Leased Line</SelectItem>
                                    <SelectItem value="Satellite">Satellite</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={providerFilter} onValueChange={setProviderFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Providers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Providers</SelectItem>
                                    {providers.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={branchFilter} onValueChange={setBranchFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Branches</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button type="submit" variant="default">Filter</Button>
                        </form>
                    </div>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-700 dark:bg-slate-800">
                                <TableRow>
                                    <TableHead className="font-bold text-white">#</TableHead>
                                    <TableHead className="font-bold text-white">Connection Name & Account</TableHead>
                                    <TableHead className="font-bold text-white">Type & Speed</TableHead>
                                    <TableHead className="font-bold text-white">Provider & Package</TableHead>
                                    <TableHead className="font-bold text-white">Cost & Billing</TableHead>
                                    <TableHead className="font-bold text-white">Branch / Location</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {broadbands.data.map((item, idx) => (
                                    <TableRow key={item.id} className="odd:bg-muted/40">
                                        <TableCell>{(broadbands.from ?? 0) + idx}</TableCell>
                                        <TableCell className="font-semibold">
                                            <div>{item.connection_name}</div>
                                            {item.account_number && (
                                                <div className="text-xs text-muted-foreground font-mono">Acc: {item.account_number}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{item.connection_type}</Badge>
                                            {item.bandwidth_speed && (
                                                <div className="text-xs text-muted-foreground mt-0.5">{item.bandwidth_speed}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.provider?.name ?? 'N/A'}</div>
                                            {item.package_type && (
                                                <div className="text-xs text-muted-foreground">{item.package_type}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-mono font-medium">{Number(item.monthly_cost).toFixed(2)} ETB</div>
                                            <div className="text-xs text-muted-foreground">{item.billing_type}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.branch?.name ?? '-'}</div>
                                            {item.ip_address && (
                                                <div className="text-xs text-muted-foreground font-mono">IP: {item.ip_address}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {can('manage telecom connections') && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Quick Edit"
                                                            onClick={() => setEditingRecord({
                                                                id: item.id,
                                                                connection_name: item.connection_name,
                                                                account_number: item.account_number || '',
                                                                telecom_provider_id: item.provider?.id || '',
                                                                connection_type: item.connection_type,
                                                                monthly_cost: item.monthly_cost,
                                                                branch_id: item.branch?.id || '',
                                                                status: item.status,
                                                                ip_address: item.ip_address || '',
                                                                equipment_details: item.equipment_details || '',
                                                                contract_start_date: item.contract_start_date || '',
                                                                contract_expiry_date: item.contract_expiry_date || '',
                                                                notes: item.notes || '',
                                                            })}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-rose-500 hover:text-rose-700"
                                                            onClick={() => handleDelete(item.id, item.connection_name)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {broadbands.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No broadband or WTTx connections found matching criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <TablePagination from={broadbands.from} to={broadbands.to} total={broadbands.total} links={broadbands.links} />
                </Card>
            </div>

            {/* Quick Add / Edit Broadband Modal */}
            <BroadbandModal
                open={openAddModal || !!editingRecord}
                onOpenChange={(val) => {
                    if (!val) {
                        setOpenAddModal(false);
                        setEditingRecord(null);
                    }
                }}
                initialData={editingRecord}
                providers={providers}
                branches={branches}
            />
        </AppLayout>
    );
}
