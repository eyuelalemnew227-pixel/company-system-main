import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { FormEvent } from 'react';

type Option = { id: number; name: string };

type Broadband = {
    id: number;
    account_number?: string | null;
    connection_name: string;
    connection_type: string;
    telecom_provider_id?: number | null;
    package_type?: string | null;
    bandwidth_speed?: string | null;
    monthly_cost: number;
    billing_type: string;
    branch_id?: number | null;
    department_id?: number | null;
    installation_address?: string | null;
    ip_address?: string | null;
    equipment_details?: string | null;
    contract_start_date?: string | null;
    contract_expiry_date?: string | null;
    status: string;
    notes?: string | null;
};

type PageProps = {
    broadband: Broadband;
    providers: Option[];
    branches: Option[];
    departments: Option[];
};

export default function BroadbandsEdit({ broadband, providers = [], branches = [], departments = [] }: PageProps) {
    const { data, setData, put, processing, errors } = useForm({
        connection_name: broadband.connection_name ?? '',
        account_number: broadband.account_number ?? '',
        connection_type: broadband.connection_type ?? 'WTTx (Fixed Wireless)',
        telecom_provider_id: broadband.telecom_provider_id ? String(broadband.telecom_provider_id) : '',
        package_type: broadband.package_type ?? '',
        bandwidth_speed: broadband.bandwidth_speed ?? '',
        monthly_cost: String(broadband.monthly_cost ?? '0.00'),
        billing_type: broadband.billing_type ?? 'Postpaid',
        branch_id: broadband.branch_id ? String(broadband.branch_id) : '',
        department_id: broadband.department_id ? String(broadband.department_id) : '',
        installation_address: broadband.installation_address ?? '',
        ip_address: broadband.ip_address ?? '',
        equipment_details: broadband.equipment_details ?? '',
        contract_start_date: broadband.contract_start_date ?? '',
        contract_expiry_date: broadband.contract_expiry_date ?? '',
        status: broadband.status ?? 'Active',
        notes: broadband.notes ?? '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        put(`/telecom/broadbands/${broadband.id}`);
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Telecom Management', href: '/telecom/dashboard' },
                { title: 'Broadband & WTTx', href: '/telecom/broadbands' },
                { title: 'Edit Broadband / WTTx', href: `/telecom/broadbands/${broadband.id}/edit` },
            ]}
        >
            <Head title={`Edit Connection - ${broadband.connection_name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit Broadband / WTTx: {broadband.connection_name}</h1>
                        <p className="text-sm text-muted-foreground">Update connection parameters, speed, IP address, and contract info.</p>
                    </div>
                    <Link href="/telecom/broadbands">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Back to List
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Connection Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Connection Name */}
                                <div>
                                    <Label htmlFor="connection_name">Connection Name / Identifier <span className="text-rose-500">*</span></Label>
                                    <Input
                                        id="connection_name"
                                        value={data.connection_name}
                                        onChange={(e) => setData('connection_name', e.target.value)}
                                        required
                                    />
                                    {errors.connection_name && <p className="text-xs text-rose-500 mt-1">{errors.connection_name}</p>}
                                </div>

                                {/* Connection Type */}
                                <div>
                                    <Label htmlFor="connection_type">Connection Technology / Type <span className="text-rose-500">*</span></Label>
                                    <Select
                                        value={data.connection_type}
                                        onValueChange={(val) => setData('connection_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Connection Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="WTTx (Fixed Wireless)">WTTx (4G/5G Wireless)</SelectItem>
                                            <SelectItem value="Fiber / FTTH">Fiber / FTTH</SelectItem>
                                            <SelectItem value="Broadband ADSL">Broadband ADSL</SelectItem>
                                            <SelectItem value="Leased Line">Leased Line</SelectItem>
                                            <SelectItem value="Satellite">Satellite</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Provider */}
                                <div>
                                    <Label htmlFor="telecom_provider_id">Telecom Provider</Label>
                                    <Select
                                        value={data.telecom_provider_id}
                                        onValueChange={(val) => setData('telecom_provider_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {providers.map((p) => (
                                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Account / Service ID */}
                                <div>
                                    <Label htmlFor="account_number">Account / Circuit ID</Label>
                                    <Input
                                        id="account_number"
                                        value={data.account_number}
                                        onChange={(e) => setData('account_number', e.target.value)}
                                    />
                                </div>

                                {/* Package / Plan Name */}
                                <div>
                                    <Label htmlFor="package_type">Package / Plan Name</Label>
                                    <Input
                                        id="package_type"
                                        value={data.package_type}
                                        onChange={(e) => setData('package_type', e.target.value)}
                                    />
                                </div>

                                {/* Bandwidth / Speed */}
                                <div>
                                    <Label htmlFor="bandwidth_speed">Bandwidth Speed</Label>
                                    <Input
                                        id="bandwidth_speed"
                                        value={data.bandwidth_speed}
                                        onChange={(e) => setData('bandwidth_speed', e.target.value)}
                                    />
                                </div>

                                {/* Billing Type */}
                                <div>
                                    <Label htmlFor="billing_type">Billing Type</Label>
                                    <Select
                                        value={data.billing_type}
                                        onValueChange={(val) => setData('billing_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Billing Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Postpaid">Postpaid</SelectItem>
                                            <SelectItem value="Prepaid">Prepaid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Monthly Cost */}
                                <div>
                                    <Label htmlFor="monthly_cost">Monthly Cost (ETB) <span className="text-rose-500">*</span></Label>
                                    <Input
                                        id="monthly_cost"
                                        type="number"
                                        step="0.01"
                                        value={data.monthly_cost}
                                        onChange={(e) => setData('monthly_cost', e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Location / Branch */}
                                <div>
                                    <Label htmlFor="branch_id">Assigned Branch</Label>
                                    <Select
                                        value={data.branch_id}
                                        onValueChange={(val) => setData('branch_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Department */}
                                <div>
                                    <Label htmlFor="department_id">Department</Label>
                                    <Select
                                        value={data.department_id}
                                        onValueChange={(val) => setData('department_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Static IP */}
                                <div>
                                    <Label htmlFor="ip_address">Static IP / Gateway IP</Label>
                                    <Input
                                        id="ip_address"
                                        value={data.ip_address}
                                        onChange={(e) => setData('ip_address', e.target.value)}
                                    />
                                </div>

                                {/* Installation Address */}
                                <div>
                                    <Label htmlFor="installation_address">Installation Site Address</Label>
                                    <Input
                                        id="installation_address"
                                        value={data.installation_address}
                                        onChange={(e) => setData('installation_address', e.target.value)}
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(val) => setData('status', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Suspended">Suspended</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                            <SelectItem value="Pending Installation">Pending Installation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Contract Start Date */}
                                <div>
                                    <Label htmlFor="contract_start_date">Contract Start Date</Label>
                                    <Input
                                        id="contract_start_date"
                                        type="date"
                                        value={data.contract_start_date}
                                        onChange={(e) => setData('contract_start_date', e.target.value)}
                                    />
                                </div>

                                {/* Contract Expiry Date */}
                                <div>
                                    <Label htmlFor="contract_expiry_date">Contract Expiry Date</Label>
                                    <Input
                                        id="contract_expiry_date"
                                        type="date"
                                        value={data.contract_expiry_date}
                                        onChange={(e) => setData('contract_expiry_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Equipment Details */}
                            <div>
                                <Label htmlFor="equipment_details">Router / Modem / CPE Details</Label>
                                <Textarea
                                    id="equipment_details"
                                    rows={2}
                                    value={data.equipment_details}
                                    onChange={(e) => setData('equipment_details', e.target.value)}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <Label htmlFor="notes">Notes / Additional Remarks</Label>
                                <Textarea
                                    id="notes"
                                    rows={2}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4">
                                <Link href="/telecom/broadbands">
                                    <Button variant="outline" type="button">Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="gap-1.5">
                                    <Save className="h-4 w-4" /> Update Connection
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
