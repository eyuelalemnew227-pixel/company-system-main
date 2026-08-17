import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage, useForm, Link } from '@inertiajs/react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Budget', href: '/budget/bank-balances' },
    { title: 'Bank Balance', href: '/budget/bank-balances' },
    { title: 'Manage Bank Balance', href: '/budget/bank-balances' },
];

function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getFiscalWeekNumber(monday: Date, fiscalYearStartDate: Date): number {
    const anchor = getMondayOfWeek(fiscalYearStartDate);
    const diffMs = monday.getTime() - anchor.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

function toDateString(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function toMonthDayLabel(d: Date): string {
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getWeekDates(fyStartDateStr: string, monthStartDateStr: string, monthEndDateStr: string, weekNumber: number): string {
    if (!fyStartDateStr || !monthStartDateStr || !monthEndDateStr) return '';
    const pureFy = fyStartDateStr.split('T')[0];
    const fyStart = new Date(pureFy + 'T00:00:00');

    const pureStart = monthStartDateStr.split('T')[0];
    const pureEnd = monthEndDateStr.split('T')[0];
    const monthStart = new Date(pureStart + 'T00:00:00');
    const monthEnd = new Date(pureEnd + 'T00:00:00');
    let currentMonday = getMondayOfWeek(monthStart);

    while (currentMonday <= monthEnd) {
        const sunday = new Date(currentMonday);
        sunday.setDate(currentMonday.getDate() + 6);
        if (getFiscalWeekNumber(currentMonday, fyStart) === weekNumber) {
            return `(${toMonthDayLabel(currentMonday)} – ${toMonthDayLabel(sunday)})`;
        }
        currentMonday = new Date(currentMonday);
        currentMonday.setDate(currentMonday.getDate() + 7);
    }
    return '';
}

export default function BankBalances({ bankBalances, fiscalYears, fiscalMonths, banks, branches }: { bankBalances: any[], fiscalYears: any[], fiscalMonths: any[], banks: any[], branches: any[] }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [formBalances, setFormBalances] = useState<Record<string, { bank_id: number, bank_branch_id: number, amount: string, exchange_rate: string, currency: string }>>({});

    const [estimatedSales, setEstimatedSales] = useState('');

    const { data, setData, post, reset, clearErrors, transform, errors } = useForm({
        fiscal_year_id: '',
        fiscal_month_id: '',
        week_number: '',
        estimated_weekly_sales: '',
        balances: [] as any[],
    });

    useEffect(() => {
        if (flash?.message) {
            toast.success(flash.message);
        }
    }, [flash?.message]);

    useEffect(() => {
        const existing = bankBalances.filter(b =>
            String(b.fiscal_year_id) === data.fiscal_year_id &&
            String(b.fiscal_month_id) === data.fiscal_month_id &&
            String(b.week_number) === data.week_number
        );
        if (existing.length > 0 && existing[0].estimated_weekly_sale) {
            setEstimatedSales(existing[0].estimated_weekly_sale.amount.toString());
        } else {
            setEstimatedSales('');
        }
        const initialForm: any = {};
        existing.forEach(b => {
            initialForm[b.bank_branch_id] = {
                bank_id: b.bank_id,
                bank_branch_id: b.bank_branch_id,
                amount: b.amount,
                exchange_rate: b.exchange_rate,
                currency: b.currency
            };
        });
        setFormBalances(initialForm);
        setFormBalances(initialForm);
    }, [step, isOpen, data.fiscal_year_id, data.fiscal_month_id, data.week_number, bankBalances]);

    const groupedBalances = useMemo(() => {
        const groups: Record<string, any> = {};

        bankBalances.forEach(b => {
            if (
                (search && !(
                    (b.fiscal_year?.name && b.fiscal_year.name.toLowerCase().includes(search.toLowerCase())) ||
                    (b.fiscal_month?.name && b.fiscal_month.name.toLowerCase().includes(search.toLowerCase()))
                ))
            ) {
                return;
            }

            const key = `${b.fiscal_year_id}-${b.fiscal_month_id}-${b.week_number}`;
            if (!groups[key]) {
                groups[key] = {
                    id: b.id, // Representative ID for deletion
                    fiscal_year_id: b.fiscal_year_id,
                    fiscal_month_id: b.fiscal_month_id,
                    week_number: b.week_number,
                    fiscal_year: b.fiscal_year,
                    fiscal_month: b.fiscal_month,
                    estimated_weekly_sale: b.estimated_weekly_sale,
                    total_amount_base: 0
                };
            }
            groups[key].total_amount_base += (parseFloat(b.amount) || 0) * (parseFloat(b.exchange_rate) || 1);
        });

        return Object.values(groups).sort((a, b) => b.id - a.id);
    }, [bankBalances, search]);

    const filteredFiscalMonths = useMemo(() => {
        if (!data.fiscal_year_id) return [];
        return fiscalMonths.filter((fm) => String(fm.fiscal_year_id) === data.fiscal_year_id);
    }, [data.fiscal_year_id, fiscalMonths]);

    const weekOptions = useMemo(() => {
        if (!data.fiscal_year_id || !data.fiscal_month_id) return [];
        const fy = fiscalYears.find((y) => String(y.id) === data.fiscal_year_id);
        const fm = filteredFiscalMonths.find((m) => String(m.id) === data.fiscal_month_id);
        if (!fy?.gregorian_start_date || !fm?.gregorian_start_date || !fm?.gregorian_end_date) return [];

        const fyStart = new Date(fy.gregorian_start_date + 'T00:00:00');
        const monthStart = new Date(fm.gregorian_start_date + 'T00:00:00');
        const monthEnd = new Date(fm.gregorian_end_date + 'T00:00:00');

        let currentMonday = getMondayOfWeek(monthStart);
        const weeks = [];

        while (currentMonday <= monthEnd) {
            const sunday = new Date(currentMonday);
            sunday.setDate(currentMonday.getDate() + 6);

            const weekNumber = getFiscalWeekNumber(currentMonday, fyStart);

            weeks.push({
                weekNumber,
                startDate: toDateString(currentMonday),
                endDate: toDateString(sunday),
                label: `Week ${weekNumber} (${toMonthDayLabel(currentMonday)} – ${toMonthDayLabel(sunday)})`
            });

            currentMonday = new Date(currentMonday);
            currentMonday.setDate(currentMonday.getDate() + 7);
        }

        return weeks;
    }, [data.fiscal_year_id, data.fiscal_month_id, fiscalYears, fiscalMonths]);

    function handleAmountChange(branchId: number, bankId: number, bankCurrency: string, val: string) {
        setFormBalances(prev => ({
            ...prev,
            [branchId]: {
                ...(prev[branchId] || { bank_id: bankId, bank_branch_id: branchId, exchange_rate: '1.0000', currency: bankCurrency }),
                amount: val
            }
        }));
    }

    function handleRateChange(branchId: number, bankId: number, bankCurrency: string, val: string) {
        setFormBalances(prev => ({
            ...prev,
            [branchId]: {
                ...(prev[branchId] || { bank_id: bankId, bank_branch_id: branchId, amount: '', currency: bankCurrency }),
                exchange_rate: val
            }
        }));
    }

    function handleCurrencyChange(branchId: number, bankId: number, val: string) {
        setFormBalances(prev => ({
            ...prev,
            [branchId]: {
                ...(prev[branchId] || { bank_id: bankId, bank_branch_id: branchId, amount: '', exchange_rate: '1.0000' }),
                currency: val
            }
        }));
    }

    function handleOpenModal(balance: any = null) {
        clearErrors();
        if (balance) {
            setData({
                fiscal_year_id: balance.fiscal_year_id.toString(),
                fiscal_month_id: balance.fiscal_month_id.toString(),
                week_number: balance.week_number.toString(),
                estimated_weekly_sales: '',
                balances: []
            });
            setStep(2);
            setIsOpen(true);
        } else {
            setStep(1);
            setData({
                fiscal_year_id: '',
                fiscal_month_id: '',
                week_number: '',
                estimated_weekly_sales: '',
                balances: []
            });
            setEstimatedSales('');
            setFormBalances({});
            setIsOpen(true);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        transform((data) => ({
            ...data,
            estimated_weekly_sales: estimatedSales,
            balances: Object.values(formBalances)
                .filter(b => b.amount !== '' && parseFloat(b.amount) >= 0)
                .map(({ currency, ...rest }) => rest)
        }));
        post(route('bank-balances.store'), {
            onSuccess: () => {
                setIsOpen(false);
                setStep(1);
            },
        });
    }

    function handleDelete(id: number) {
        if (confirm('Are you sure you want to delete this ENTIRE weekly bank balance cohort? This will permanently remove all bank entries explicitly tied to this week.')) {
            router.delete(route('bank-balances.destroy', id));
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Bank Balance" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>Manage Bank Balance</CardTitle>
                        <div className="flex gap-2 items-center">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by bank, branch, period..."
                                className="w-64"
                            />
                            {can('manage bank balance') && (
                                <Button onClick={() => handleOpenModal()} variant="default">Record Balance</Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="font-bold text-white">#</TableHead>
                                    <TableHead className="font-bold text-white">Period</TableHead>
                                    <TableHead className="font-bold text-white">Week</TableHead>
                                    <TableHead className="font-bold text-white">Total Bank Balance (Base)</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedBalances.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">No bank balances found.</TableCell>
                                    </TableRow>
                                ) : (
                                    groupedBalances.map((group, index) => {
                                        const total = group.total_amount_base;
                                        return (
                                            <TableRow key={`${group.fiscal_year_id}-${group.fiscal_month_id}-${group.week_number}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>
                                                    {group.fiscal_year?.name} - {group.fiscal_month?.name}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">Week {group.week_number} <span className="text-xs text-slate-500">{getWeekDates(group.fiscal_year?.gregorian_start_date, group.fiscal_month?.gregorian_start_date, group.fiscal_month?.gregorian_end_date, group.week_number)}</span></TableCell>
                                                <TableCell className="font-bold">
                                                    {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Link href={route('bank-balances.show', group.id)}>
                                                            <Button variant="secondary" size="sm">
                                                                View
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOpenModal(group)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        {can('manage bank balance') && (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDelete(group.id)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) { setStep(1); setFormBalances({}); reset(); } }}>
                    <DialogContent className="max-w-[95vw] sm:max-w-6xl md:max-w-7xl overflow-x-hidden">
                        <DialogHeader>
                            <DialogTitle>{step === 1 ? 'Record Bank Balances - Step 1: Period' : 'Record Bank Balances - Step 2: Amounts'}</DialogTitle>
                        </DialogHeader>
                        {step === 1 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fiscal_year_id">Fiscal Year</Label>
                                        <Select
                                            value={data.fiscal_year_id}
                                            onValueChange={(val) => {
                                                setData(prev => ({
                                                    ...prev,
                                                    fiscal_year_id: val,
                                                    fiscal_month_id: '',
                                                    week_number: ''
                                                }));
                                            }}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                            <SelectContent>
                                                {fiscalYears.map((fy) => (
                                                    <SelectItem key={fy.id} value={fy.id.toString()}>{fy.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.fiscal_year_id && <p className="text-red-500 text-sm">{errors.fiscal_year_id}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fiscal_month_id">Fiscal Month</Label>
                                        <Select
                                            value={data.fiscal_month_id}
                                            onValueChange={(val) => setData('fiscal_month_id', val)}
                                            disabled={!data.fiscal_year_id || filteredFiscalMonths.length === 0}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={data.fiscal_year_id ? "Select Month" : "Select Year First"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredFiscalMonths.map((fm) => (
                                                    <SelectItem key={fm.id} value={fm.id.toString()}>{fm.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.fiscal_month_id && <p className="text-red-500 text-sm">{errors.fiscal_month_id}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="week_number">Budget Week</Label>
                                    <Select value={data.week_number} onValueChange={(val) => setData('week_number', val)} disabled={!data.fiscal_month_id || weekOptions.length === 0}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={data.fiscal_month_id ? "Select Budget Week" : "Select Month First"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {weekOptions.map((w) => (
                                                <SelectItem key={w.weekNumber} value={w.weekNumber.toString()}>{w.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.week_number && <p className="text-red-500 text-sm">{errors.week_number}</p>}
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setStep(1); reset(); }}>Cancel</Button>
                                    <Button type="button" onClick={() => setStep(2)} disabled={!data.fiscal_year_id || !data.fiscal_month_id || !data.week_number}>Next</Button>
                                </DialogFooter>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 w-full min-w-max">
                                            <TableRow>
                                                <TableHead>Bank</TableHead>
                                                <TableHead>Branch</TableHead>
                                                <TableHead>Currency</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Exchange Rate</TableHead>
                                                <TableHead>Difference</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {branches.map(branch => {
                                                const bank = banks.find(b => b.id === branch.bank_id);
                                                const bankCurrency = bank?.currency || 'ETB';
                                                const val = formBalances[branch.id] || { amount: '', exchange_rate: '1.0000', currency: bankCurrency };
                                                return (
                                                    <TableRow key={branch.id}>
                                                        <TableCell className="font-medium text-xs">{bank?.name}</TableCell>
                                                        <TableCell className="text-xs text-slate-600">{branch.name}</TableCell>
                                                        <TableCell className="text-xs font-bold text-slate-700">{bankCurrency}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number" step="0.01" value={val.amount}
                                                                onChange={(e) => handleAmountChange(branch.id, branch.bank_id, bankCurrency, e.target.value)}
                                                                placeholder="0.00"
                                                                className="h-8 text-sm min-w-32 w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number" step="0.0001" value={val.exchange_rate}
                                                                onChange={(e) => handleRateChange(branch.id, branch.bank_id, bankCurrency, e.target.value)}
                                                                className="h-8 text-sm min-w-28 w-full disabled:opacity-100 disabled:bg-slate-50 disabled:text-slate-500"
                                                                disabled={bankCurrency === 'ETB'}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-bold text-sm text-green-700 min-w-32">
                                                            {((parseFloat(val.amount) || 0) * (parseFloat(val.exchange_rate) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                {errors.balances && <p className="text-red-500 text-sm font-semibold">{errors.balances}</p>}
                                <div className="flex justify-start pt-4 border-t items-center space-x-4 pl-2">
                                    <Label htmlFor="estimated_sales" className="whitespace-nowrap text-lg">Estimated Weekly Sales:</Label>
                                    <div className="flex flex-col">
                                        <div className="relative">
                                            <Input
                                                id="estimated_sales"
                                                type="number" step="0.01"
                                                value={estimatedSales}
                                                onChange={e => setEstimatedSales(e.target.value)}
                                                placeholder="0.00"
                                                className="h-10 w-48 font-bold text-green-700 pr-12 text-lg"
                                                required
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 font-semibold text-slate-500 pointer-events-none">
                                                ETB
                                            </span>
                                        </div>
                                        {errors.estimated_weekly_sales && <p className="text-red-500 text-sm mt-1">{errors.estimated_weekly_sales}</p>}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                                    <Button type="submit">Save Balances</Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
