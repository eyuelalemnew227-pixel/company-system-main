import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { computeCurrentBalance } from '@/lib/bank-balance';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, FileText, Filter, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usePopup } from '@/hooks/use-popup';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Weekly Budgets CEO', href: '/budget/weekly-budget/ceo' }];

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

function statusBadge(status: string, _variant: 'ceo') {
	const colorMap: Record<string, string> = {
		pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
		approved: 'bg-green-50 text-green-700 border-green-200',
		rejected: 'bg-red-50 text-red-700 border-red-200',
		paid: 'bg-blue-50 text-blue-700 border-blue-200',
		'on-hold': 'bg-orange-50 text-orange-700 border-orange-200',
	};
	return (
		<span
			className={`rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm ${colorMap[status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
		>
			{status.charAt(0).toUpperCase() + status.slice(1)}
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

	// ── Edit state ──────────────────────────────────────────────────────────
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<any>({});

	const [viewDescriptionItem, setViewDescriptionItem] = useState<WeeklyBudgetRow | null>(null);

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
		const total = Number(totalRequested ?? 0);
		return departmentRequested
			.map((row) => ({
				...row,
				urgent_amount: Number(row.urgent_amount ?? 0),
				normal_amount: Number(row.normal_amount ?? 0),
				percent: total > 0 ? (row.amount / total) * 100 : 0,
				urgentPercentOfTotal: total > 0 ? (Number(row.urgent_amount ?? 0) / total) * 100 : 0,
				normalPercentOfTotal: total > 0 ? (Number(row.normal_amount ?? 0) / total) * 100 : 0,
			}))
			.sort((a, b) => b.amount - a.amount);
	}, [departmentRequested, totalRequested]);

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

	function startEditRow(item: WeeklyBudgetRow) {
		setEditingRowId(item.id);
		setEditForm({
			status_ceo: item.status_ceo,
		});
	}

	function saveEditRow(item: WeeklyBudgetRow) {
		router.patch(
			`/budget/weekly-budget/${item.id}/ceo-status`,
			{
				status_ceo: editForm.status_ceo,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setEditingRowId(null);
				},
			},
		);
	}

	function openWeekBalanceDetails() {
		if (!weekBalanceDetailId) {
			triggerPopup('Error', 'No bank balance details found for the selected week.', 'error');
			return;
		}
		router.visit(route('bank-balances.show', weekBalanceDetailId));
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

	function handleChartDepartmentToggle(key: string, checked: boolean) {
		setChartDepartmentChecks({
			...checkedChartDepartments,
			[key]: checked,
		});
	}

	const urgentShareOfRequested = totalRequested > 0 ? (urgentRequested / totalRequested) * 100 : 0;
	const normalShareOfRequested = totalRequested > 0 ? (normalRequested / totalRequested) * 100 : 0;
	const requestedShareOfBalance = weeklyBalance > 0 ? (totalRequested / weeklyBalance) * 100 : null;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Weekly Budgets - CEO View" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Weekly Budgets - CEO View</h1>
					<Button onClick={exportCsv} className="bg-green-600 text-white hover:bg-green-700">
						📥 Export CSV
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" /> Filters
						</CardTitle>
						<div className="flex flex-col gap-3 pt-2">
							{/* First Row: 5 filters (Department, Branch, Fiscal Year, Fiscal Month, Week) */}
							<div className="flex flex-wrap items-end gap-3">
								<Popover open={openDepartmentFilter} onOpenChange={setOpenDepartmentFilter}>
									<PopoverTrigger asChild>
										<Button variant="outline" role="combobox" className="w-[180px] justify-between font-normal">
											{selectedDepartmentOption?.name
												?? (selectedDepartmentIds !== 'all' && selectedDepartmentIds !== 'none'
													? `${parseDepartmentIds(selectedDepartmentIds).length} Departments`
													: 'All Departments')}
											<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
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

								<Popover open={openBranchFilter} onOpenChange={setOpenBranchFilter}>
									<div className={cn(!canFilterByBranch && 'cursor-not-allowed')}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												className="w-[180px] justify-between font-normal"
												disabled={!canFilterByBranch}
											>
												{selectedBranchOption?.name ?? 'All Branches'}
												<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
									</div>
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

								<Select
									value={selectedFiscalYear}
									onValueChange={(value) => {
										setSelectedFiscalYear(value);
										setSelectedFiscalMonth('all');
										setSelectedWeekStartDate('all');
										applyFilters({ fiscal_year_id: value, fiscal_month_id: 'all', week_start_date: 'all' });
									}}
								>
									<SelectTrigger className="w-[150px]">
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

								<Select
									value={selectedFiscalMonth}
									onValueChange={(value) => {
										setSelectedFiscalMonth(value);
										setSelectedWeekStartDate('all');
										applyFilters({ fiscal_month_id: value, week_start_date: 'all' });
									}}
								>
									<SelectTrigger className="w-[150px]">
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

								<Select
									value={selectedWeekStartDate}
									onValueChange={(value) => {
										setSelectedWeekStartDate(value);
										applyFilters({ week_start_date: value });
									}}
								>
									<SelectTrigger className="w-[240px]">
										<SelectValue placeholder="All Weeks" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Weeks</SelectItem>
										{weekFilterOptions.map((week) => (
											<SelectItem key={week.startDate} value={week.startDate}>
												{week.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Second Row: Rest of the filters (Request Type, CEO Status, Payment Category, Payment Type, Clear Filters) */}
							<div className="flex flex-wrap items-end gap-3">
								<Select
									value={selectedRequestType}
									onValueChange={(value) => {
										setSelectedRequestType(value);
										applyFilters({ request_type: value });
									}}
								>
									<SelectTrigger className="w-[180px]">
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

								<Select
									value={selectedStatusCeo}
									onValueChange={(value) => {
										setSelectedStatusCeo(value);
										applyFilters({ status_ceo: value });
									}}
								>
									<SelectTrigger className="w-[150px]">
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

								<Select
									value={selectedPaymentCategory}
									onValueChange={(value) => {
										setSelectedPaymentCategory(value);
										setSelectedPaymentType('all');
										applyFilters({ payment_category_id: value, payment_type_id: 'all' });
									}}
								>
									<SelectTrigger className="w-[180px]">
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

								<Popover open={openPaymentTypeFilter} onOpenChange={setOpenPaymentTypeFilter}>
									<PopoverTrigger asChild>
										<Button variant="outline" role="combobox" className="w-[220px] justify-between font-normal">
											{selectedPaymentType === 'all'
												? 'All Payment Types'
												: (filteredPaymentTypes.find((paymentType) => String(paymentType.id) === selectedPaymentType)?.name ??
													'All Payment Types')}
											<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
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

								{hasActiveFilters && (
									<Button type="button" variant="secondary" onClick={clearFilters}>
										<X className="mr-1 size-4" /> Clear Filters
									</Button>
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
						<Card className="h-full bg-slate-50 dark:bg-slate-900">
							<CardContent className="space-y-4 pt-6">
								<div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
									<div className="text-base font-bold text-slate-900 dark:text-slate-100">Weekly Balance</div>
									<div className="mt-1 flex items-center justify-between gap-3">
										<div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
											{formatCurrency(weeklyBalance)}{' '}
											<span className="text-lg font-semibold text-slate-500">ETB</span>
										</div>
										<Button
											type="button"
											size="sm"
											variant="secondary"
											className="h-8 shrink-0 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
											onClick={openWeekBalanceDetails}
											disabled={!weekBalanceDetailId}
										>
											See Details
										</Button>
									</div>
									<div className="mt-2 flex flex-col gap-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
										<div className="flex items-center gap-2">
											<span>Estimated Sales:</span>
											<span>{formatCurrency(estimatedSales)} ETB</span>
										</div>
										<div className="flex items-center gap-2">
											<span>Bank Balance:</span>
											<span>{formatCurrency(bankBalance)} ETB</span>
										</div>
									</div>
								</div>

								<div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
									<div className="text-base font-bold text-slate-900 dark:text-slate-100">Requested Amount</div>
									<div className="mt-1 flex items-center justify-between gap-3">
										<div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
											{formatCurrency(totalRequested)}{' '}
											<span className="text-lg font-semibold text-slate-500">ETB</span>
										</div>
										{requestedShareOfBalance !== null && (
											<span className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
												{Math.round(requestedShareOfBalance)}% of Balance
											</span>
										)}
									</div>
									<div className="mt-2 flex flex-col gap-1 text-sm font-semibold">
										<div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
											<span>Urgent:</span>
											<span>
												{formatCurrency(urgentRequested)} ETB ({Math.round(urgentShareOfRequested)}%)
											</span>
										</div>
										<div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
											<span>Normal:</span>
											<span>
												{formatCurrency(normalRequested)} ETB ({Math.round(normalShareOfRequested)}%)
											</span>
										</div>
									</div>
								</div>

								<div className="border-t border-slate-200 dark:border-slate-700" />

								<div>
									<div className="mb-4 flex items-center justify-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
										<span className="flex items-center gap-1.5">
											<span className="size-3 rounded-sm bg-orange-500" /> Urgent
										</span>
										<span className="flex items-center gap-1.5">
											<span className="size-3 rounded-sm bg-slate-800 dark:bg-slate-300" /> Normal
										</span>
									</div>

									{departmentShareRows.length === 0 ? (
										<div className="py-6 text-center text-sm text-slate-500">No requests for the selected week.</div>
									) : (
										<div className="space-y-1">
											<div className="flex items-center gap-2 px-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
												<span className="w-4 shrink-0" />
												<span className="w-[5.5rem] shrink-0" />
												<span className="min-w-0 flex-1" />
												<span className="w-[4.75rem] shrink-0 text-right">Amount</span>
												<span className="w-12 shrink-0 text-right">% Share</span>
											</div>
											{departmentShareRows.map((row) => {
												const key = String(row.department_id ?? 'none');
												const isChecked = checkedChartDepartments[key] !== false;
												const urgentWidth = Math.max(row.urgentPercentOfTotal, 0);
												const normalWidth = Math.max(row.normalPercentOfTotal, 0);

												return (
													<div
														key={`${key}-${row.department}`}
														className={cn('flex items-center gap-2 py-1.5', !isChecked && 'opacity-45')}
													>
														<Checkbox
															checked={isChecked}
															onCheckedChange={(checked) => handleChartDepartmentToggle(key, checked === true)}
															aria-label={`Filter table by ${row.department}`}
															className="shrink-0"
														/>
														<span
															className="w-[5.5rem] shrink-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100"
															title={row.department}
														>
															{row.department}
														</span>
														<div className="flex h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-slate-200 dark:bg-slate-800">
															{urgentWidth > 0 && (
																<div
																	className="h-full shrink-0 bg-orange-500"
																	style={{ width: `${urgentWidth}%` }}
																	title={`Urgent ${formatCurrency(row.urgent_amount)}`}
																/>
															)}
															{normalWidth > 0 && (
																<div
																	className="h-full shrink-0 bg-slate-800 dark:bg-slate-300"
																	style={{ width: `${normalWidth}%` }}
																	title={`Normal ${formatCurrency(row.normal_amount)}`}
																/>
															)}
														</div>
														<span className="w-[4.75rem] shrink-0 text-right text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
															{formatCurrency(row.amount)}
														</span>
														<span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
															{Math.round(row.percent)}%
														</span>
													</div>
												);
											})}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="min-w-0 xl:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle>Weekly Budgets</CardTitle>
								{canManageCeo && (
									<div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-slate-50 p-3 dark:bg-slate-900">
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
							<CardContent>
								<Table>
									<TableHeader className="bg-slate-500 dark:bg-slate-700">
										<TableRow>
											{canManageCeo && (
												<TableHead className="w-12 text-center text-white">
													<Checkbox
														checked={isAllSelected}
														// @ts-ignore
														indeterminate={isSomeSelected}
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
											<TableHead className="font-bold text-white">Status (CEO)</TableHead>
											<TableHead className="font-bold text-white">Description</TableHead>
											<TableHead className="font-bold text-white">Amount</TableHead>
											{canManageCeo && <TableHead className="font-bold text-white">Actions</TableHead>}
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.data.map((item) => {
											const isEditing = editingRowId === item.id;
											const isEditable = canManageCeo && item.status_finance !== 'paid';
											const bothApproved = item.status_finance === 'approved' && item.status_department === 'approved';

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

													{/* CEO Status */}
													<TableCell>
														{isEditing ? (
															<Select
																value={editForm.status_ceo}
																onValueChange={(v) => setEditForm({ ...editForm, status_ceo: v })}
															>
																<SelectTrigger className="w-[120px]">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	{statusCeos.map((s) => {
																		// Only allow Approved if both finance & department are approved
																		const disabled = s === 'approved' && !bothApproved;
																		return disabled ? null : (
																			<SelectItem key={s} value={s}>
																				{s.charAt(0).toUpperCase() + s.slice(1)}
																			</SelectItem>
																		);
																	})}
																</SelectContent>
															</Select>
														) : (
															statusBadge(item.status_ceo, 'ceo')
														)}
													</TableCell>

													<TableCell>
														<button
															type="button"
															className={cn(
																'flex items-center justify-center rounded p-1 transition-colors',
																item.description
																	? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700'
																	: 'cursor-pointer text-slate-300 hover:text-slate-500',
															)}
															onClick={() => setViewDescriptionItem(item)}
															aria-label="View description"
														>
															<FileText className="size-4" />
														</button>
													</TableCell>

													<TableCell className="whitespace-nowrap">{formatCurrency(item.amount)}</TableCell>

													{/* Actions */}
													{canManageCeo && (
														<TableCell className="whitespace-nowrap">
															{isEditing ? (
																<div className="flex gap-1">
																	<Button size="sm" onClick={() => saveEditRow(item)} className="h-7 px-2 text-xs">
																		Save
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => setEditingRowId(null)}
																		className="h-7 px-2 text-xs"
																	>
																		Cancel
																	</Button>
																</div>
															) : isEditable ? (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => startEditRow(item)}
																	className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
																>
																	Edit
																</Button>
															) : null}
														</TableCell>
													)}
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
											{canManageCeo && <TableCell />}
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

			<Dialog open={!!viewDescriptionItem} onOpenChange={() => setViewDescriptionItem(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Description</DialogTitle>
					</DialogHeader>
					<div className="rounded-lg border bg-slate-50 p-3 text-slate-700 italic dark:bg-slate-900">
						{viewDescriptionItem?.description || 'N/A'}
					</div>
					<DialogFooter>
						<Button onClick={() => setViewDescriptionItem(null)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<PopupComponent />
		</AppLayout>
	);
}
