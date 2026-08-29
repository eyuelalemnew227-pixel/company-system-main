import PhoneNumberModal, { EmployeeItem, OptionItem, PhoneNumberRecord } from '@/components/telecom/PhoneNumberModal';
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
import { Download, Edit, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

type PhoneNumber = {
    id: number;
    phone_number: string;
    account_number?: string | null;
    sim_card_number?: string | null;
    service_type: string;
    package_type?: string | null;
    monthly_cost: number;
    billing_type: string;
    assigned_type: string;
    status: string;
    issue_date?: string | null;
    renewal_date?: string | null;
    notes?: string | null;
    provider?: { id: number; name: string } | null;
    employee?: { id: number; first_name: string; last_name: string; employee_code: string } | null;
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
    phoneNumbers: Paginated<PhoneNumber>;
    providers: OptionItem[];
    branches: OptionItem[];
    departments: OptionItem[];
    employees?: EmployeeItem[];
    filters: {
        search?: string;
        telecom_provider_id?: string;
        service_type?: string;
        status?: string;
        assigned_type?: string;
        branch_id?: string;
    };
    flash?: { success?: string; error?: string };
};

export default function PhoneNumbersIndex({
    phoneNumbers,
    providers = [],
    branches = [],
    departments = [],
    employees = [],
    filters = {},
    flash,
}: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [providerFilter, setProviderFilter] = useState(filters.telecom_provider_id ?? 'all');
    const [serviceTypeFilter, setServiceTypeFilter] = useState(filters.service_type ?? 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [assignedTypeFilter, setAssignedTypeFilter] = useState(filters.assigned_type ?? 'all');

    const [openAddModal, setOpenAddModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PhoneNumberRecord | null>(null);

    const { can } = usePermission();

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (providerFilter !== 'all') params.telecom_provider_id = providerFilter;
        if (serviceTypeFilter !== 'all') params.service_type = serviceTypeFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (assignedTypeFilter !== 'all') params.assigned_type = assignedTypeFilter;

        router.get('/telecom/phone-numbers', params, { preserveState: true, preserveScroll: true });
    }

    function handleDelete(id: number, phone: string) {
        if (!confirm(`Are you sure you want to delete phone line ${phone}?`)) return;
        router.delete(`/telecom/phone-numbers/${id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Phone line deleted successfully'),
            onError: () => toast.error('Failed to delete phone line'),
        });
    }

    function getAssignedLabel(item: PhoneNumber) {
        if (item.assigned_type === 'Employee' && item.employee) {
            return `${item.employee.first_name} ${item.employee.last_name}`;
        }
        if (item.assigned_type === 'Branch' && item.branch) {
            return `Branch: ${item.branch.name}`;
        }
        if (item.assigned_type === 'Department' && item.department) {
            return `Dept: ${item.department.name}`;
        }
        return item.assigned_type;
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'Active':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700">Active</Badge>;
            case 'Suspended':
                return <Badge variant="outline" className="text-amber-600 border-amber-600">Suspended</Badge>;
            case 'Inactive':
                return <Badge variant="secondary">Inactive</Badge>;
            case 'Cancelled':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Telecom Management', href: '/telecom/dashboard' },
                { title: 'Phone Numbers', href: '/telecom/phone-numbers' },
            ]}
        >
            <Head title="Company Phone Numbers & Packages" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Unified Header Navigation */}
                <TelecomHeaderNav
                    onOpenAddPhoneModal={() => setOpenAddModal(true)}
                />

                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold">Company Phone Numbers & Packages</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Manage voice lines, SIM cards, monthly costs, and assigned employees/branches
                            </p>
                        </div>
                        <CardAction className="flex flex-wrap items-center gap-2">
                            <a href={`/telecom/phone-numbers/export?search=${encodeURIComponent(search)}`}>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Download className="h-4 w-4" /> Export CSV
                                </Button>
                            </a>
                            {can('manage telecom connections') && (
                                <Button size="sm" onClick={() => setOpenAddModal(true)} className="gap-1.5">
                                    <Plus className="h-4 w-4" /> Add Phone Line
                                </Button>
                            )}
                        </CardAction>
                    </CardHeader>
                    <hr />

                    {/* Filter controls */}
                    <div className="p-4 bg-muted/30 border-b">
                        <form className="grid gap-3 md:grid-cols-5" onSubmit={handleSearch}>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search number, SIM, package..."
                                className="w-full"
                            />
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

                            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Service Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Service Types</SelectItem>
                                    <SelectItem value="Mobile Voice">Mobile Voice</SelectItem>
                                    <SelectItem value="Mobile Data">Mobile Data</SelectItem>
                                    <SelectItem value="Fixed Line">Fixed Line</SelectItem>
                                    <SelectItem value="CUG">CUG (Group)</SelectItem>
                                    <SelectItem value="Shortcode">Shortcode</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Suspended">Suspended</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button type="submit" variant="default" className="w-full">Filter</Button>
                        </form>
                    </div>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-700 dark:bg-slate-800">
                                <TableRow>
                                    <TableHead className="font-bold text-white">#</TableHead>
                                    <TableHead className="font-bold text-white">Phone Number</TableHead>
                                    <TableHead className="font-bold text-white">Provider</TableHead>
                                    <TableHead className="font-bold text-white">Service & Package</TableHead>
                                    <TableHead className="font-bold text-white">Billing & Cost</TableHead>
                                    <TableHead className="font-bold text-white">Assigned To</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {phoneNumbers.data.map((item, idx) => (
                                    <TableRow key={item.id} className="odd:bg-muted/40">
                                        <TableCell>{(phoneNumbers.from ?? 0) + idx}</TableCell>
                                        <TableCell className="font-semibold font-mono">
                                            <div>{item.phone_number}</div>
                                            {item.account_number && (
                                                <div className="text-xs text-muted-foreground font-sans">Acc: {item.account_number}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{item.provider?.name ?? 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.service_type}</div>
                                            {item.package_type && (
                                                <div className="text-xs text-muted-foreground">{item.package_type}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-mono font-medium">{Number(item.monthly_cost).toFixed(2)} ETB</div>
                                            <div className="text-xs text-muted-foreground">{item.billing_type}</div>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {getAssignedLabel(item)}
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
                                                                phone_number: item.phone_number,
                                                                account_number: item.account_number || '',
                                                                sim_card_number: item.sim_card_number || '',
                                                                telecom_provider_id: item.provider?.id || '',
                                                                service_type: item.service_type,
                                                                package_type: item.package_type || '',
                                                                monthly_cost: item.monthly_cost,
                                                                billing_type: item.billing_type,
                                                                assigned_type: item.assigned_type,
                                                                employee_id: item.employee?.id || '',
                                                                branch_id: item.branch?.id || '',
                                                                department_id: item.department?.id || '',
                                                                status: item.status,
                                                                issue_date: item.issue_date || '',
                                                                renewal_date: item.renewal_date || '',
                                                                notes: item.notes || '',
                                                            })}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-rose-500 hover:text-rose-700"
                                                            onClick={() => handleDelete(item.id, item.phone_number)}
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
                                {phoneNumbers.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No company phone numbers found matching the criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <TablePagination from={phoneNumbers.from} to={phoneNumbers.to} total={phoneNumbers.total} links={phoneNumbers.links} />
                </Card>
            </div>

            {/* Quick Add / Edit Phone Number Modal */}
            <PhoneNumberModal
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
                departments={departments}
                employees={employees}
            />
        </AppLayout>
    );
}
