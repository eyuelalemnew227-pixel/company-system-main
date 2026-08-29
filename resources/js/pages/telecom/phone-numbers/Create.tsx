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
type EmployeeOption = { id: number; first_name: string; last_name: string; employee_code: string };

type PageProps = {
    providers: Option[];
    branches: Option[];
    departments: Option[];
    employees: EmployeeOption[];
};

export default function PhoneNumbersCreate({ providers = [], branches = [], departments = [], employees = [] }: PageProps) {
    const { data, setData, post, processing, errors } = useForm({
        phone_number: '',
        account_number: '',
        sim_card_number: '',
        telecom_provider_id: '',
        service_type: 'Mobile Voice',
        package_type: '',
        monthly_cost: '0.00',
        billing_type: 'Postpaid',
        assigned_type: 'Unassigned',
        employee_id: '',
        branch_id: '',
        department_id: '',
        status: 'Active',
        issue_date: '',
        renewal_date: '',
        notes: '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/telecom/phone-numbers');
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Telecom Management', href: '/telecom/dashboard' },
                { title: 'Phone Numbers', href: '/telecom/phone-numbers' },
                { title: 'New Phone Line', href: '/telecom/phone-numbers/create' },
            ]}
        >
            <Head title="Add Company Phone Line" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Record Company Phone Line</h1>
                        <p className="text-sm text-muted-foreground">Add phone number, package details, billing, and user assignment.</p>
                    </div>
                    <Link href="/telecom/phone-numbers">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Back to List
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Phone Line Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Phone Number */}
                                <div>
                                    <Label htmlFor="phone_number">Phone Number <span className="text-rose-500">*</span></Label>
                                    <Input
                                        id="phone_number"
                                        value={data.phone_number}
                                        onChange={(e) => setData('phone_number', e.target.value)}
                                        placeholder="e.g. 0911234567 or +251911234567"
                                        required
                                    />
                                    {errors.phone_number && <p className="text-xs text-rose-500 mt-1">{errors.phone_number}</p>}
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
                                    {errors.telecom_provider_id && <p className="text-xs text-rose-500 mt-1">{errors.telecom_provider_id}</p>}
                                </div>

                                {/* Service Type */}
                                <div>
                                    <Label htmlFor="service_type">Service Type <span className="text-rose-500">*</span></Label>
                                    <Select
                                        value={data.service_type}
                                        onValueChange={(val) => setData('service_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Service Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Mobile Voice">Mobile Voice</SelectItem>
                                            <SelectItem value="Mobile Data">Mobile Data</SelectItem>
                                            <SelectItem value="Fixed Line">Fixed Line</SelectItem>
                                            <SelectItem value="CUG">CUG (Closed User Group)</SelectItem>
                                            <SelectItem value="Shortcode">SMS Shortcode</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.service_type && <p className="text-xs text-rose-500 mt-1">{errors.service_type}</p>}
                                </div>

                                {/* Package Type */}
                                <div>
                                    <Label htmlFor="package_type">Package / Plan Type</Label>
                                    <Input
                                        id="package_type"
                                        value={data.package_type}
                                        onChange={(e) => setData('package_type', e.target.value)}
                                        placeholder="e.g. Postpaid Enterprise Unlimited, Flexi 15GB"
                                    />
                                    {errors.package_type && <p className="text-xs text-rose-500 mt-1">{errors.package_type}</p>}
                                </div>

                                {/* Billing Type */}
                                <div>
                                    <Label htmlFor="billing_type">Billing Type</Label>
                                    <Select
                                        value={data.billing_type}
                                        onValueChange={(val) => setData('billing_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Billing Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Postpaid">Postpaid</SelectItem>
                                            <SelectItem value="Prepaid">Prepaid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.billing_type && <p className="text-xs text-rose-500 mt-1">{errors.billing_type}</p>}
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
                                    {errors.monthly_cost && <p className="text-xs text-rose-500 mt-1">{errors.monthly_cost}</p>}
                                </div>

                                {/* Account Number */}
                                <div>
                                    <Label htmlFor="account_number">Account / Contract Number</Label>
                                    <Input
                                        id="account_number"
                                        value={data.account_number}
                                        onChange={(e) => setData('account_number', e.target.value)}
                                        placeholder="Contract or billing account number"
                                    />
                                </div>

                                {/* SIM Serial / ICCID */}
                                <div>
                                    <Label htmlFor="sim_card_number">SIM Card Serial (ICCID)</Label>
                                    <Input
                                        id="sim_card_number"
                                        value={data.sim_card_number}
                                        onChange={(e) => setData('sim_card_number', e.target.value)}
                                        placeholder="Physical SIM Card serial"
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
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Suspended">Suspended</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Assignment Type */}
                                <div>
                                    <Label htmlFor="assigned_type">Assigned Target</Label>
                                    <Select
                                        value={data.assigned_type}
                                        onValueChange={(val) => setData('assigned_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Assigned to..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Unassigned">Unassigned / Pool</SelectItem>
                                            <SelectItem value="Employee">Employee</SelectItem>
                                            <SelectItem value="Branch">Branch / Site</SelectItem>
                                            <SelectItem value="Department">Department</SelectItem>
                                            <SelectItem value="Pool">Shared Pool</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Conditional Assignment Dropdowns */}
                                {data.assigned_type === 'Employee' && (
                                    <div>
                                        <Label htmlFor="employee_id">Assigned Employee</Label>
                                        <Select
                                            value={data.employee_id}
                                            onValueChange={(val) => setData('employee_id', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Employee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map((emp) => (
                                                    <SelectItem key={emp.id} value={String(emp.id)}>
                                                        {emp.first_name} {emp.last_name} ({emp.employee_code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {data.assigned_type === 'Branch' && (
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
                                )}

                                {data.assigned_type === 'Department' && (
                                    <div>
                                        <Label htmlFor="department_id">Assigned Department</Label>
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
                                )}

                                {/* Issue Date */}
                                <div>
                                    <Label htmlFor="issue_date">Issue Date</Label>
                                    <Input
                                        id="issue_date"
                                        type="date"
                                        value={data.issue_date}
                                        onChange={(e) => setData('issue_date', e.target.value)}
                                    />
                                </div>

                                {/* Renewal Date */}
                                <div>
                                    <Label htmlFor="renewal_date">Renewal / Expiry Date</Label>
                                    <Input
                                        id="renewal_date"
                                        type="date"
                                        value={data.renewal_date}
                                        onChange={(e) => setData('renewal_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <Label htmlFor="notes">Notes / Description</Label>
                                <Textarea
                                    id="notes"
                                    rows={3}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Add any additional remarks, PIN/PUK codes, terms..."
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4">
                                <Link href="/telecom/phone-numbers">
                                    <Button variant="outline" type="button">Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="gap-1.5">
                                    <Save className="h-4 w-4" /> Save Phone Line
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
