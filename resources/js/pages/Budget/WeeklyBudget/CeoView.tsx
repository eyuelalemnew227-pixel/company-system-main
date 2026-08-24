import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSidebar } from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { computeCurrentBalance } from '@/lib/bank-balance';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Filter, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { usePopup } from '@/hooks/use-popup';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Weekly Budgets - CEO View', href: '/budget/weekly-budget/ceo', className: 'text-[1.3125rem] font-semibold' },
];

type BranchOption = { id: number; name: string; branch_code: string | null };
type DepartmentOption = { id: number; name: string };
type FiscalYearOption = { id: number; name: string; gregorian_start_date: string | null; gregorian_end_date: string | null };
type FiscalMonthOption = {
	id: number;
	name: string;
	fiscal_year_id: number;
	gregorian_start_date?: string | null;
	gregorian_end_date?: string | null;
};
type PaymentCategoryOption = { id: number; name: string };
type PaymentTypeOption = { id: number; name: string; payment_category_id: number };
type WeekOption = { weekNumber: number; startDate: string; endDate: string; label: string };

type WeeklyBudgetRow = {
	id: number;
	branch_id: number | null;
	fiscal_year_id: number;
	fiscal_month_id: number;
	branch: string | null;
	department: string | null;
	fiscal_year: string | null;
	fiscal_month: string | null;
	week_number: number;
	week_start_date: string | null;
	week_end_date: string | null;
	request_type: string;
	status_finance: string;
	status_department: string;
	status_ceo: string;
	amount: string | number;
	description: string | null;
	note: string | null;
	payment_category_id: number | null;
	payment_type_id: number | null;
};

interface WeeklyBudgetList extends Pagination {
	data: WeeklyBudgetRow[];
}

type DepartmentRequestedRow = {
	department_id: number | null;
	department: string;
	amount: number;
	urgent_amount: number;
	normal_amount: number;
};

type CeoProps = {
	items: WeeklyBudgetList;
	bankBalances: any[];
	branches: BranchOption[];
	departments: DepartmentOption[];
	paymentCategories: PaymentCategoryOption[];
	paymentTypes: PaymentTypeOption[];
	fiscalYears: FiscalYearOption[];
	fiscalMonths: FiscalMonthOption[];
	requestTypes: string[];
	statusCeos: string[];
	today: string;
	currentFiscalYearId?: number | null;
	currentFiscalMonthId?: number | null;
	request?: any;
	visibleTotal?: number;
	totalRequested?: number;
	urgentRequested?: number;
	normalRequested?: number;
	departmentRequested?: DepartmentRequestedRow[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number | null | undefined): string {
	const amount = Number(value ?? 0);
	return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isNaN(amount) ? 0 : amount);
}

function formatSummaryAmount(value: string | number | null | undefined): string {
	const amount = Number(value ?? 0);
	const rounded = Number.isNaN(amount) ? 0 : Math.ceil(amount);
	return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rounded);
}

function formatPercent2(value: number): string {
	return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

type SplitMetric = {
	label: string;
	amount: number;
	percent: number | null;
	tone: 'orange' | 'teal' | 'neutral';
};

function splitToneClasses(tone: 'orange' | 'teal' | 'neutral') {
	if (tone === 'orange') {
		return { dot: 'bg-orange-500', label: 'text-orange-500', value: 'text-orange-500' };
	}
	if (tone === 'teal') {
		return { dot: 'bg-[#134e4a] dark:bg-teal-400', label: 'text-[#134e4a] dark:text-teal-400', value: 'text-[#134e4a] dark:text-teal-400' };
	}
	return {
		dot: 'bg-slate-900 dark:bg-slate-50',
		label: 'text-slate-900 dark:text-slate-50 font-bold',
		value: 'text-slate-900 dark:text-slate-50',
	};
}

function VolumeMetricBlock({
	title,
	amount,
	action,
	amountNote,
	left,
	right,
}: {
	title: string;
	amount: number;
	action?: ReactNode;
	amountNote?: ReactNode;
	left: SplitMetric;
	right: SplitMetric;
}) {
	const leftTone = splitToneClasses(left.tone);
	const rightTone = splitToneClasses(right.tone);

	return (
		<div className="relative text-center">
			{action ? <div className="absolute top-0 right-0">{action}</div> : null}
			<div className="text-[13px] font-bold text-slate-900 dark:text-slate-50">{title}</div>
			<div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-1.5 text-[1.75rem] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
				<span>
					{formatSummaryAmount(amount)}
					<span className="ml-1.5 text-sm font-bold text-slate-900 dark:text-slate-50">ETB</span>
				</span>
				{amountNote}
			</div>
			<div className="mt-3 grid grid-cols-2">
				<div className="border-r border-slate-200 px-2 dark:border-slate-700">
					<div className={cn('flex items-center justify-center gap-1.5 text-[13px] font-medium', leftTone.label)}>
						<span className={cn('size-1.5 shrink-0 rounded-full', leftTone.dot)} />
						{left.label}
					</div>
					<div className={cn('mt-0.5 text-[13px] font-bold tabular-nums', leftTone.value)}>
						{formatSummaryAmount(left.amount)}
						{left.percent !== null && <span className="ml-1">({formatPercent2(left.percent)}%)</span>}
					</div>
				</div>
				<div className="px-2">
					<div className={cn('flex items-center justify-center gap-1.5 text-[13px] font-medium', rightTone.label)}>
						<span className={cn('size-1.5 shrink-0 rounded-full', rightTone.dot)} />
						{right.label}
					</div>
					<div className={cn('mt-0.5 text-[13px] font-bold tabular-nums', rightTone.value)}>
						{formatSummaryAmount(right.amount)}
						{right.percent !== null && <span className="ml-1">({formatPercent2(right.percent)}%)</span>}
					</div>
				</div>
			</div>
		</div>
	);
}

function parseDepartmentIds(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String).filter((id) => id !== '' && id !== 'all' && id !== 'none');
	if (typeof value === 'string' && value !== '' && value !== 'all' && value !== 'none') {
		return value
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id !== '');
	}
	return [];
}

const STATUS_COLOR_CLASSES: Record<string, string> = {
	pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
	approved: 'bg-green-50 text-green-700 border-green-200',
	rejected: 'bg-red-50 text-red-700 border-red-200',
	paid: 'bg-blue-50 text-blue-700 border-blue-200',
	'on-hold': 'bg-orange-50 text-orange-700 border-orange-200',
};

function statusColorClass(status: string) {
	return STATUS_COLOR_CLASSES[status] ?? 'border-slate-200 bg-slate-50 text-slate-700';
}

