import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Calendar, Save } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Option = { id: number; name: string };

type PageProps = {
    providers: Option[];
    branches: Option[];
    departments: Option[];
};

export default function BroadbandsCreate({ providers = [], branches = [], departments = [] }: PageProps) {
    const [durationMonths, setDurationMonths] = useState<number>(1);

    const { data, setData, post, processing, errors } = useForm({
        connection_name: '',
        account_number: '',
        service_number: '',
        connection_type: 'WTTx (Fixed Wireless)',
        telecom_provider_id: '',
        package_type: '',
        package_start_date: '',
        package_expiry_date: '',
        bandwidth_speed: '',
        monthly_cost: '0.00',
        billing_type: 'Postpaid',
        branch_id: '',
        department_id: '',
        installation_address: '',
        ip_address: '',
        equipment_details: '',
        contract_start_date: '',
        contract_expiry_date: '',
        status: 'Active',
        notes: '',
    });

    const calculateExpiryDate = (startDateStr: string, months: number) => {
        if (!startDateStr) return '';
        const d = new Date(startDateStr);
        if (isNaN(d.getTime())) return '';
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
    };

    const handleStartDateChange = (startDateStr: string) => {
        const calculatedExpiry = calculateExpiryDate(startDateStr, durationMonths);
        setData((prev) => ({
            ...prev,
            package_start_date: startDateStr,
            package_expiry_date: calculatedExpiry || prev.package_expiry_date,
            contract_start_date: startDateStr,
            contract_expiry_date: calculatedExpiry || prev.contract_expiry_date,
        }));
    };

    const handleDurationChange = (months: number) => {
        setDurationMonths(months);
        if (data.package_start_date) {
            const calculatedExpiry = calculateExpiryDate(data.package_start_date, months);
            setData((prev) => ({
                ...prev,
                package_expiry_date: calculatedExpiry,
                contract_expiry_date: calculatedExpiry,
            }));
        }
    };

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/telecom/broadbands');
    }

    const formattedBranches = branches.map((b) => ({
        id: String(b.id),
        name: b.name,
    }));

    const formattedDepartments = departments.map((d) => ({
        id: String(d.id),
        name: d.name,
    }));

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Telecom Management', href: '/telecom/dashboard' },
                { title: 'Broadband & WTTx', href: '/telecom/broadbands' },
                { title: 'New Broadband / WTTx', href: '/telecom/broadbands/create' },
            ]}
        >
            <Head title="Record Broadband / WTTx Connection" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Record Broadband / WTTx / Data SIM Connection</h1>
                        <p className="text-sm text-muted-foreground">Add WTTx, Data SIM, Fiber, Leased line internet connections and equipment.</p>
                    </div>
                    <Link href="/telecom/broadbands">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Back to List
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Connection & Contract Information</CardTitle>
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
                                        placeholder="e.g. Head Office WTTx, Bole Branch Fiber, Region 1 Data SIM"
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
                                            <SelectItem value="WTTx (Fixed Wireless)">WTTx (Fixed Wireless 4G/5G)</SelectItem>
                                            <SelectItem value="Data Sim Card">Data SIM Card</SelectItem>
                                            <SelectItem value="Fiber Broadband (FTTH/FTTB)">Fiber Broadband (FTTH/FTTB)</SelectItem>
                                            <SelectItem value="ADSL / Copper Broadband">ADSL / Copper Broadband</SelectItem>
                                            <SelectItem value="Dedicated Leased Line">Dedicated Leased Line</SelectItem>
                                            <SelectItem value="VSAT Satellite">VSAT Satellite</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Service Number */}
                                <div>
                                    <Label htmlFor="service_number">Service Number / SIM Phone Number</Label>
                                    <Input
                                        id="service_number"
                                        value={data.service_number}
                                        onChange={(e) => setData('service_number', e.target.value)}
                                        placeholder="e.g. 0911XXXXXX or SIM Line No."
                                    />
                                </div>

                                {/* Account / Service ID */}
                                <div>
                                    <Label htmlFor="account_number">Account / Circuit ID</Label>
                                    <Input
                                        id="account_number"
                                        value={data.account_number}
                                        onChange={(e) => setData('account_number', e.target.value)}
                                        placeholder="e.g. Service or Contract Circuit ID"
                                    />
                                </div>

                                {/* Telecom Provider */}
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

                                {/* Location / Branch (Searchable) */}
                                <div className="space-y-1">
                                    <Label htmlFor="branch_id">Search & Select Assigned Branch</Label>
                                    <SearchableSelect
                                        options={formattedBranches}
                                        value={data.branch_id}
                                        onValueChange={(val) => setData('branch_id', val)}
                                        placeholder="Search branch name..."
                                        searchPlaceholder="Search branch..."
                                        className="w-full bg-white dark:bg-slate-950"
                                    />
                                </div>

                                {/* Package / Plan Name */}
                                <div>
                                    <Label htmlFor="package_type">Package / Plan Name</Label>
                                    <Input
                                        id="package_type"
                                        value={data.package_type}
                                        onChange={(e) => setData('package_type', e.target.value)}
                                        placeholder="e.g. Business Fiber Premium, WTTx Unlimited"
                                    />
                                </div>

                                {/* Bandwidth / Speed */}
                                <div>
                                    <Label htmlFor="bandwidth_speed">Bandwidth Speed</Label>
                                    <Input
                                        id="bandwidth_speed"
                                        value={data.bandwidth_speed}
                                        onChange={(e) => setData('bandwidth_speed', e.target.value)}
                                        placeholder="e.g. 20 Mbps, 50 Mbps, 100 Mbps"
                                    />
                                </div>

                                {/* Package Start Date */}
                                <div>
                                    <Label htmlFor="package_start_date" className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-400">
                                        <Calendar className="h-4 w-4" /> Package Start Date
                                    </Label>
                                    <Input
                                        id="package_start_date"
                                        type="date"
                                        value={data.package_start_date}
                                        onChange={(e) => handleStartDateChange(e.target.value)}
                                        className="mt-1 border-purple-300 dark:border-purple-800"
                                    />
                                </div>

                                {/* Package Duration Selector */}
                                <div>
                                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Package Duration</Label>
                                    <Select
                                        value={String(durationMonths)}
                                        onValueChange={(val) => handleDurationChange(parseInt(val, 10))}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select Duration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 Month (+30 Days)</SelectItem>
                                            <SelectItem value="3">3 Months</SelectItem>
                                            <SelectItem value="6">6 Months</SelectItem>
                                            <SelectItem value="12">1 Year (12 Months)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Calculated Package Expire Date */}
                                <div>
                                    <Label htmlFor="package_expiry_date" className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                                        <Calendar className="h-4 w-4" /> Package Expire Date
                                    </Label>
                                    <Input
                                        id="package_expiry_date"
                                        type="date"
                                        value={data.package_expiry_date}
                                        onChange={(e) => setData('package_expiry_date', e.target.value)}
                                        className="mt-1 border-emerald-300 dark:border-emerald-800 font-semibold"
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Calculated based on start date & duration</p>
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

                                {/* Department (Searchable) */}
                                <div className="space-y-1">
                                    <Label htmlFor="department_id">Search & Select Department</Label>
                                    <SearchableSelect
                                        options={formattedDepartments}
                                        value={data.department_id}
                                        onValueChange={(val) => setData('department_id', val)}
                                        placeholder="Search department name..."
                                        searchPlaceholder="Search department..."
                                        className="w-full bg-white dark:bg-slate-950"
                                    />
                                </div>

                                {/* Static IP */}
                                <div>
                                    <Label htmlFor="ip_address">Static IP / Gateway IP</Label>
                                    <Input
                                        id="ip_address"
                                        value={data.ip_address}
                                        onChange={(e) => setData('ip_address', e.target.value)}
                                        placeholder="e.g. 197.156.xx.xx"
                                    />
                                </div>

                                {/* Installation Address */}
                                <div>
                                    <Label htmlFor="installation_address">Installation Site Address</Label>
                                    <Input
                                        id="installation_address"
                                        value={data.installation_address}
                                        onChange={(e) => setData('installation_address', e.target.value)}
                                        placeholder="Physical location / Building / Floor"
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
                            </div>

                            {/* Equipment Details */}
                            <div>
                                <Label htmlFor="equipment_details">Router / Modem / CPE Details</Label>
                                <Textarea
                                    id="equipment_details"
                                    rows={2}
                                    value={data.equipment_details}
                                    onChange={(e) => setData('equipment_details', e.target.value)}
                                    placeholder="Modem Model, Serial Number, MAC Address..."
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
                                    <Save className="h-4 w-4" /> Save Connection
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
