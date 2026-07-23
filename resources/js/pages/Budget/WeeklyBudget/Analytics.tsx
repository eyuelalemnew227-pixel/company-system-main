import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router } from '@inertiajs/react';
import { useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Weekly Budgets', href: '/budget/weekly-budget' },
	{ title: 'Analytics', href: '/budget/weekly-budget/analytics' },
];

type FiscalYearOption = {
	id: number;
	name: string;
	gregorian_start_date?: string;
	gregorian_end_date?: string;
};

type FiscalMonthOption = {
	id: number;
	name: string;
	fiscal_year_id: number;
	gregorian_start_date?: string;
	gregorian_end_date?: string;
};

type MatrixRow = {
	id: number;
	fiscal_year: string | null;
	fiscal_month: string | null;
	week_number: number;
	budget_category: string | null;
	budget_type: string | null;
	amount: number;
	status_department: string;
	status_finance: string;
	status_ceo: string;
};

interface MatrixData extends Pagination {
	data: MatrixRow[];
}

type Kpis = {
	totalRequested: number;
	totalApproved: number;
	pendingFinanceCount: number;
	pendingFinanceAmount: number;
	pendingCeoCount: number;
	pendingCeoAmount: number;
};

type AnalyticsProps = {
	counts: {
		ceo_not_paid: number;
		dept_not_finance: number;
		finance_not_ceo: number;
	};
	kpis: Kpis;
	matrixData: MatrixData;
	fiscalYears: FiscalYearOption[];
	fiscalMonths: FiscalMonthOption[];
	filters: {
		fiscal_year_id?: string;
		fiscal_month_id?: string;
		week_start_date?: string;
		use_case?: string;
	};
};

function formatCurrency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

