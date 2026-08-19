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
    let sumTotalETB = 0;
    let currentBalance = 0;

    sortedBalances.forEach(balance => {
        const amount = parseFloat(balance.amount) || 0;
        const rate = parseFloat(balance.exchange_rate) || 1;
        const currency = balance.bank?.currency || 'ETB';
        const subtotal = amount * rate;

        if (currency === 'ETB') {
            sumAmountETB += amount;
        }

        sumTotalETB += subtotal;

        if (currency !== 'USD' && currency !== 'EUR') {
            currentBalance += subtotal;
        }
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Bank Balance Detail" />
            <div className="h-[calc(100vh-4.2rem)] max-h-[calc(100vh-4.2rem)] overflow-hidden flex flex-col justify-between p-3 2xl:p-5 gap-1.5 2xl:gap-3 max-w-7xl mx-auto w-full rounded-xl">

                <div className="flex justify-between items-end pb-1.5 2xl:pb-2.5 border-b shrink-0">
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-base 2xl:text-lg font-bold leading-none">{rep.fiscal_year?.name} - {rep.fiscal_month?.name}</h1>
                        <p className="text-xs 2xl:text-sm font-medium text-slate-500">Week {rep.week_number} <span className="ml-1 text-slate-400 font-normal">{getWeekDates(rep.fiscal_year?.gregorian_start_date, rep.fiscal_month?.gregorian_start_date, rep.fiscal_month?.gregorian_end_date, rep.week_number)}</span></p>
                    </div>
                    {!isFromCeo && (
                        <Link href={route('bank-balances.index')}>
                            <Button variant="outline">Back to Manage</Button>
                        </Link>
                    )}
                </div>

                <div className="grid gap-1.5 2xl:gap-3 md:grid-cols-3 shrink-0">
                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-orange-500 rounded-lg">
                        <CardContent className="px-3 py-1 2xl:px-5 2xl:py-3 flex items-center justify-between">
                            <span className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Weekly Sales</span>
                            <div className="text-xs 2xl:text-base font-bold 2xl:font-extrabold text-gray-900 tracking-tight dark:text-slate-100">{estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] 2xl:text-xs font-semibold text-slate-400 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-blue-600 rounded-lg">
                        <CardContent className="px-3 py-1 2xl:px-5 2xl:py-3 flex items-center justify-between">
                            <span className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</span>
                            <div className="text-xs 2xl:text-base font-bold 2xl:font-extrabold text-gray-900 tracking-tight dark:text-slate-100">{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] 2xl:text-xs font-semibold text-slate-400 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-green-600 rounded-lg">
                        <CardContent className="px-3 py-1 2xl:px-5 2xl:py-3 flex items-center justify-between">
                            <span className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                TOTAL BALANCE <span className="text-[9px] 2xl:text-[10px] font-normal lowercase tracking-normal hidden lg:inline">(estimation + cur)</span>
                            </span>
                            <div className="text-xs 2xl:text-base font-bold 2xl:font-extrabold text-gray-900 tracking-tight dark:text-slate-100">{(estimatedValue + currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] 2xl:text-xs font-semibold text-slate-400 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="overflow-hidden flex-1 flex flex-col justify-between">
                    <CardContent className="p-0 flex-1">
                        <Table className="text-[11px] 2xl:text-xs leading-tight">
                            <TableHeader className="bg-slate-100 dark:bg-slate-800">
                                <TableRow>
                                    <TableHead className="py-1 2xl:py-2 px-3 2xl:px-4">Bank</TableHead>
                                    <TableHead className="py-1 2xl:py-2 px-3 2xl:px-4">Branch</TableHead>
                                    <TableHead className="py-1 2xl:py-2 px-3 2xl:px-4 text-right">Amount ETB</TableHead>
                                    <TableHead className="py-1 2xl:py-2 px-3 2xl:px-4 text-right">Foreign Amount</TableHead>
                                    <TableHead className="py-1 2xl:py-2 px-3 2xl:px-4">Currency</TableHead>
                                    <TableHead className="py-1 2xl:py-2 px-3 2xl:px-4">Exchange Rate</TableHead>
                                    <TableHead className="py-1 2xl:py-2 px-3 2xl:px-4 text-right pr-6">Total ETB</TableHead>
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
                                            <TableCell className="py-0.5 2xl:py-2 px-3 2xl:px-4 font-semibold">{balance.bank?.name}</TableCell>
                                            <TableCell className="py-0.5 2xl:py-2 px-3 2xl:px-4 text-slate-600">{balance.bank_branch?.name}</TableCell>
                                            <TableCell className="py-0.5 2xl:py-2 px-3 2xl:px-4 font-mono text-right">
                                                {isETB ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            </TableCell>
                                            <TableCell className="py-0.5 2xl:py-2 px-3 2xl:px-4 font-mono text-right">
                                                {!isETB ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            </TableCell>
                                            <TableCell className="py-0.5 2xl:py-2 px-3 2xl:px-4">
                                                <span className="inline-flex px-1.5 py-[2px] text-[9px] 2xl:text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-widest">{currency}</span>
                                            </TableCell>
                                            <TableCell className="py-0.5 2xl:py-2 px-3 2xl:px-4 font-mono">{rate.toFixed(4)}</TableCell>
                                            <TableCell className="py-0.5 2xl:py-2 px-3 2xl:px-4 font-mono font-bold text-green-700 text-right pr-6">
                                                {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            <TableFooter className="bg-slate-100 dark:bg-slate-800">
                                <TableRow>
                                    <TableCell colSpan={2} className="py-1 2xl:py-2 px-3 2xl:px-4 text-right font-bold">Totals</TableCell>
                                    <TableCell className="py-1 2xl:py-2 px-3 2xl:px-4 font-mono font-bold text-right">{sumAmountETB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="py-1 2xl:py-2 px-3 2xl:px-4 font-mono font-bold text-right text-slate-400">—</TableCell>
                                    <TableCell colSpan={2} className="py-1 2xl:py-2 px-3 2xl:px-4 text-right text-[10px] 2xl:text-xs font-bold text-slate-500 uppercase">Grand Total:</TableCell>
                                    <TableCell className="py-1 2xl:py-2 px-3 2xl:px-4 font-mono font-bold text-green-700 text-right pr-6">{sumTotalETB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
