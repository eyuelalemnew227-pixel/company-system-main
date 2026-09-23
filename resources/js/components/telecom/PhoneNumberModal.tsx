import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useForm } from '@inertiajs/react';
import { Calendar, Loader2, Phone } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface OptionItem {
    id: number;
    name: string;
}

export interface EmployeeItem {
    id: number;
    first_name: string;
    last_name: string;
    employee_code?: string;
}

export interface PhoneNumberRecord {
    id?: number;
    phone_number: string;
    account_number?: string;
    sim_card_number?: string;
    telecom_provider_id?: number | string;
    service_type: string;
    package_type?: string;
    package_start_date?: string;
    package_expiry_date?: string;
    monthly_cost: number | string;
    billing_type: string;
    assigned_type: string;
    employee_id?: number | string;
    branch_id?: number | string;
    department_id?: number | string;
    status: string;
    issue_date?: string;
    renewal_date?: string;
    notes?: string;
}

interface PhoneNumberModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: PhoneNumberRecord | null;
    providers: OptionItem[];
    branches: OptionItem[];
    departments: OptionItem[];
    employees: EmployeeItem[];
    onSuccessCallback?: () => void;
}

export default function PhoneNumberModal({
    open,
    onOpenChange,
    initialData,
    providers,
    branches,
    departments,
    employees,
    onSuccessCallback,
}: PhoneNumberModalProps) {
    const isEdit = !!initialData?.id;
    const [durationMonths, setDurationMonths] = useState<number>(1);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        phone_number: '',
        account_number: '',
        sim_card_number: '',
        telecom_provider_id: '',
        service_type: 'Mobile',
        package_type: '',
        package_start_date: '',
        package_expiry_date: '',
        monthly_cost: 0,
        billing_type: 'Postpaid',
        assigned_type: 'Employee',
        employee_id: '',
        branch_id: '',
        department_id: '',
        status: 'Active',
        issue_date: '',
        renewal_date: '',
        notes: '',
    });

    useEffect(() => {
        if (initialData) {
            setData({
                phone_number: initialData.phone_number || '',
                account_number: initialData.account_number || '',
                sim_card_number: initialData.sim_card_number || '',
                telecom_provider_id: String(initialData.telecom_provider_id || ''),
                service_type: initialData.service_type || 'Mobile',
                package_type: initialData.package_type || '',
                package_start_date: initialData.package_start_date || '',
                package_expiry_date: initialData.package_expiry_date || initialData.renewal_date || '',
                monthly_cost: Number(initialData.monthly_cost) || 0,
                billing_type: initialData.billing_type || 'Postpaid',
                assigned_type: initialData.assigned_type || 'Employee',
                employee_id: String(initialData.employee_id || ''),
                branch_id: String(initialData.branch_id || ''),
                department_id: String(initialData.department_id || ''),
                status: initialData.status || 'Active',
                issue_date: initialData.issue_date || '',
                renewal_date: initialData.renewal_date || '',
                notes: initialData.notes || '',
            } as any);
        } else {
            reset();
        }
    }, [initialData, open]);

    // Automatically set package_expiry_date whenever package_start_date or durationMonths changes
    useEffect(() => {
        if (data.package_start_date) {
            const calculatedExpiry = calculateExpiryDate(data.package_start_date, durationMonths || 1);
            if (calculatedExpiry && calculatedExpiry !== data.package_expiry_date) {
                setData((prev) => ({
                    ...prev,
                    package_expiry_date: calculatedExpiry,
                    renewal_date: calculatedExpiry,
                }));
            }
        }
    }, [data.package_start_date, durationMonths]);

    const calculateExpiryDate = (startDateStr: string, months: number = 1) => {
        if (!startDateStr) return '';
        const d = new Date(startDateStr);
        if (isNaN(d.getTime())) return '';
        d.setMonth(d.getMonth() + (months || 1));
        return d.toISOString().split('T')[0];
    };

    const handleStartDateChange = (startDateStr: string) => {
        const calculatedExpiry = calculateExpiryDate(startDateStr, durationMonths || 1);
        setData((prev) => ({
            ...prev,
            package_start_date: startDateStr,
            package_expiry_date: calculatedExpiry || prev.package_expiry_date,
            renewal_date: calculatedExpiry || prev.renewal_date,
        }));
    };

    const handleDurationChange = (months: number) => {
        setDurationMonths(months);
        if (data.package_start_date) {
            const calculatedExpiry = calculateExpiryDate(data.package_start_date, months);
            setData((prev) => ({
                ...prev,
                package_expiry_date: calculatedExpiry,
                renewal_date: calculatedExpiry,
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                onOpenChange(false);
                reset();
                if (onSuccessCallback) onSuccessCallback();
            },
        };

        if (isEdit && initialData?.id) {
            put(`/telecom/phone-numbers/${initialData.id}`, options);
        } else {
            post('/telecom/phone-numbers', options);
        }
    };

    const formattedEmployees = employees.map((emp) => ({
        id: String(emp.id),
        name: `${emp.employee_code ? `[${emp.employee_code}] ` : ''}${emp.first_name} ${emp.last_name}`,
    }));

    const formattedBranches = branches.map((b) => ({
        id: String(b.id),
        name: b.name,
    }));

    const formattedDepartments = departments.map((d) => ({
        id: String(d.id),
        name: d.name,
    }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-4xl max-h-[90vh] overflow-y-auto"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <Phone className="h-5 w-5 text-blue-600" />
                        {isEdit ? 'Edit Phone Line' : 'Add New Phone Line / SIM'}
                    </DialogTitle>
                </DialogHeader>
                <hr />

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="phone_number">Phone Number <span className="text-destructive">*</span></Label>
                            <Input
                                id="phone_number"
                                placeholder="e.g. +251 91 123 4567"
                                value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value)}
                                className="mt-1"
                            />
                            <InputError message={errors.phone_number} />
                        </div>

                        <div>
                            <Label htmlFor="telecom_provider_id">Telecom Provider</Label>
                            <select
                                id="telecom_provider_id"
                                value={data.telecom_provider_id}
                                onChange={(e) => setData('telecom_provider_id', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="">Select Provider...</option>
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.telecom_provider_id} />
                        </div>

                        <div>
                            <Label htmlFor="account_number">Account / Contract No.</Label>
                            <Input
                                id="account_number"
                                placeholder="e.g. ACC-88942"
                                value={data.account_number}
                                onChange={(e) => setData('account_number', e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="sim_card_number">SIM Card / ICCID Number</Label>
                            <Input
                                id="sim_card_number"
                                placeholder="89251..."
                                value={data.sim_card_number}
                                onChange={(e) => setData('sim_card_number', e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="service_type">Service Type <span className="text-destructive">*</span></Label>
                            <select
                                id="service_type"
                                value={data.service_type}
                                onChange={(e) => setData('service_type', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="Mobile">Mobile SIM</option>
                                <option value="Fixed Line">Fixed Landline</option>
                                <option value="CDMA">CDMA</option>
                                <option value="Toll Free">Toll Free</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="package_type">Package / Rate Plan</Label>
                            <Input
                                id="package_type"
                                placeholder="e.g. Unlimited Postpaid 1000 ETB"
                                value={data.package_type}
                                onChange={(e) => setData('package_type', e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        {/* Package Start Date */}
                        <div>
                            <Label htmlFor="package_start_date" className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                                <Calendar className="h-4 w-4" /> Package Start Date
                            </Label>
                            <Input
                                id="package_start_date"
                                type="date"
                                value={data.package_start_date}
                                onChange={(e) => handleStartDateChange(e.target.value)}
                                className="mt-1 border-blue-300 dark:border-blue-800"
                            />
                            <InputError message={errors.package_start_date} />
                        </div>

                        {/* Package Duration Selector */}
                        <div>
                            <Label className="font-semibold text-slate-700 dark:text-slate-300">Package Duration</Label>
                            <select
                                value={durationMonths}
                                onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value={1}>1 Month (+30 Days)</option>
                                <option value={3}>3 Months</option>
                                <option value={6}>6 Months</option>
                                <option value={12}>1 Year (12 Months)</option>
                            </select>
                        </div>

                        {/* Calculated Expire Date */}
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
                            <InputError message={errors.package_expiry_date} />
                        </div>

                        <div>
                            <Label htmlFor="monthly_cost">Monthly Cost (ETB) <span className="text-destructive">*</span></Label>
                            <Input
                                id="monthly_cost"
                                type="number"
                                step="0.01"
                                value={data.monthly_cost}
                                onChange={(e) => setData('monthly_cost', parseFloat(e.target.value) || 0)}
                                className="mt-1 font-mono"
                            />
                            <InputError message={errors.monthly_cost} />
                        </div>

                        <div>
                            <Label htmlFor="billing_type">Billing Type <span className="text-destructive">*</span></Label>
                            <select
                                id="billing_type"
                                value={data.billing_type}
                                onChange={(e) => setData('billing_type', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="Postpaid">Postpaid</option>
                                <option value="Prepaid">Prepaid</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                            <select
                                id="status"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Pending">Pending Assignment</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="assigned_type">Assigned To <span className="text-destructive">*</span></Label>
                            <select
                                id="assigned_type"
                                value={data.assigned_type}
                                onChange={(e) => setData('assigned_type', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="Employee">Specific Employee</option>
                                <option value="Branch">Branch / Office</option>
                                <option value="Department">Department</option>
                                <option value="Unassigned">Unassigned / Reserve</option>
                            </select>
                        </div>

                        {data.assigned_type === 'Employee' && (
                            <div className="col-span-1 md:col-span-2 space-y-1">
                                <Label htmlFor="employee_id">Search & Select Employee</Label>
                                <SearchableSelect
                                    options={formattedEmployees}
                                    value={data.employee_id}
                                    onValueChange={(val) => setData('employee_id', val)}
                                    placeholder="Type to search employee name or code..."
                                    searchPlaceholder="Search employee..."
                                    className="w-full"
                                />
                                <InputError message={errors.employee_id} />
                            </div>
                        )}

                        {data.assigned_type === 'Branch' && (
                            <div className="col-span-1 md:col-span-2 space-y-1">
                                <Label htmlFor="branch_id">Search & Select Branch</Label>
                                <SearchableSelect
                                    options={formattedBranches}
                                    value={data.branch_id}
                                    onValueChange={(val) => setData('branch_id', val)}
                                    placeholder="Type to search branch..."
                                    searchPlaceholder="Search branch..."
                                    className="w-full"
                                />
                                <InputError message={errors.branch_id} />
                            </div>
                        )}

                        {data.assigned_type === 'Department' && (
                            <div className="col-span-1 md:col-span-2 space-y-1">
                                <Label htmlFor="department_id">Search & Select Department</Label>
                                <SearchableSelect
                                    options={formattedDepartments}
                                    value={data.department_id}
                                    onValueChange={(val) => setData('department_id', val)}
                                    placeholder="Type to search department..."
                                    searchPlaceholder="Search department..."
                                    className="w-full"
                                />
                                <InputError message={errors.department_id} />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing} className="gap-1.5">
                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>{isEdit ? 'Save Changes' : 'Add Phone Line'}</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
