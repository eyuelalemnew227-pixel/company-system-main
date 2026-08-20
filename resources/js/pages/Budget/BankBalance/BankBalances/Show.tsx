import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { computeCurrentBalance } from '@/lib/bank-balance';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { usePermission } from '@/hooks/user-permissions';

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
    const { can } = usePermission();
    const canManageBankBalance = can('manage bank balance');
    const canViewCeo = can('view ceo budgets');
    const bankBalanceSectionHref = canManageBankBalance
        ? '/budget/bank-balances'
        : canViewCeo
            ? '/budget/weekly-budget/ceo'
            : '/budget/bank-balances';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Budget', href: bankBalanceSectionHref },
        { title: 'Bank Balance', href: bankBalanceSectionHref },
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
    const currentBalance = computeCurrentBalance(sortedBalances);

    sortedBalances.forEach(balance => {
        const amount = parseFloat(balance.amount) || 0;
        const rate = parseFloat(balance.exchange_rate) || 1;
        const currency = balance.bank?.currency || 'ETB';
        const subtotal = amount * rate;

        if (currency === 'ETB') {
            sumAmountETB += amount;
        }

        sumTotalETB += subtotal;
    });

    const formatMoney = (value: number) =>
        value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Bank Balance Detail" />
            <div className="flex flex-col p-3 2xl:p-5 gap-1.5 2xl:gap-3 max-w-7xl mx-auto w-full rounded-xl">

                <div className="flex justify-between items-end pb-1.5 2xl:pb-2.5 border-b shrink-0">
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-base 2xl:text-lg font-bold leading-none">{rep.fiscal_year?.name} - {rep.fiscal_month?.name}</h1>
                        <p className="text-xs 2xl:text-sm font-medium text-slate-500">Week {rep.week_number} <span className="ml-1 text-slate-400 font-normal">{getWeekDates(rep.fiscal_year?.gregorian_start_date, rep.fiscal_month?.gregorian_start_date, rep.fiscal_month?.gregorian_end_date, rep.week_number)}</span></p>
                    </div>
                    {canManageBankBalance && (
                        <Link href={route('bank-balances.index')}>
                            <Button variant="outline">Back to Manage</Button>
                        </Link>
                    )}
                </div>

                <div className="grid gap-1.5 2xl:gap-3 md:grid-cols-3 shrink-0">
                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-orange-500 rounded-lg py-0">
                        <CardContent className="px-3 py-1.5 flex items-center justify-between">
                            <span className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Weekly Sales</span>
                            <div className="text-xs 2xl:text-base font-bold 2xl:font-extrabold text-gray-900 tracking-tight dark:text-slate-100">{formatMoney(estimatedValue)} <span className="text-[10px] 2xl:text-xs font-semibold text-slate-400 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-blue-600 rounded-lg py-0">
                        <CardContent className="px-3 py-1.5 flex items-center justify-between">
                            <span className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</span>
                            <div className="text-xs 2xl:text-base font-bold 2xl:font-extrabold text-gray-900 tracking-tight dark:text-slate-100">{formatMoney(currentBalance)} <span className="text-[10px] 2xl:text-xs font-semibold text-slate-400 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-green-600 rounded-lg py-0">
                        <CardContent className="px-3 py-1.5 flex items-center justify-between">
                            <span className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                TOTAL BALANCE <span className="text-[9px] 2xl:text-[10px] font-normal lowercase tracking-normal hidden lg:inline">(estimation + cur)</span>
                            </span>
                            <div className="text-xs 2xl:text-base font-bold 2xl:font-extrabold text-gray-900 tracking-tight dark:text-slate-100">{formatMoney(estimatedValue + currentBalance)} <span className="text-[10px] 2xl:text-xs font-semibold text-slate-400 ml-1">ETB</span></div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="min-w-0 overflow-hidden py-0">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[720px] text-xs sm:text-sm">
                                <TableHeader className="bg-slate-100 dark:bg-slate-800">
                                    <TableRow>
                                        <TableHead className="h-auto px-3 pt-1 pb-2 sm:px-4">Bank</TableHead>
                                        <TableHead className="h-auto px-3 pt-1 pb-2 sm:px-4">Branch</TableHead>
                                        <TableHead className="h-auto px-3 pt-1 pb-2 text-right sm:px-4">Amount ETB</TableHead>
                                        <TableHead className="h-auto px-3 pt-1 pb-2 text-right sm:px-4">Foreign Amount</TableHead>
                                        <TableHead className="h-auto px-3 pt-1 pb-2 sm:px-4">Currency</TableHead>
                                        <TableHead className="h-auto px-3 pt-1 pb-2 sm:px-4">Exchange Rate</TableHead>
                                        <TableHead className="h-auto px-3 pt-1 pb-2 pr-6 text-right sm:px-4">Total ETB</TableHead>
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
                                                <TableCell className="px-3 py-2 font-semibold sm:px-4">{balance.bank?.name}</TableCell>
                                                <TableCell className="px-3 py-2 text-slate-600 sm:px-4">{balance.bank_branch?.name}</TableCell>
                                                <TableCell className="px-3 py-2 text-right font-mono tabular-nums sm:px-4">
                                                    {isETB ? formatMoney(amount) : '0.00'}
                                                </TableCell>
                                                <TableCell className="px-3 py-2 text-right font-mono tabular-nums sm:px-4">
                                                    {!isETB ? formatMoney(amount) : '0.00'}
                                                </TableCell>
                                                <TableCell className="px-3 py-2 sm:px-4">
                                                    <span className="inline-flex rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-300">
                                                        {currency}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-3 py-2 font-mono tabular-nums sm:px-4">{rate.toFixed(4)}</TableCell>
                                                <TableCell className="px-3 py-2 pr-6 text-right font-mono font-bold text-green-700 tabular-nums sm:px-4">
                                                    {formatMoney(subtotal)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                                <TableFooter className="bg-slate-100 dark:bg-slate-800">
                                    <TableRow>
                                        <TableCell colSpan={2} className="px-3 py-2 text-right font-bold sm:px-4">
                                            Totals
                                        </TableCell>
                                        <TableCell className="px-3 py-2 text-right font-mono font-bold tabular-nums sm:px-4">
                                            {formatMoney(sumAmountETB)}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 text-right font-mono font-bold text-slate-400 sm:px-4">
                                            —
                                        </TableCell>
                                        <TableCell colSpan={2} className="px-3 py-2 text-right text-xs font-bold tracking-wide text-slate-500 uppercase sm:px-4">
                                            Grand Total:
                                        </TableCell>
                                        <TableCell className="px-3 py-2 pr-6 text-right font-mono font-bold text-green-700 tabular-nums sm:px-4">
                                            {formatMoney(sumTotalETB)} ETB
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
