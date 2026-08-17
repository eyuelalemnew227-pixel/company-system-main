import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

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

export default function Show({ periodBalances, representative }: { periodBalances: any[], representative: any }) {
    const isFromCeo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'ceo';

    const breadcrumbs: BreadcrumbItem[] = isFromCeo
        ? [
            { title: 'Budget', href: '/budget/weekly-budget/ceo' },
            { title: 'CEO Dashboard', href: '/budget/weekly-budget/ceo' },
            { title: 'View Detail', href: '#' },
        ]
        : [
            { title: 'Budget', href: '/budget/bank-balances' },
            { title: 'Bank Balance', href: '/budget/bank-balances' },
            { title: 'View Detail', href: '#' },
        ];

    const estimatedValue = periodBalances.length > 0 && periodBalances[0].estimated_weekly_sale ? parseFloat(periodBalances[0].estimated_weekly_sale.amount) : 0;

    const rep = periodBalances.length > 0 ? periodBalances[0] : representative;

    const sortedBalances = [...periodBalances].sort((a, b) => {
        const nameA = a.bank?.name?.toLowerCase() || '';
        const nameB = b.bank?.name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
    });

    let sumAmountETB = 0;
    let sumForeignAmount = 0;
    let sumTotalETB = 0;
    let currentBalance = 0;

    sortedBalances.forEach(balance => {
        const amount = parseFloat(balance.amount) || 0;
        const rate = parseFloat(balance.exchange_rate) || 1;
        const currency = balance.bank?.currency || 'ETB';
        const subtotal = amount * rate;

        if (currency === 'ETB') {
            sumAmountETB += amount;
        } else {
            sumForeignAmount += amount;
        }

        sumTotalETB += subtotal;

        if (currency !== 'USD' && currency !== 'EUR') {
            currentBalance += subtotal;
        }
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Bank Balance Detail" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4 max-w-7xl mx-auto w-full">

                <div className="flex justify-between items-end pb-2 border-b">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{rep.fiscal_year?.name} - {rep.fiscal_month?.name}</h1>
                        <p className="text-xl text-slate-500 font-semibold mt-1">Week {rep.week_number} <span className="ml-2 text-slate-400 font-normal">{getWeekDates(rep.fiscal_year?.gregorian_start_date, rep.fiscal_month?.gregorian_start_date, rep.fiscal_month?.gregorian_end_date, rep.week_number)}</span></p>
                    </div>
                    {!isFromCeo && (
                        <Link href={route('bank-balances.index')}>
                            <Button variant="outline">Back to Manage</Button>
                        </Link>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Estimated Weekly Sales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xl font-medium text-slate-500 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-blue-600">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xl font-medium text-slate-500 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-green-600">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                TOTAL BALANCE <span className="text-xs font-normal lowercase tracking-normal">(estimation + current balance)</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{(estimatedValue + currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xl font-medium text-slate-500 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Cohort Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead className="text-right">Amount ETB</TableHead>
                                    <TableHead className="text-right">Foreign Amount</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead>Exchange Rate</TableHead>
                                    <TableHead className="text-right pr-6">Total ETB</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedBalances.map((balance) => {
                                    const amount = parseFloat(balance.amount) || 0;
                                    const rate = parseFloat(balance.exchange_rate) || 1;
                                    const subtotal = amount * rate;
                                    const currency = balance.bank?.currency || 'ETB';
                                    const isETB = currency === 'ETB';
                                    return (
                                        <TableRow key={balance.id} className="last:border-0 hover:bg-slate-50">
                                            <TableCell className="font-semibold">{balance.bank?.name}</TableCell>
                                            <TableCell className="text-slate-600">{balance.bank_branch?.name}</TableCell>
                                            <TableCell className="font-mono text-sm text-right">
                                                {isETB ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-right">
                                                {!isETB ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-widest">{currency}</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{rate.toFixed(4)}</TableCell>
                                            <TableCell className="font-mono font-bold text-green-700 text-sm text-right pr-6">
                                                {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            <TableFooter className="bg-slate-100 dark:bg-slate-800">
                                <TableRow>
                                    <TableCell colSpan={2} className="text-right font-bold">Totals</TableCell>
                                    <TableCell className="font-mono font-bold text-sm text-right">{sumAmountETB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="font-mono font-bold text-sm text-right">{sumForeignAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell colSpan={2} className="text-right text-xs font-bold text-slate-500 uppercase">Grand Total:</TableCell>
                                    <TableCell className="font-mono font-bold text-green-700 text-sm text-right pr-6">{sumTotalETB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
