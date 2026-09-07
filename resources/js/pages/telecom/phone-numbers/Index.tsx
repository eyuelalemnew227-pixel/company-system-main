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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeftRight, Building, Building2, Download, Edit, Plus, Trash2, User } from 'lucide-react';
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
    transfers?: any[];
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
    transfers = [],
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
    const [transferringItem, setTransferringItem] = useState<PhoneNumber | null>(null);

    const transferForm = useForm({
        assigned_type: 'Employee',
        employee_id: '',
        branch_id: '',
        department_id: '',
        transfer_reason: '',
    });

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
        if (confirm(`Are you sure you want to delete phone number "${phone}"?`)) {
            router.delete(`/telecom/phone-numbers/${id}`, {
                onSuccess: () => toast.success('Phone number deleted.'),
                onError: () => toast.error('Failed to delete.'),
            });
        }
    }

    function getAssignedLabel(item: PhoneNumber) {
        if (item.assigned_type === 'Employee' && item.employee) {
            return (
                <div className="flex items-center gap-1.5 font-medium">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    <span>{item.employee.first_name} {item.employee.last_name}</span>
                </div>
            );
        }
        if (item.assigned_type === 'Branch' && item.branch) {
            return (
                <div className="flex items-center gap-1.5 font-medium">
                    <Building className="h-3.5 w-3.5 text-amber-500" />
                    <span>{item.branch.name}</span>
                </div>
            );
        }
        if (item.assigned_type === 'Department' && item.department) {
            return (
                <div className="flex items-center gap-1.5 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-purple-500" />
                    <span>{item.department.name}</span>
                </div>
            );
        }
        return <span className="text-muted-foreground italic text-xs">Unassigned</span>;
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'Active':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
            case 'Inactive':
                return <Badge variant="secondary">Inactive</Badge>;
            case 'Suspended':
                return <Badge className="bg-amber-500 hover:bg-amber-600">Suspended</Badge>;
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
                    onOpenTransferModal={() => {
                        if (phoneNumbers.data.length > 0) {
                            setTransferringItem(phoneNumbers.data[0]);
                        }
                    }}
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
                                                            title="Transfer SIM / Line"
                                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                                                            onClick={() => {
                                                                setTransferringItem(item);
                                                                transferForm.setData({
                                                                    assigned_type: item.assigned_type || 'Employee',
                                                                    employee_id: item.employee?.id ? String(item.employee.id) : '',
                                                                    branch_id: item.branch?.id ? String(item.branch.id) : '',
                                                                    department_id: item.department?.id ? String(item.department.id) : '',
                                                                    transfer_reason: '',
                                                                });
                                                            }}
                                                        >
                                                            <ArrowLeftRight className="h-4 w-4" />
                                                        </Button>
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

                {/* Transfer History Log Card */}
                {transfers && transfers.length > 0 && (
                    <Card className="border shadow-sm bg-card">
                        <CardHeader className="py-3 bg-amber-50/50 dark:bg-amber-950/20 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                                <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                                Recent SIM Card & Line Transfer History Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 text-xs">
                                        <TableHead>Line / SIM Reference</TableHead>
                                        <TableHead>Transferred To</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Transferred By</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfers.map((tr: any) => (
                                        <TableRow key={tr.id} className="text-xs">
                                            <TableCell className="font-semibold text-amber-700 dark:text-amber-400">{tr.reference_number}</TableCell>
                                            <TableCell>
                                                {tr.to_employee ? `${tr.to_employee.first_name} ${tr.to_employee.last_name} (Employee)` :
                                                 tr.to_branch ? `${tr.to_branch.name} (Branch)` :
                                                 tr.to_department ? `${tr.to_department.name} (Department)` : 'Unassigned'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground max-w-xs truncate">{tr.transfer_reason || '-'}</TableCell>
                                            <TableCell>{tr.transferred_by_user?.name || 'System User'}</TableCell>
                                            <TableCell className="text-muted-foreground font-mono">{new Date(tr.created_at).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Transfer SIM Card Dialog */}
            <Dialog open={!!transferringItem} onOpenChange={(val) => !val && setTransferringItem(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5 text-amber-600" />
                            Transfer SIM Card / Line
                        </DialogTitle>
                        <DialogDescription>
                            Transfer line <code className="font-bold text-amber-600">{transferringItem?.phone_number}</code> to a new employee, branch, or department.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!transferringItem) return;
                        transferForm.post(route('telecom.phone-numbers.transfer', transferringItem.id), {
                            onSuccess: () => {
                                toast.success('SIM Card / Phone line transferred successfully!');
                                setTransferringItem(null);
                                transferForm.reset();
                            },
                            onError: () => toast.error('Failed to transfer line.'),
                        });
                    }} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Assignment Category</Label>
                            <Select
                                value={transferForm.data.assigned_type}
                                onValueChange={(val) => transferForm.setData('assigned_type', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Employee">Employee</SelectItem>
                                    <SelectItem value="Branch">Branch</SelectItem>
                                    <SelectItem value="Department">Department</SelectItem>
                                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {transferForm.data.assigned_type === 'Employee' && (
                            <div className="space-y-2">
                                <Label>Target Employee</Label>
                                <Select
                                    value={transferForm.data.employee_id}
                                    onValueChange={(val) => transferForm.setData('employee_id', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(employees || []).map((emp) => (
                                            <SelectItem key={emp.id} value={String(emp.id)}>
                                                {emp.first_name} {emp.last_name} ({emp.employee_code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {transferForm.data.assigned_type === 'Branch' && (
                            <div className="space-y-2">
                                <Label>Target Branch</Label>
                                <Select
                                    value={transferForm.data.branch_id}
                                    onValueChange={(val) => transferForm.setData('branch_id', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {transferForm.data.assigned_type === 'Department' && (
                            <div className="space-y-2">
                                <Label>Target Department</Label>
                                <Select
                                    value={transferForm.data.department_id}
                                    onValueChange={(val) => transferForm.setData('department_id', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((d) => (
                                            <SelectItem key={d.id} value={String(d.id)}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Reason for Transfer (Optional)</Label>
                            <Input
                                value={transferForm.data.transfer_reason}
                                onChange={(e) => transferForm.setData('transfer_reason', e.target.value)}
                                placeholder="e.g. Employee reassignment or device swap"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setTransferringItem(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={transferForm.processing}>
                                Confirm Transfer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