// Status badge — mirrors the pattern used in Finance.tsx / Index.tsx / DepartmentView.tsx
function statusBadge(status: string) {
	const colorMap: Record<string, string> = {
		pending: 'bg-amber-50 text-amber-600 border-amber-200',
		approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
		rejected: 'bg-red-50 text-red-600 border-red-200',
		paid: 'bg-blue-50 text-blue-700 border-blue-200',
		'on-hold': 'bg-purple-50 text-purple-600 border-purple-200',
		on_hold: 'bg-purple-50 text-purple-600 border-purple-200',
		onhold: 'bg-purple-50 text-purple-600 border-purple-200',
	};
	const cls = colorMap[status?.toLowerCase()] ?? 'bg-slate-50 text-slate-600 border-slate-200';
	const label = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : '—';
	return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function toDateString(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toMonthDayLabel(d: Date): string {
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getMondayOfWeek(d: Date): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(date.setDate(diff));
	monday.setHours(0, 0, 0, 0);
	return monday;
}

function getFiscalWeekNumber(date: Date, fyStart: Date): number {
	const msPerWeek = 7 * 24 * 60 * 60 * 1000;
	const startMonday = getMondayOfWeek(fyStart);
	const targetMonday = getMondayOfWeek(date);
	const diffMs = targetMonday.getTime() - startMonday.getTime();
	return Math.floor(diffMs / msPerWeek) + 1;
}

type WeekOption = {
	weekNumber: number;
	startDate: string;
	endDate: string;
	label: string;
};

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

export default function Analytics({ counts, kpis, matrixData, fiscalYears, fiscalMonths, filters }: AnalyticsProps) {
	const handleFilterChange = (key: string, value: string) => {
		router.get(
			route('weekly-budget.analytics'),
			{
				...filters,
				[key]: value === 'all' ? undefined : value,
				...(key === 'fiscal_year_id' ? { fiscal_month_id: undefined, week_start_date: undefined } : {}),
				...(key === 'fiscal_month_id' ? { week_start_date: undefined } : {}),
			},
			{ preserveState: true, preserveScroll: true, replace: true },
		);
	};

	const handleUseCaseClick = (useCase: string) => {
		const newValue = filters.use_case === useCase ? undefined : useCase;
		handleFilterChange('use_case', newValue || 'all');
	};

	const filteredMonths = useMemo(() => {
		if (!filters.fiscal_year_id) return fiscalMonths;
		return fiscalMonths.filter((m) => m.fiscal_year_id.toString() === filters.fiscal_year_id);
	}, [fiscalMonths, filters.fiscal_year_id]);

	const weekFilterOptions = useMemo((): WeekOption[] => {
		const hasYear = filters.fiscal_year_id && filters.fiscal_year_id !== 'all';
		const hasMonth = filters.fiscal_month_id && filters.fiscal_month_id !== 'all';

		if (hasYear && hasMonth) {
			const fy = fiscalYears.find((y) => String(y.id) === filters.fiscal_year_id);
			const fm = fiscalMonths.find((m) => String(m.id) === filters.fiscal_month_id);
			if (fy && fm) return buildFiscalMonthWeeks(fy, fm);
			return [];
		}

		if (hasYear) {
			const fy = fiscalYears.find((y) => String(y.id) === filters.fiscal_year_id);
			if (fy) return buildFiscalYearAllWeeks(fy);
			return [];
		}

		return [];
	}, [fiscalMonths, fiscalYears, filters.fiscal_month_id, filters.fiscal_year_id]);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Summary Analytics" />

			<div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 md:gap-6 md:p-6 lg:gap-8 lg:p-8">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold tracking-tight">Summary Analytics</h1>
				</div>

				{/* Filters */}
				<Card>
					<CardContent className="flex flex-wrap gap-4 p-4">
						<div className="min-w-[200px] flex-1">
							<Select value={filters.fiscal_year_id || 'all'} onValueChange={(v) => handleFilterChange('fiscal_year_id', v)}>
								<SelectTrigger>
									<SelectValue placeholder="Fiscal Year" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Fiscal Years</SelectItem>
									{fiscalYears.map((fy) => (
										<SelectItem key={fy.id} value={fy.id.toString()}>
											{fy.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="min-w-[200px] flex-1">
							<Select
								value={filters.fiscal_month_id || 'all'}
								onValueChange={(v) => handleFilterChange('fiscal_month_id', v)}
								disabled={!filters.fiscal_year_id}
							>
								<SelectTrigger>
									<SelectValue placeholder="Fiscal Month" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Months</SelectItem>
									{filteredMonths.map((fm) => (
										<SelectItem key={fm.id} value={fm.id.toString()}>
											{fm.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="min-w-[200px] flex-1">
							<Select value={filters.week_start_date || 'all'} onValueChange={(v) => handleFilterChange('week_start_date', v)}>
								<SelectTrigger>
									<SelectValue placeholder="Fiscal Week" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Weeks</SelectItem>
									{weekFilterOptions.map((w) => (
										<SelectItem key={w.startDate} value={w.startDate}>
											{w.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				{/* ── KPI Cards ─────────────────────────────────────────────────────── */}
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{/* Total Requested */}
					<Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg">
						<div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
						<div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-white/10" />
						<CardHeader className="px-5 pt-5 pb-1">
							<CardTitle className="text-xs font-semibold tracking-wider text-indigo-100 uppercase">Total Requested</CardTitle>
						</CardHeader>
						<CardContent className="px-5 pb-5">
							<p className="text-2xl leading-tight font-bold">{formatCurrency(kpis.totalRequested)}</p>
							<p className="mt-1 text-xs text-indigo-200">All budgets in period</p>
						</CardContent>
					</Card>

					{/* Total Approved (CEO) */}
					<Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
						<div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
						<div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-white/10" />
						<CardHeader className="px-5 pt-5 pb-1">
							<CardTitle className="text-xs font-semibold tracking-wider text-emerald-100 uppercase">Total Approved</CardTitle>
						</CardHeader>
						<CardContent className="px-5 pb-5">
							<p className="text-2xl leading-tight font-bold">{formatCurrency(kpis.totalApproved)}</p>
							<p className="mt-1 text-xs text-emerald-200">CEO approved</p>
						</CardContent>
					</Card>

					{/* Pending Finance */}
					<Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg">
						<div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
						<div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-white/10" />
						<CardHeader className="px-5 pt-5 pb-1">
							<CardTitle className="text-xs font-semibold tracking-wider text-amber-100 uppercase">Pending Finance</CardTitle>
						</CardHeader>
						<CardContent className="px-5 pb-5">
							<p className="text-2xl leading-tight font-bold">{formatCurrency(kpis.pendingFinanceAmount)}</p>
							<p className="mt-1 text-xs text-amber-200">
								{kpis.pendingFinanceCount} {kpis.pendingFinanceCount === 1 ? 'request' : 'requests'} waiting on Finance
							</p>
						</CardContent>
					</Card>

					{/* Pending CEO */}
					<Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg">
						<div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
						<div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-white/10" />
						<CardHeader className="px-5 pt-5 pb-1">
							<CardTitle className="text-xs font-semibold tracking-wider text-rose-100 uppercase">Pending CEO</CardTitle>
						</CardHeader>
						<CardContent className="px-5 pb-5">
							<p className="text-2xl leading-tight font-bold">{formatCurrency(kpis.pendingCeoAmount)}</p>
							<p className="mt-1 text-xs text-rose-200">
								{kpis.pendingCeoCount} {kpis.pendingCeoCount === 1 ? 'request' : 'requests'} waiting on CEO
							</p>
						</CardContent>
					</Card>
				</div>

				{/* ── Status Summary Cards (clickable) ─────────────────────────────── */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card
						className={`cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md ${filters.use_case === 'ceo_not_paid' ? 'ring-2 ring-primary' : ''}`}
						onClick={() => handleUseCaseClick('ceo_not_paid')}
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-xs font-medium">CEO Approved, Not Paid</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{counts.ceo_not_paid}</div>
							<p className="mt-1 text-xs text-muted-foreground">Pending finance payment</p>
						</CardContent>
					</Card>

					<Card
						className={`cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md ${filters.use_case === 'dept_not_finance' ? 'ring-2 ring-primary' : ''}`}
						onClick={() => handleUseCaseClick('dept_not_finance')}
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-xs font-medium">Dept Approved, Pending Finance</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{counts.dept_not_finance}</div>
							<p className="mt-1 text-xs text-muted-foreground">Waiting on Finance</p>
						</CardContent>
					</Card>

					<Card
						className={`cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md ${filters.use_case === 'finance_not_ceo' ? 'ring-2 ring-primary' : ''}`}
						onClick={() => handleUseCaseClick('finance_not_ceo')}
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-xs font-medium">Finance Approved, Pending CEO</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{counts.finance_not_ceo}</div>
							<p className="mt-1 text-xs text-muted-foreground">Waiting on CEO</p>
						</CardContent>
					</Card>
				</div>

				{/* ── Data Matrix ───────────────────────────────────────────────────── */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
						<CardTitle>Detailed Matrix</CardTitle>
						{filters.use_case && (
							<Button variant="outline" size="sm" onClick={() => handleFilterChange('use_case', 'all')}>
								Show All
							</Button>
						)}
					</CardHeader>
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Fiscal Year</TableHead>
										<TableHead>Fiscal Month</TableHead>
										<TableHead>Fiscal Week</TableHead>
										<TableHead>Budget Category</TableHead>
										<TableHead>Budget Type</TableHead>
										<TableHead className="text-right">Amount</TableHead>
										<TableHead>Dept Status</TableHead>
										<TableHead>Finance Status</TableHead>
										<TableHead>CEO Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{matrixData.data.length === 0 ? (
										<TableRow>
											<TableCell colSpan={9} className="h-24 text-center">
												No results.
											</TableCell>
										</TableRow>
									) : (
										matrixData.data.map((row) => (
											<TableRow key={row.id}>
												<TableCell className="text-xs text-muted-foreground">{row.fiscal_year || '-'}</TableCell>
												<TableCell>{row.fiscal_month || '-'}</TableCell>
												<TableCell>Week {row.week_number}</TableCell>
												<TableCell>{row.budget_category || '-'}</TableCell>
												<TableCell>{row.budget_type || '-'}</TableCell>
												<TableCell className="text-right font-mono">{formatCurrency(row.amount)}</TableCell>
												<TableCell>{statusBadge(row.status_department)}</TableCell>
												<TableCell>{statusBadge(row.status_finance)}</TableCell>
												<TableCell>{statusBadge(row.status_ceo)}</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
						{matrixData.data.length > 0 && (
							<div className="mt-4">
								<TablePagination links={matrixData.links} />
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}