function CollapseSidebarOnMount() {
	const { open, setOpen, isMobile, setOpenMobile } = useSidebar();

	useEffect(() => {
		if (isMobile) {
			setOpenMobile(false);
			return;
		}

		const wasOpen = open;
		setOpen(false);

		return () => setOpen(wasOpen);
		// Collapse only when this page opens; restore the previous state when leaving.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return null;
}

function statusLabel(status: string) {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadge(status: string, _variant: 'ceo') {
	return (
		<span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm ${statusColorClass(status)}`}>
			{statusLabel(status)}
		</span>
	);
}

function requestTypeBadge(type: string) {
	const color = type === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200';
	return (
		<span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm ${color}`}>
			{type.charAt(0).toUpperCase() + type.slice(1)}
		</span>
	);
}

function isBranchEnabledForDepartment(department: DepartmentOption | null | undefined): boolean {
	if (!department) return false;
	const name = department.name.toLowerCase();
	return name.includes('operation') || name.includes('hr') || name.includes('human resource');
}

function getMondayOfWeek(d: Date): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(date.setDate(diff));
	monday.setHours(0, 0, 0, 0);
	return monday;
}

function toDateString(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function toMonthDayLabel(d: Date): string {
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getFiscalWeekNumber(monday: Date, fiscalYearStartDate: Date): number {
	const anchor = getMondayOfWeek(fiscalYearStartDate);
	const diffMs = monday.getTime() - anchor.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
	return Math.floor(diffDays / 7) + 1;
}

function buildCurrentFiscalYearWeeks(fiscalYear: FiscalYearOption, todayStr: string): WeekOption[] {
	if (!fiscalYear.gregorian_start_date || !fiscalYear.gregorian_end_date) return [];
	const fyStart = new Date(fiscalYear.gregorian_start_date + 'T00:00:00');
	const fyEnd = new Date(fiscalYear.gregorian_end_date + 'T00:00:00');
	const today = new Date(todayStr + 'T00:00:00');
	const cutoff = getMondayOfWeek(today);
	cutoff.setDate(cutoff.getDate() + 14);
	const weeks: WeekOption[] = [];
	let cursor = getMondayOfWeek(fyStart);
	while (cursor <= cutoff && cursor <= fyEnd) {
		const sunday = new Date(cursor);
		sunday.setDate(cursor.getDate() + 6);
		const weekNumber = getFiscalWeekNumber(cursor, fyStart);
		weeks.push({
			weekNumber,
			startDate: toDateString(cursor),
			endDate: toDateString(sunday),
			label: `Week ${weekNumber} (${toMonthDayLabel(cursor)} – ${toMonthDayLabel(sunday)})`,
		});
		cursor = new Date(cursor);
		cursor.setDate(cursor.getDate() + 7);
	}
	return weeks;
}

function buildFiscalYearAllWeeks(fiscalYear: FiscalYearOption): WeekOption[] {
	if (!fiscalYear.gregorian_start_date || !fiscalYear.gregorian_end_date) return [];
	const fyStart = new Date(fiscalYear.gregorian_start_date + 'T00:00:00');
	const fyEnd = new Date(fiscalYear.gregorian_end_date + 'T00:00:00');
	const weeks: WeekOption[] = [];
	let cursor = getMondayOfWeek(fyStart);
	while (cursor <= fyEnd) {
		const sunday = new Date(cursor);
		sunday.setDate(cursor.getDate() + 6);
		const weekNumber = getFiscalWeekNumber(cursor, fyStart);
		weeks.push({
			weekNumber,
			startDate: toDateString(cursor),
			endDate: toDateString(sunday),
			label: `Week ${weekNumber} (${toMonthDayLabel(cursor)} – ${toMonthDayLabel(sunday)})`,
		});
		cursor = new Date(cursor);
		cursor.setDate(cursor.getDate() + 7);
	}
	return weeks;
}

function buildFiscalMonthWeeks(fiscalYear: FiscalYearOption, fiscalMonth: FiscalMonthOption): WeekOption[] {
	if (!fiscalYear.gregorian_start_date || !fiscalMonth.gregorian_start_date || !fiscalMonth.gregorian_end_date) return [];
	const fyStart = new Date(fiscalYear.gregorian_start_date + 'T00:00:00');
	const monthStart = new Date(fiscalMonth.gregorian_start_date + 'T00:00:00');
	const monthEnd = new Date(fiscalMonth.gregorian_end_date + 'T00:00:00');
	const weeks: WeekOption[] = [];
	let cursor = getMondayOfWeek(monthStart);
	while (cursor <= monthEnd) {
		const sunday = new Date(cursor);
		sunday.setDate(cursor.getDate() + 6);
		const weekNumber = getFiscalWeekNumber(cursor, fyStart);
		weeks.push({
			weekNumber,
			startDate: toDateString(cursor),
			endDate: toDateString(sunday),
			label: `Week ${weekNumber} (${toMonthDayLabel(cursor)} – ${toMonthDayLabel(sunday)})`,
		});
		cursor = new Date(cursor);
		cursor.setDate(cursor.getDate() + 7);
	}
	return weeks;
}

// ─── Component ───────────────────────────────────────────────────────────────

function WeekBalanceDialogContent({ balances, estimatedSales, bankBalance, weeklyBalance }: { balances: any[], estimatedSales: number, bankBalance: number, weeklyBalance: number }) {
	const sortedBalances = useMemo(() => {
		return [...balances].sort((a, b) => {
			const nameA = a.bank?.name?.toLowerCase() || '';
			const nameB = b.bank?.name?.toLowerCase() || '';
			return nameA.localeCompare(nameB);
		});
	}, [balances]);

	let sumAmountETB = 0;
	let sumTotalETB = 0;

	sortedBalances.forEach((balance) => {
		const amount = parseFloat(balance.amount) || 0;
		const rate = parseFloat(balance.exchange_rate) || 1;
		const currency = balance.bank?.currency || 'ETB';
		const subtotal = amount * rate;

		if (currency === 'ETB') {
			sumAmountETB += amount;
		}

		sumTotalETB += subtotal;
	});

	return (
		<div className="flex flex-col gap-4 mt-2">
			<div className="grid gap-3 md:grid-cols-3 shrink-0">
				<Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-orange-500 rounded-lg py-0">
					<CardContent className="px-3 py-2 flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Weekly Sales</span>
						<div className="text-sm font-bold text-gray-900 tracking-tight dark:text-slate-100">
							{formatCurrency(estimatedSales)} <span className="text-[10px] font-semibold text-slate-400 ml-1">ETB</span>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-blue-600 rounded-lg py-0">
					<CardContent className="px-3 py-2 flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</span>
						<div className="text-sm font-bold text-gray-900 tracking-tight dark:text-slate-100">
							{formatCurrency(bankBalance)} <span className="text-[10px] font-semibold text-slate-400 ml-1">ETB</span>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-slate-50 border-none shadow-sm dark:bg-slate-900 border-l-4 border-l-green-600 rounded-lg py-0">
					<CardContent className="px-3 py-2 flex items-center justify-between">
						<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL BALANCE</span>
						<div className="text-sm font-bold text-gray-900 tracking-tight dark:text-slate-100">
							{formatCurrency(weeklyBalance)} <span className="text-[10px] font-semibold text-slate-400 ml-1">ETB</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="overflow-x-auto border rounded-md">
				<Table className="min-w-[720px] text-xs">
					<TableHeader className="bg-slate-100 dark:bg-slate-800">
						<TableRow>
							<TableHead className="h-auto px-3 py-2">Bank</TableHead>
							<TableHead className="h-auto px-3 py-2">Branch</TableHead>
							<TableHead className="h-auto px-3 py-2 text-right">Amount ETB</TableHead>
							<TableHead className="h-auto px-3 py-2 text-right">Foreign Amount</TableHead>
							<TableHead className="h-auto px-3 py-2">Currency</TableHead>
							<TableHead className="h-auto px-3 py-2">Exchange Rate</TableHead>
							<TableHead className="h-auto px-3 py-2 pr-6 text-right">Total ETB</TableHead>
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
								<TableRow key={balance.id} className="last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
									<TableCell className="px-3 py-2 font-semibold">{balance.bank?.name}</TableCell>
									<TableCell className="px-3 py-2 text-slate-600 dark:text-slate-400">{balance.bank_branch?.name}</TableCell>
									<TableCell className="px-3 py-2 text-right font-mono tabular-nums">
										{isETB ? formatCurrency(amount) : '0.00'}
									</TableCell>
									<TableCell className="px-3 py-2 text-right font-mono tabular-nums">
										{!isETB ? formatCurrency(amount) : '0.00'}
									</TableCell>
									<TableCell className="px-3 py-2">
										<span className="inline-flex rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-300">
											{currency}
										</span>
									</TableCell>
									<TableCell className="px-3 py-2 font-mono tabular-nums">
										{rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
									</TableCell>
									<TableCell className="px-3 py-2 pr-6 text-right font-mono font-bold text-green-700 dark:text-green-500 tabular-nums">
										{formatCurrency(subtotal)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
					<TableFooter className="bg-slate-100 dark:bg-slate-800">
						<TableRow>
							<TableCell colSpan={2} className="px-3 py-2 text-right font-bold">
								Totals
							</TableCell>
							<TableCell className="px-3 py-2 text-right font-mono font-bold tabular-nums">
								{formatCurrency(sumAmountETB)}
							</TableCell>
							<TableCell className="px-3 py-2 text-right font-mono font-bold text-slate-400">
								—
							</TableCell>
							<TableCell colSpan={2} className="px-3 py-2 text-right text-xs font-bold tracking-wide text-slate-500 uppercase">
								Grand Total:
							</TableCell>
							<TableCell className="px-3 py-2 pr-6 text-right font-mono font-bold text-green-700 dark:text-green-500 tabular-nums">
								{formatCurrency(sumTotalETB)} ETB
							</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			</div>
		</div>
	);
}

export default function WeeklyBudgetCeoView({
	items,
	branches,
	departments,
	paymentCategories,
	paymentTypes,
	fiscalYears,
	fiscalMonths,
	requestTypes,
	statusCeos,
	today,
	currentFiscalYearId,
	currentFiscalMonthId,
	request,
	visibleTotal = 0,
	totalRequested = 0,
	urgentRequested = 0,
	normalRequested = 0,
	departmentRequested = [],
}: CeoProps) {
	const { flash, errors, bankBalances = [] } = usePage<any>().props;
	const { triggerPopup, PopupComponent } = usePopup();
	const { can } = usePermission();
	const canManageCeo = can('manage ceo budgets');

	// ── Filter state ────────────────────────────────────────────────────────
	const [selectedRequestType, setSelectedRequestType] = useState<string>(request?.request_type ?? 'all');
	const [selectedStatusCeo, setSelectedStatusCeo] = useState<string>(request?.status_ceo ?? 'all');
	const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
	const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
	const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(
		request?.fiscal_year_id ?? (currentFiscalYearId ? String(currentFiscalYearId) : 'all'),
	);
	const [selectedFiscalMonth, setSelectedFiscalMonth] = useState<string>(
		request?.fiscal_month_id ?? (currentFiscalMonthId ? String(currentFiscalMonthId) : 'all'),
	);
	const currentWeekStartDate = useMemo(() => {
		const monday = getMondayOfWeek(new Date(today + 'T00:00:00'));
		return toDateString(monday);
	}, [today]);

	const [selectedWeekStartDate, setSelectedWeekStartDate] = useState<string>(
		request?.week_start_date ?? currentWeekStartDate ?? 'all',
	);
	const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<string>(request?.payment_category_id ?? 'all');
	const [selectedPaymentType, setSelectedPaymentType] = useState<string>(request?.payment_type_id ?? 'all');
	const [openBranchFilter, setOpenBranchFilter] = useState(false);
	const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);
	const [openPaymentTypeFilter, setOpenPaymentTypeFilter] = useState(false);
	const [checkedChartDepartments, setCheckedChartDepartments] = useState<Record<string, boolean>>({});
	const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string>(() => {
		if (request?.department_ids === 'none') return 'none';
		const ids = parseDepartmentIds(request?.department_ids);
		return ids.length > 0 ? ids.join(',') : 'all';
	});

	// ── Bulk action state ───────────────────────────────────────────────────
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [bulkStatus, setBulkStatus] = useState<string>('');
	const [savingStatusId, setSavingStatusId] = useState<number | null>(null);

	const selectedDepartmentOption = useMemo(
		() => (selectedDepartment === 'all' ? null : (departments.find((department) => String(department.id) === selectedDepartment) ?? null)),
		[selectedDepartment, departments],
	);
	const canFilterByBranch = useMemo(() => isBranchEnabledForDepartment(selectedDepartmentOption), [selectedDepartmentOption]);
	const selectedBranchOption = useMemo(
		() => (selectedBranch === 'all' ? null : (branches.find((branch) => String(branch.id) === selectedBranch) ?? null)),
		[selectedBranch, branches],
	);

	const filteredFiscalMonths = useMemo(() => {
		if (selectedFiscalYear === 'all') return fiscalMonths;
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === selectedFiscalYear);
	}, [fiscalMonths, selectedFiscalYear]);

	const filteredPaymentTypes = useMemo(() => {
		if (selectedPaymentCategory === 'all') return paymentTypes;
		return paymentTypes.filter((paymentType) => String(paymentType.payment_category_id) === selectedPaymentCategory);
	}, [paymentTypes, selectedPaymentCategory]);

	const weekFilterOptions = useMemo((): WeekOption[] => {
		if (selectedFiscalMonth !== 'all') {
			const fiscalYear = fiscalYears.find((year) => String(year.id) === selectedFiscalYear);
			const fiscalMonth = fiscalMonths.find((month) => String(month.id) === selectedFiscalMonth);
			return fiscalYear && fiscalMonth ? buildFiscalMonthWeeks(fiscalYear, fiscalMonth) : [];
		}
		if (selectedFiscalYear !== 'all') {
			const fiscalYear = fiscalYears.find((year) => String(year.id) === selectedFiscalYear);
			return fiscalYear ? buildFiscalYearAllWeeks(fiscalYear) : [];
		}
		if (currentFiscalYearId) {
			const fiscalYear = fiscalYears.find((year) => year.id === currentFiscalYearId);
			return fiscalYear ? buildCurrentFiscalYearWeeks(fiscalYear, today) : [];
		}
		return [];
	}, [selectedFiscalYear, selectedFiscalMonth, fiscalYears, fiscalMonths, currentFiscalYearId, today]);

	const balancesForSelectedWeek = useMemo(() => {
		const activeWeekNumber = weekFilterOptions.find((week) => week.startDate === selectedWeekStartDate)?.weekNumber;
		return bankBalances.filter((balance: any) => {
			if (activeWeekNumber && balance.week_number !== activeWeekNumber) return false;
			return true;
		});
	}, [bankBalances, selectedWeekStartDate, weekFilterOptions]);

	const estimatedSales = useMemo(() => {
		const seen = new Set<string>();
		let total = 0;
		balancesForSelectedWeek.forEach((balance: any) => {
			const sale = balance.estimated_weekly_sale;
			if (!sale) return;
			const key = String(sale.id ?? `${balance.fiscal_year_id}-${balance.fiscal_month_id}-${balance.week_number}`);
			if (seen.has(key)) return;
			seen.add(key);
			total += parseFloat(String(sale.amount ?? 0)) || 0;
		});
		return total;
	}, [balancesForSelectedWeek]);

	const bankBalance = useMemo(() => computeCurrentBalance(balancesForSelectedWeek), [balancesForSelectedWeek]);
	const weeklyBalance = estimatedSales + bankBalance;

	const weekBalanceDetailId = useMemo(() => {
		return balancesForSelectedWeek[0]?.id ?? null;
	}, [balancesForSelectedWeek]);

	const departmentShareRows = useMemo(() => {
		const balance = Number(weeklyBalance ?? 0);
		const maxAmount = Math.max(0, ...departmentRequested.map((row) => Number(row.amount ?? 0)));
		return departmentRequested
			.map((row) => ({
				...row,
				urgent_amount: Number(row.urgent_amount ?? 0),
				normal_amount: Number(row.normal_amount ?? 0),
				percent: balance > 0 ? (row.amount / balance) * 100 : 0,
				urgentPercentOfTotal: maxAmount > 0 ? (Number(row.urgent_amount ?? 0) / maxAmount) * 100 : 0,
				normalPercentOfTotal: maxAmount > 0 ? (Number(row.normal_amount ?? 0) / maxAmount) * 100 : 0,
			}))
			.sort((a, b) => b.amount - a.amount);
	}, [departmentRequested, weeklyBalance]);

	useEffect(() => {
		const requestedIds = parseDepartmentIds(request?.department_ids);
		const noneSelected = request?.department_ids === 'none';
		const singleId = request?.department_id && request.department_id !== 'all' ? String(request.department_id) : null;
		const selectedIdsFromRequest = noneSelected ? [] : requestedIds.length > 0 ? requestedIds : singleId ? [singleId] : null;

		setCheckedChartDepartments((previous) => {
			const next = { ...previous };
			departmentShareRows.forEach((row) => {
				const key = String(row.department_id ?? 'none');
				if (next[key] === undefined) {
					next[key] = selectedIdsFromRequest ? selectedIdsFromRequest.includes(key) : true;
				}
			});
			return next;
		});
	}, [departmentShareRows, request?.department_ids, request?.department_id]);

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (errors?.status_ceo) triggerPopup('Error', errors.status_ceo, 'error');
	}, [flash?.message, errors, triggerPopup]);

	const allSelectableIds = useMemo(() => {
		return items.data.filter((item) => item.status_finance !== 'paid').map((item) => item.id);
	}, [items.data]);

	const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.includes(id));
	const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

	function applyFilters(
		overrides: Record<string, string> = {},
		visitOptions: { only?: string[]; preserveScroll?: boolean } = {},
	) {
		const params: Record<string, string> = {
			fiscal_year_id: selectedFiscalYear,
			fiscal_month_id: selectedFiscalMonth,
		};
		if (selectedRequestType !== 'all') params.request_type = selectedRequestType;
		if (selectedStatusCeo !== 'all') params.status_ceo = selectedStatusCeo;
		if (selectedBranch !== 'all') params.branch_id = selectedBranch;
		if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
		if (selectedDepartmentIds !== 'all') params.department_ids = selectedDepartmentIds;
		if (selectedWeekStartDate !== 'all') params.week_start_date = selectedWeekStartDate;
		if (selectedPaymentCategory !== 'all') params.payment_category_id = selectedPaymentCategory;
		if (selectedPaymentType !== 'all') params.payment_type_id = selectedPaymentType;

		Object.assign(params, overrides);

		Object.keys(params).forEach((key) => {
			if (params[key] === 'all' && key !== 'fiscal_year_id' && key !== 'fiscal_month_id') {
				delete params[key];
			}
		});

		router.get('/budget/weekly-budget/ceo', params, {
			preserveState: true,
			replace: true,
			preserveScroll: visitOptions.preserveScroll ?? true,
			...(visitOptions.only ? { only: visitOptions.only } : {}),
		});
	}

	function clearFilters() {
		const fiscalYearId = currentFiscalYearId ? String(currentFiscalYearId) : 'all';
		const fiscalMonthId = currentFiscalMonthId ? String(currentFiscalMonthId) : 'all';
		setSelectedRequestType('all');
		setSelectedStatusCeo('all');
		setSelectedBranch('all');
		setSelectedDepartment('all');
		setSelectedDepartmentIds('all');
		setCheckedChartDepartments({});
		setSelectedFiscalYear(fiscalYearId);
		setSelectedFiscalMonth(fiscalMonthId);
		setSelectedWeekStartDate('all');
		setSelectedPaymentCategory('all');
		setSelectedPaymentType('all');
		router.get(
			'/budget/weekly-budget/ceo',
			{ fiscal_year_id: fiscalYearId, fiscal_month_id: fiscalMonthId, week_start_date: 'all' },
			{ preserveState: false, replace: true },
		);
	}

	function exportCsv() {
		if (items.data.length === 0) {
			triggerPopup('Error', 'No records found to export.', 'error');
			return;
		}
		const params: Record<string, string> = {
			fiscal_year_id: selectedFiscalYear,
			fiscal_month_id: selectedFiscalMonth,
		};
		if (selectedRequestType !== 'all') params.request_type = selectedRequestType;
		if (selectedStatusCeo !== 'all') params.status_ceo = selectedStatusCeo;
		if (selectedBranch !== 'all') params.branch_id = selectedBranch;
		if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
		if (selectedDepartmentIds !== 'all') params.department_ids = selectedDepartmentIds;
		if (selectedWeekStartDate !== 'all') params.week_start_date = selectedWeekStartDate;
		if (selectedPaymentCategory !== 'all') params.payment_category_id = selectedPaymentCategory;
		if (selectedPaymentType !== 'all') params.payment_type_id = selectedPaymentType;

		Object.keys(params).forEach((key) => {
			if (params[key] === 'all' && key !== 'fiscal_year_id' && key !== 'fiscal_month_id') {
				delete params[key];
			}
		});
		const queryString = new URLSearchParams(params).toString();
		window.location.href = `/budget/weekly-budget/ceo/export?${queryString}`;
	}

	const defaultWeekStartDate = request?.week_start_date ?? currentWeekStartDate ?? 'all';
	const hasActiveFilters =
		Boolean(request?.budget_id) ||
		selectedRequestType !== 'all' ||
		selectedStatusCeo !== 'all' ||
		selectedBranch !== 'all' ||
		selectedDepartment !== 'all' ||
		selectedDepartmentIds !== 'all' ||
		selectedFiscalYear !== (currentFiscalYearId ? String(currentFiscalYearId) : 'all') ||
		selectedFiscalMonth !== (currentFiscalMonthId ? String(currentFiscalMonthId) : 'all') ||
		selectedWeekStartDate !== defaultWeekStartDate ||
		selectedPaymentCategory !== 'all' ||
		selectedPaymentType !== 'all';

	function toggleSelectAll() {
		if (isAllSelected) setSelectedIds([]);
		else setSelectedIds(allSelectableIds);
	}

	function toggleSelectRow(id: number) {
		if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((i) => i !== id));
		else setSelectedIds([...selectedIds, id]);
	}

	function handleBulkUpdate() {
		if (!bulkStatus) return triggerPopup('Error', 'Select a status to apply.', 'error');
		if (selectedIds.length === 0) return triggerPopup('Error', 'Select at least one item.', 'error');

		router.patch(
			'/budget/weekly-budget/ceo/bulk',
			{
				ids: selectedIds,
				status_ceo: bulkStatus,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setSelectedIds([]);
					setBulkStatus('');
				},
			},
		);
	}

	// ── Edit helpers ─────────────────────────────────────────────────────────

	function updateCeoStatus(item: WeeklyBudgetRow, status: string) {
		if (status === item.status_ceo) return;

		setSavingStatusId(item.id);
		router.patch(
			`/budget/weekly-budget/${item.id}/ceo-status`,
			{ status_ceo: status },
			{
				preserveScroll: true,
				onFinish: () => setSavingStatusId(null),
			},
		);
	}


	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	function openWeekBalanceDetails() {
		if (!weekBalanceDetailId) {
			triggerPopup('Error', 'No bank balance details found for the selected week.', 'error');
			return;
		}
		setIsDetailsOpen(true);
	}

	function setChartDepartmentChecks(next: Record<string, boolean>) {
		departmentShareRows.forEach((row) => {
			const key = String(row.department_id ?? 'none');
			if (next[key] === undefined) next[key] = true;
		});
		setCheckedChartDepartments(next);

		const keys = departmentShareRows.map((row) => String(row.department_id ?? 'none'));
		const selected = keys.filter((key) => next[key] !== false && key !== 'none');
		const allChecked = keys.length > 0 && keys.every((key) => next[key] !== false);
		const tableOnly = { preserveScroll: true, only: ['items', 'visibleTotal', 'request'] };

		if (allChecked) {
			setSelectedDepartment('all');
			setSelectedDepartmentIds('all');
			applyFilters({ department_id: 'all', department_ids: 'all' }, tableOnly);
			return;
		}

		if (selected.length === 0) {
			setSelectedDepartment('all');
			setSelectedDepartmentIds('none');
			applyFilters({ department_id: 'all', department_ids: 'none' }, tableOnly);
			return;
		}

		if (selected.length === 1) {
			setSelectedDepartment(selected[0]);
			setSelectedDepartmentIds('all');
			applyFilters({ department_id: selected[0], department_ids: 'all' }, tableOnly);
			return;
		}

		setSelectedDepartment('all');
		setSelectedDepartmentIds(selected.join(','));
		applyFilters({ department_id: 'all', department_ids: selected.join(',') }, tableOnly);
	}

	const isAllChartDepartmentsSelected = useMemo(() => {
		const keys = departmentShareRows.map((row) => String(row.department_id ?? 'none'));
		return keys.length > 0 && keys.every((id) => checkedChartDepartments[id] !== false);
	}, [departmentShareRows, checkedChartDepartments]);

	function handleToggleAllChartDepartments(checked: boolean) {
		const keys = departmentShareRows.map((row) => String(row.department_id ?? 'none'));
		const next: Record<string, boolean> = { ...checkedChartDepartments };
		keys.forEach((key) => {
			next[key] = checked;
		});
		setChartDepartmentChecks(next);
	}

	function handleChartDepartmentToggle(key: string, checked: boolean) {
		setChartDepartmentChecks({
			...checkedChartDepartments,
			[key]: checked,
		});
	}

	const estimatedShareOfBalance = weeklyBalance > 0 ? (estimatedSales / weeklyBalance) * 100 : 0;
	const bankShareOfBalance = weeklyBalance > 0 ? (bankBalance / weeklyBalance) * 100 : 0;
	const urgentShareOfRequested = totalRequested > 0 ? (urgentRequested / totalRequested) * 100 : 0;
	const normalShareOfRequested = totalRequested > 0 ? (normalRequested / totalRequested) * 100 : 0;
	const requestedShareOfBalance = weeklyBalance > 0 ? (totalRequested / weeklyBalance) * 100 : null;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Weekly Budgets - CEO View" />
			<CollapseSidebarOnMount />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-4 pt-0 pb-4">
				<Card className="py-0">
					<CardHeader className="px-6 pt-2 pb-3">
						<CardTitle className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" /> Filters
						</CardTitle>
						<div className="pt-2">
							<div className="flex flex-wrap items-center gap-2 w-full px-4 py-3">
								<div className="w-auto">
									<Popover open={openDepartmentFilter} onOpenChange={setOpenDepartmentFilter}>
										<PopoverTrigger asChild>
											<Button variant="outline" role="combobox" className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 justify-between font-normal">
												<span className="text-left">
													{selectedDepartmentOption?.name
														?? (selectedDepartmentIds !== 'all' && selectedDepartmentIds !== 'none'
															? `${parseDepartmentIds(selectedDepartmentIds).length} Departments`
															: 'All Departments')}
												</span>
												<ChevronsUpDown className="ml-0.5 w-3 h-3 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search departments..." />
												<CommandList className="max-h-60">
													<CommandEmpty>No departments found.</CommandEmpty>
													<CommandGroup>
														<CommandItem
															value="All Departments"
															onSelect={() => {
																setSelectedDepartment('all');
																setSelectedDepartmentIds('all');
																setCheckedChartDepartments(
																	Object.fromEntries(
																		departmentShareRows.map((row) => [String(row.department_id ?? 'none'), true]),
																	),
																);
																setSelectedBranch('all');
																setSelectedWeekStartDate('all');
																setOpenDepartmentFilter(false);
																applyFilters({ department_id: 'all', department_ids: 'all', branch_id: 'all', week_start_date: 'all' });
															}}
														>
															<Check
																className={cn('mr-2 size-4', selectedDepartment === 'all' ? 'opacity-100' : 'opacity-0')}
															/>
															All Departments
														</CommandItem>
														{departments.map((department) => (
															<CommandItem
																key={department.id}
																value={department.name}
																onSelect={() => {
																	setSelectedDepartment(String(department.id));
																	setSelectedDepartmentIds('all');
																	setCheckedChartDepartments(
																		Object.fromEntries(
																			departmentShareRows.map((row) => [
																				String(row.department_id ?? 'none'),
																				String(row.department_id) === String(department.id),
																			]),
																		),
																	);
																	setSelectedBranch('all');
																	setSelectedWeekStartDate('all');
																	setOpenDepartmentFilter(false);
																	applyFilters({
																		department_id: String(department.id),
																		department_ids: 'all',
																		branch_id: 'all',
																		week_start_date: 'all',
																	});
																}}
															>
																<Check
																	className={cn(
																		'mr-2 size-4',
																		selectedDepartment === String(department.id) ? 'opacity-100' : 'opacity-0',
																	)}
																/>
																{department.name}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								<div className={cn("w-auto", !canFilterByBranch && 'cursor-not-allowed')}>
									<Popover open={openBranchFilter} onOpenChange={setOpenBranchFilter}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 justify-between font-normal"
												disabled={!canFilterByBranch}
											>
												<span className="text-left">{selectedBranchOption?.name ?? 'All Branches'}</span>
												<ChevronsUpDown className="ml-0.5 w-3 h-3 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search branches..." />
												<CommandList className="max-h-60">
													<CommandEmpty>No branches found.</CommandEmpty>
													<CommandGroup>
														<CommandItem
															value="All Branches"
															onSelect={() => {
																setSelectedBranch('all');
																setSelectedWeekStartDate('all');
																setOpenBranchFilter(false);
																applyFilters({ branch_id: 'all', week_start_date: 'all' });
															}}
														>
															<Check className={cn('mr-2 size-4', selectedBranch === 'all' ? 'opacity-100' : 'opacity-0')} />
															All Branches
														</CommandItem>
														{branches.map((branch) => (
															<CommandItem
																key={branch.id}
																value={branch.name}
																onSelect={() => {
																	setSelectedBranch(String(branch.id));
																	setSelectedWeekStartDate('all');
																	setOpenBranchFilter(false);
																	applyFilters({ branch_id: String(branch.id), week_start_date: 'all' });
																}}
															>
																<Check
																	className={cn(
																		'mr-2 size-4',
																		selectedBranch === String(branch.id) ? 'opacity-100' : 'opacity-0',
																	)}
																/>
																{branch.name}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								<div className="w-auto">
									<Select
										value={selectedFiscalYear}
										onValueChange={(value) => {
											setSelectedFiscalYear(value);
											setSelectedFiscalMonth('all');
											setSelectedWeekStartDate('all');
											applyFilters({ fiscal_year_id: value, fiscal_month_id: 'all', week_start_date: 'all' });
										}}
									>
										<SelectTrigger className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
											<SelectValue placeholder="Fiscal Year" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Years</SelectItem>
											{fiscalYears.map((year) => (
												<SelectItem key={year.id} value={String(year.id)}>
													{year.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="w-auto">
									<Select
										value={selectedFiscalMonth}
										onValueChange={(value) => {
											setSelectedFiscalMonth(value);
											setSelectedWeekStartDate('all');
											applyFilters({ fiscal_month_id: value, week_start_date: 'all' });
										}}
									>
										<SelectTrigger className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
											<SelectValue placeholder="Fiscal Month" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Months</SelectItem>
											{filteredFiscalMonths.map((month) => (
												<SelectItem key={month.id} value={String(month.id)}>
													{month.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="w-auto">
									<Select
										value={selectedWeekStartDate}
										onValueChange={(value) => {
											setSelectedWeekStartDate(value);
											applyFilters({ week_start_date: value });
										}}
									>
										<SelectTrigger className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
											<SelectValue placeholder="Select Week" />
										</SelectTrigger>
										<SelectContent>
											{weekFilterOptions.map((week) => (
												<SelectItem key={week.startDate} value={week.startDate}>
													{week.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="w-auto">
									<Select
										value={selectedRequestType}
										onValueChange={(value) => {
											setSelectedRequestType(value);
											applyFilters({ request_type: value });
										}}
									>
										<SelectTrigger className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
											<SelectValue placeholder="Request Type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Request Types</SelectItem>
											{requestTypes.map((requestType) => (
												<SelectItem key={requestType} value={requestType}>
													{requestType.charAt(0).toUpperCase() + requestType.slice(1)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="w-auto">
									<Select
										value={selectedStatusCeo}
										onValueChange={(value) => {
											setSelectedStatusCeo(value);
											applyFilters({ status_ceo: value });
										}}
									>
										<SelectTrigger className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
											<SelectValue placeholder="CEO Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Statuses</SelectItem>
											{statusCeos.map((s) => (
												<SelectItem key={s} value={s}>
													{s.charAt(0).toUpperCase() + s.slice(1)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="w-auto">
									<Select
										value={selectedPaymentCategory}
										onValueChange={(value) => {
											setSelectedPaymentCategory(value);
											setSelectedPaymentType('all');
											applyFilters({ payment_category_id: value, payment_type_id: 'all' });
										}}
									>
										<SelectTrigger className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
											<SelectValue placeholder="Payment Category" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Categories</SelectItem>
											{paymentCategories.map((category) => (
												<SelectItem key={category.id} value={String(category.id)}>
													{category.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="w-auto">
									<Popover open={openPaymentTypeFilter} onOpenChange={setOpenPaymentTypeFilter}>
										<PopoverTrigger asChild>
											<Button variant="outline" role="combobox" className="w-auto h-7 text-xs py-1 pl-2 pr-1 gap-0.5 justify-between font-normal">
												<span className="text-left">
													{selectedPaymentType === 'all'
														? 'All Payment Types'
														: (filteredPaymentTypes.find((paymentType) => String(paymentType.id) === selectedPaymentType)?.name ??
															'All Payment Types')}
												</span>
												<ChevronsUpDown className="ml-0.5 w-3 h-3 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[260px] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search payment types..." />
												<CommandList className="max-h-60">
													<CommandEmpty>No types found.</CommandEmpty>
													<CommandGroup>
														<CommandItem
															value="All Payment Types"
															onSelect={() => {
																setSelectedPaymentType('all');
																setOpenPaymentTypeFilter(false);
																applyFilters({ payment_type_id: 'all' });
															}}
														>
															<Check
																className={cn('mr-2 size-4', selectedPaymentType === 'all' ? 'opacity-100' : 'opacity-0')}
															/>
															All Payment Types
														</CommandItem>
														{filteredPaymentTypes.map((paymentType) => (
															<CommandItem
																key={paymentType.id}
																value={paymentType.name}
																onSelect={() => {
																	setSelectedPaymentType(String(paymentType.id));
																	setOpenPaymentTypeFilter(false);
																	applyFilters({ payment_type_id: String(paymentType.id) });
																}}
															>
																<Check
																	className={cn(
																		'mr-2 size-4',
																		selectedPaymentType === String(paymentType.id) ? 'opacity-100' : 'opacity-0',
																	)}
																/>
																{paymentType.name}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>

								{hasActiveFilters && (
									<div className="w-auto">
										<Button type="button" variant="secondary" className="w-auto h-7 text-xs py-1 px-2 whitespace-nowrap gap-0.5" onClick={clearFilters}>
											<X className="mr-0.5 w-3 h-3 shrink-0" /> Clear Filters
										</Button>
									</div>
								)}
							</div>
						</div>

						{request?.budget_id && (
							<div className="mt-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
								<span className="text-sm font-medium">
									Showing filtered result for <strong>Weekly Budget #{request.budget_id}</strong>
								</span>
								<Button
									size="sm"
									variant="outline"
									onClick={clearFilters}
									className="h-8 border-blue-300 bg-white text-xs font-semibold text-blue-900 hover:bg-blue-100 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-100"
								>
									<X className="mr-1 size-3" /> Show All Budgets
								</Button>
							</div>
						)}
					</CardHeader>
				</Card>

				<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
					<div className="xl:col-span-1">
						<Card className="h-full gap-0 bg-white py-0 shadow-md dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600">
							<CardContent className="flex h-full flex-col px-6 py-5">
								<VolumeMetricBlock
									title="Weekly Balance"
									amount={weeklyBalance}
									action={
										<>
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={weeklyBalance === 0}
												className="h-7 rounded-md border-blue-100 bg-blue-50 px-2.5 text-xs font-medium text-blue-700 shadow-none hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50 disabled:pointer-events-none dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/60"
												onClick={openWeekBalanceDetails}
											>
												See Details
											</Button>
											<Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
												<DialogContent className="!max-w-[95vw] !w-[90vw] xl:!w-[1200px] max-h-[90vh] overflow-hidden flex flex-col p-6">
													<DialogHeader className="shrink-0">
														<div className="flex items-center justify-between">
															<DialogTitle>Bank Balance Details</DialogTitle>
														</div>
													</DialogHeader>
													<div className="flex-1 overflow-y-auto min-h-0 pr-2">
														<WeekBalanceDialogContent 
															balances={balancesForSelectedWeek} 
															estimatedSales={estimatedSales}
															bankBalance={bankBalance}
															weeklyBalance={weeklyBalance}
														/>
													</div>
													<div className="flex justify-end shrink-0 mt-4">
														<DialogClose asChild>
															<Button variant="outline">Close</Button>
														</DialogClose>
													</div>
												</DialogContent>
											</Dialog>
										</>
									}
									left={{
										label: 'Estimated Sales',
										amount: estimatedSales,
										percent: weeklyBalance > 0 ? estimatedShareOfBalance : null,
										tone: 'neutral',
									}}
									right={{
										label: 'Bank Balance',
										amount: bankBalance,
										percent: weeklyBalance > 0 ? bankShareOfBalance : null,
										tone: 'neutral',
									}}
								/>

								<div className="mt-4">
									<div className="mb-2.5 h-px w-full bg-slate-200 dark:bg-slate-700" />
									<VolumeMetricBlock
										title="Requested Amount"
										amount={totalRequested}
										amountNote={
											requestedShareOfBalance !== null ? (
												<span className="text-sm font-bold text-slate-900 dark:text-slate-50">
													({formatPercent2(requestedShareOfBalance)}% of Balance)
												</span>
											) : undefined
										}
										left={{
											label: 'Urgent',
											amount: urgentRequested,
											percent: totalRequested > 0 ? urgentShareOfRequested : null,
											tone: 'orange',
										}}
										right={{
											label: 'Normal',
											amount: normalRequested,
											percent: totalRequested > 0 ? normalShareOfRequested : null,
											tone: 'teal',
										}}
									/>
								</div>

								<div className="mt-6">
									{departmentShareRows.length === 0 ? (
										<div className="py-6 text-center text-sm text-slate-500">
											No requests for the selected week.
										</div>
									) : (
										<div>
											<div className="mb-2 flex items-end gap-1.5">
												<Checkbox
													checked={isAllChartDepartmentsSelected}
													onCheckedChange={handleToggleAllChartDepartments}
													aria-label="Select all departments"
													className="shrink-0 mb-[1px] border-2 border-slate-400 dark:border-slate-500"
												/>
												<div className="flex min-w-0 flex-1 items-center gap-1.5">
													<span className="min-w-0 flex-1 text-xs font-bold text-slate-700 dark:text-slate-300">
														Select All
													</span>
													<span className="w-[6.25rem] shrink-0 text-right text-[11px] font-bold text-slate-900 dark:text-slate-50">
														Amount
													</span>
													<span className="w-[3.75rem] shrink-0 text-right text-[11px] font-bold whitespace-nowrap text-slate-900 dark:text-slate-50">
														% Bal
													</span>
												</div>
											</div>
											<div className="space-y-4">
												{departmentShareRows.map((row) => {
													const key = String(row.department_id ?? 'none');
													const isChecked = checkedChartDepartments[key] !== false;
													const urgentWidth = Math.max(row.urgentPercentOfTotal, 0);
													const normalWidth = Math.max(row.normalPercentOfTotal, 0);

													return (
														<div
															key={`${key}-${row.department}`}
															className={cn('flex items-start gap-1.5', !isChecked && 'opacity-45')}
														>
															<Checkbox
																checked={isChecked}
																onCheckedChange={(checked) => handleChartDepartmentToggle(key, checked === true)}
																aria-label={`Filter table by ${row.department}`}
																className="mt-[1.35rem] shrink-0 border-2 border-slate-400 dark:border-slate-500"
															/>
															<div className="min-w-0 flex-1">
																<div
																	className="mb-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400"
																	title={row.department}
																>
																	{row.department}
																</div>
																<div className="flex items-center gap-1.5">
																	<div className="flex h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
																		{urgentWidth > 0 && (
																			<div
																				className="h-full shrink-0 bg-orange-500"
																				style={{ width: `${urgentWidth}%` }}
																				title={`Urgent ${formatSummaryAmount(row.urgent_amount)}`}
																			/>
																		)}
																		{normalWidth > 0 && (
																			<div
																				className="h-full shrink-0 bg-[#134e4a] dark:bg-teal-400"
																				style={{ width: `${normalWidth}%` }}
																				title={`Normal ${formatSummaryAmount(row.normal_amount)}`}
																			/>
																		)}
																	</div>
																	<span className="w-[6.25rem] shrink-0 text-right text-sm font-bold leading-5 tabular-nums text-slate-900 dark:text-slate-100">
																		{formatSummaryAmount(row.amount)}
																	</span>
																	<span className="w-[3.75rem] shrink-0 text-right text-sm font-bold leading-5 tabular-nums text-slate-900 dark:text-slate-50">
																		{formatPercent2(row.percent)}%
																	</span>
																</div>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="min-w-0 xl:col-span-2">
						<Card className="gap-2 py-0 border-2 border-slate-300 dark:border-slate-600">
							<CardHeader className="px-6 py-3">
								<div className="flex items-center justify-between gap-3">
									<CardTitle>Weekly Budgets</CardTitle>
									<Button onClick={exportCsv} className="bg-green-600 text-white hover:bg-green-700">
										📥 Export CSV
									</Button>
								</div>
								<div className="mt-3 flex items-center gap-4">
									<span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter Status:</span>
									<div className="flex items-center gap-6">
										{['all', 'pending', 'approved', 'rejected'].map((status) => (
											<label key={status} className="flex items-center gap-2 cursor-pointer">
												<Checkbox
													checked={selectedStatusCeo === status}
													onCheckedChange={(checked) => {
														const newStatus = checked ? status : 'all';
														setSelectedStatusCeo(newStatus);
														applyFilters({ status_ceo: newStatus });
													}}
												/>
												<span className="text-sm capitalize text-slate-700 dark:text-slate-300">{status}</span>
											</label>
										))}
									</div>
								</div>
								{canManageCeo && (
									<div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2 dark:bg-slate-900">
										<span className="text-sm font-medium">Bulk Action ({selectedIds.length} selected):</span>
										<Select value={bulkStatus} onValueChange={setBulkStatus}>
											<SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
												<SelectValue placeholder="Select Status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="pending">Pending</SelectItem>
												<SelectItem value="approved">Approved</SelectItem>
												<SelectItem value="rejected">Rejected</SelectItem>
												<SelectItem value="on-hold">On Hold</SelectItem>
											</SelectContent>
										</Select>
										<Button onClick={handleBulkUpdate} disabled={selectedIds.length === 0 || !bulkStatus}>
											Apply Bulk Status
										</Button>
									</div>
								)}
							</CardHeader>
							<CardContent className="px-6 pb-4">
								<Table>
									<TableHeader className="bg-slate-500 dark:bg-slate-700">
										<TableRow>
											{canManageCeo && (
												<TableHead className="w-12 text-center text-white">
													<Checkbox
														checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
														onCheckedChange={toggleSelectAll}
														disabled={allSelectableIds.length === 0}
														aria-label="Select all"
														className="border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
													/>
												</TableHead>
											)}
											<TableHead className="font-bold text-white">Department</TableHead>
											<TableHead className="font-bold text-white">Branch</TableHead>
											<TableHead className="font-bold text-white">Request Type</TableHead>
											<TableHead className="w-0 whitespace-nowrap font-bold text-white">Status (CEO)</TableHead>
											<TableHead className="font-bold text-white">Description</TableHead>
											<TableHead className="font-bold text-white">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.data.map((item) => {
											const isEditable = canManageCeo && item.status_finance !== 'paid';
											const bothApproved = item.status_finance === 'approved' && item.status_department === 'approved';
											const isSavingStatus = savingStatusId === item.id;

											return (
												<TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
													{canManageCeo && (
														<TableCell className="text-center">
															<Checkbox
																checked={selectedIds.includes(item.id)}
																onCheckedChange={() => toggleSelectRow(item.id)}
																disabled={item.status_finance === 'paid'}
															/>
														</TableCell>
													)}
													<TableCell>{item.department ?? '-'}</TableCell>
													<TableCell>{item.branch ?? '-'}</TableCell>
													<TableCell>{requestTypeBadge(item.request_type)}</TableCell>

													<TableCell className="w-0 whitespace-nowrap">
														{canManageCeo ? (
															<Select
																value={item.status_ceo}
																onValueChange={(status) => updateCeoStatus(item, status)}
																disabled={!isEditable || isSavingStatus}
															>
																<SelectTrigger
																	className={cn(
																		'h-7 w-full min-w-0 rounded-full border px-2 text-[11px] font-bold shadow-sm',
																		statusColorClass(item.status_ceo),
																	)}
																>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	{statusCeos.map((status) => {
																		const cannotApprove = status === 'approved' && !bothApproved;
																		return (
																			<SelectItem
																				key={status}
																				value={status}
																				disabled={cannotApprove}
																				className={cn(
																					'my-0.5 rounded-full text-[11px] font-bold',
																					statusColorClass(status),
																					'focus:bg-inherit focus:text-inherit',
																				)}
																			>
																				{statusLabel(status)}
																			</SelectItem>
																		);
																	})}
																</SelectContent>
															</Select>
														) : (
															statusBadge(item.status_ceo, 'ceo')
														)}
													</TableCell>

													<TableCell className="whitespace-normal">
														<div className="max-w-xs text-sm text-slate-600 dark:text-slate-300">
															{item.description || '-'}
														</div>
													</TableCell>

													<TableCell className="whitespace-nowrap">{formatCurrency(item.amount)}</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
									<TableFooter>
										<TableRow className="bg-slate-200 dark:bg-slate-700">
											{canManageCeo && <TableCell />}
											<TableCell colSpan={5} className="text-right font-bold">
												Total
											</TableCell>
											<TableCell className="whitespace-nowrap font-bold">{formatCurrency(visibleTotal)}</TableCell>
										</TableRow>
									</TableFooter>
								</Table>

								<div className="mt-4">
									{items.data.length > 0 ? (
										<TablePagination total={items.total} from={items.from} to={items.to} links={items.links} />
									) : (
										<div className="flex w-full items-center justify-center py-8 text-slate-500">No content found.</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<PopupComponent />
		</AppLayout>
	);
}
