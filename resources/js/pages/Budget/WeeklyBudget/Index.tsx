import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Filter, History, MessageSquare, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Weekly Budgets', href: '/budget/weekly-budget' }];

type BranchOption = {
	id: number;
	name: string;
	branch_code: string | null;
};

type DepartmentOption = {
	id: number;
	name: string;
};

type FiscalYearOption = {
	id: number;
	name: string;
	gregorian_start_date: string | null;
	gregorian_end_date: string | null;
};

type FiscalMonthOption = {
	id: number;
	name: string;
	fiscal_year_id: number;
	gregorian_start_date?: string | null;
	gregorian_end_date?: string | null;
};

type WeekOption = {
	weekNumber: number;
	startDate: string;
	endDate: string;
	label: string;
};

type WeeklyBudgetRow = {
	id: number;
	branch_id: number;
	department_id: number | null;
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
	can_view_history: boolean;
};

type ActivityLogEntry = {
	id: number;
	action: string;
	summary: string;
	old_values: Record<string, unknown> | null;
	new_values: Record<string, unknown> | null;
	meta: Record<string, unknown> | null;
	created_at: string;
	user: { id: number; name: string } | null;
};

type ActivityLogResponse = {
	item: {
		id: number;
		department: string | null;
		branch: string | null;
		fiscal_year: string | null;
		fiscal_month: string | null;
		week_number: number;
		amount: string | number | null;
	};
	logs: ActivityLogEntry[];
};

type EditFormState = {
	request_type: string;
	branch_id: string;
	department_id: string;
	fiscal_year_id: string;
	fiscal_month_id: string;
	week_number: string;
	week_start_date: string;
	week_end_date: string;
	amount: string;
	description: string;
	note: string;
};

interface WeeklyBudgetList extends Pagination {
	data: WeeklyBudgetRow[];
}

type IndexProps = {
	items: WeeklyBudgetList;
	branches: BranchOption[];
	departments: DepartmentOption[];
	fiscalYears: FiscalYearOption[];
	fiscalMonths: FiscalMonthOption[];
	requestTypes: string[];
	statusFinances: string[];
	statusDepartments: string[];
	statueCeos: string[];
	statusCeos: string[];
	today: string;
	currentFiscalYearId?: number | null;
	currentFiscalMonthId?: number | null;
	request?: {
		request_type?: string;
		status_finance?: string;
		status_department?: string;
		status_ceo?: string;
		branch_id?: string;
		department_id?: string;
		fiscal_year_id?: string;
		fiscal_month_id?: string;
		week_start_date?: string;
	};
};

function formatCurrency(value: string | number | null | undefined): string {
	const amount = Number(value ?? 0);

	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number.isNaN(amount) ? 0 : amount);
}

function formatActivityAction(action: string): string {
	return action
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function getActivityIcon(action: string) {
	if (action.includes('created')) return Plus;
	if (action.includes('deleted')) return Trash2;
	if (action.includes('updated') || action.includes('overridden')) return Pencil;
	return History;
}

function formatActivityTimestamp(value: string): string {
	return new Date(value).toLocaleString();
}

function isHeadOfficeBranch(branch: BranchOption | null | undefined): boolean {
	if (!branch) {
		return false;
	}

	if (branch.branch_code?.toUpperCase() === 'HO') {
		return true;
	}

	return branch.name.includes('Head Office');
}

/**
 * Department→Branch dependency: Branch is enabled only for Operation or HR departments.
 */
function isBranchEnabledForDepartment(dept: DepartmentOption | null | undefined): boolean {
	if (!dept) return false;
	const name = dept.name.toLowerCase();
	return name.includes('operation') || name.includes('hr') || name.includes('human resource');
}

function formatWeekLabelFull(weekNumber: number, startDate: string | null, endDate: string | null): string {
	if (startDate && endDate) {
		const start = new Date(startDate + 'T00:00:00');
		const end = new Date(endDate + 'T00:00:00');
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		const fmtFull = (d: Date) => `${months[d.getMonth()]} ${d.getDate()}`;
		return `Week ${weekNumber} (${fmtFull(start)} – ${fmtFull(end)})`;
	}
	return `Week ${weekNumber}`;
}

function statusBadge(status: string, variant: 'finance' | 'ceo' | 'department') {
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

function formatBudgetInput(value: string): string {
	const sanitized = value.replace(/[^\d.]/g, '');
	const [integerPart = '', ...decimalParts] = sanitized.split('.');
	const decimalPart = decimalParts.join('').slice(0, 2);
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	if (decimalParts.length > 0) {
		return `${formattedInteger}.${decimalPart}`;
	}

	return formattedInteger;
}

function parseFormattedNumber(value: string): number {
	const cleaned = value.replace(/,/g, '').trim();
	if (cleaned === '' || cleaned === '.') return Number.NaN;
	return Number.parseFloat(cleaned);
}

function getISOWeekNumber(d: Date): number {
	const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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
	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getFiscalWeekNumber(monday: Date, fiscalYearStartDate: Date): number {
	const anchor = getMondayOfWeek(fiscalYearStartDate);
	const diffMs = monday.getTime() - anchor.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
	return Math.floor(diffDays / 7) + 1;
}

/**
 * Build all weeks within the current fiscal year from week 1 up to 2 weeks ahead of today.
 */
function buildCurrentFiscalYearWeeks(fiscalYear: FiscalYearOption, todayStr: string): WeekOption[] {
	if (!fiscalYear.gregorian_start_date || !fiscalYear.gregorian_end_date) return [];

	const fyStart = new Date(fiscalYear.gregorian_start_date + 'T00:00:00');
	const fyEnd = new Date(fiscalYear.gregorian_end_date + 'T00:00:00');
	const today = new Date(todayStr + 'T00:00:00');

	// Limit: two weeks ahead of today
	const twoWeeksAheadMonday = getMondayOfWeek(today);
	twoWeeksAheadMonday.setDate(twoWeeksAheadMonday.getDate() + 14);
	const cutoff = twoWeeksAheadMonday; // up to and including this week's Monday

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

/**
 * Build weeks for a specific fiscal year (all weeks within that year).
 */
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

/**
 * Build weeks filtered to those overlapping a specific fiscal month.
 */
function buildFiscalMonthWeeks(fiscalYear: FiscalYearOption, fiscalMonth: FiscalMonthOption): WeekOption[] {
	if (!fiscalYear.gregorian_start_date || !fiscalMonth.gregorian_start_date || !fiscalMonth.gregorian_end_date) return [];

	const fyStart = new Date(fiscalYear.gregorian_start_date + 'T00:00:00');
	const monthStart = new Date(fiscalMonth.gregorian_start_date + 'T00:00:00');
	const monthEnd = new Date(fiscalMonth.gregorian_end_date + 'T00:00:00');

	const weeks: WeekOption[] = [];
	// Start from the Monday of the week containing month start
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

export default function WeeklyBudgetIndex({
	items,
	branches,
	departments,
	fiscalYears,
	fiscalMonths,
	requestTypes,
	statusFinances,
	statusDepartments,
	statusCeos,
	today,
	currentFiscalYearId,
	currentFiscalMonthId,
	request,
}: IndexProps) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
	const { can } = usePermission();
	const canManageWeeklyBudget = can('manage weekly budgets');

	const [selectedRequestType, setSelectedRequestType] = useState<string>(request?.request_type ?? 'all');
	const [selectedStatusFinance, setSelectedStatusFinance] = useState<string>(request?.status_finance ?? 'all');
	const [selectedStatusDepartment, setSelectedStatusDepartment] = useState<string>(request?.status_department ?? 'all');
	const [selectedStatusCeo, setSelectedStatusCeo] = useState<string>(request?.status_ceo ?? 'all');
	const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
	const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
	const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(
		request?.fiscal_year_id ?? (currentFiscalYearId ? String(currentFiscalYearId) : 'all'),
	);
	const [selectedFiscalMonth, setSelectedFiscalMonth] = useState<string>(
		request?.fiscal_month_id ?? (currentFiscalMonthId ? String(currentFiscalMonthId) : 'all'),
	);
	const [selectedWeekStartDate, setSelectedWeekStartDate] = useState<string>(request?.week_start_date ?? 'all');

	const [openBranchFilter, setOpenBranchFilter] = useState(false);
	const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);

	const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
	const [historyItem, setHistoryItem] = useState<WeeklyBudgetRow | null>(null);
	const [historyData, setHistoryData] = useState<ActivityLogResponse | null>(null);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [editingItem, setEditingItem] = useState<WeeklyBudgetRow | null>(null);
	const [editForm, setEditForm] = useState<EditFormState | null>(null);
	const [editProcessing, setEditProcessing] = useState(false);
	const [openEditBranch, setOpenEditBranch] = useState(false);
	const [openEditDepartment, setOpenEditDepartment] = useState(false);

	// New Request Modal States
	const [openNewRequest, setOpenNewRequest] = useState(false);
	const [newRequestDept, setNewRequestDept] = useState<string>('');
	const [newRequestBranch, setNewRequestBranch] = useState<string>('');
	const [openNewDept, setOpenNewDept] = useState(false);
	const [openNewBranch, setOpenNewBranch] = useState(false);

	const newRequestDeptOption = useMemo(() => departments.find((d) => d.id.toString() === newRequestDept) ?? null, [newRequestDept, departments]);

	const isNewRequestBranchEnabled = useMemo(() => {
		return isBranchEnabledForDepartment(newRequestDeptOption);
	}, [newRequestDeptOption]);

	const newRequestBranchOption = useMemo(() => branches.find((b) => b.id.toString() === newRequestBranch) ?? null, [newRequestBranch, branches]);

	function handleNewRequestContinue() {
		if (!newRequestDept) {
			toast.error('Please select a department.');
			return;
		}

		const params: Record<string, string> = { department_id: newRequestDept };
		if (isNewRequestBranchEnabled && newRequestBranch) {
			params.branch_id = newRequestBranch;
		}

		router.get('/budget/weekly-budget/create', params);
	}

	function closeNewRequestDialog() {
		setOpenNewRequest(false);
		setNewRequestDept('');
		setNewRequestBranch('');
		setOpenNewDept(false);
		setOpenNewBranch(false);
	}

	const editBranchOption = useMemo(
		() => (editForm?.branch_id ? (branches.find((branch) => branch.id.toString() === editForm.branch_id) ?? null) : null),
		[editForm?.branch_id, branches],
	);

	const canEditDepartment = isHeadOfficeBranch(editBranchOption);

	const editFilteredFiscalMonths = useMemo(() => {
		if (!editForm?.fiscal_year_id) {
			return fiscalMonths;
		}
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === editForm.fiscal_year_id);
	}, [editForm?.fiscal_year_id, fiscalMonths]);

	function confirmDeleteItem() {
		if (deleteItemId === null) return;
		router.delete(`/budget/weekly-budget/${deleteItemId}`, {
			onSuccess: () => setDeleteItemId(null),
		});
	}

	async function openHistoryDialog(item: WeeklyBudgetRow) {
		setHistoryItem(item);
		setHistoryData(null);
		setHistoryLoading(true);

		try {
			const response = await fetch(`/budget/weekly-budget/${item.id}/activity-logs`);

			if (!response.ok) {
				if (response.status === 403) {
					throw new Error('You do not have permission to view weekly budget activity history.');
				}

				throw new Error('Failed to load activity history.');
			}

			const data = (await response.json()) as ActivityLogResponse;
			setHistoryData(data);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load activity history.');
			setHistoryItem(null);
		} finally {
			setHistoryLoading(false);
		}
	}

	function closeHistoryDialog() {
		setHistoryItem(null);
		setHistoryData(null);
		setHistoryLoading(false);
	}

	function openEditDialog(item: WeeklyBudgetRow) {
		setEditingItem(item);
		setEditForm({
			request_type: item.request_type,
			branch_id: String(item.branch_id),
			department_id: item.department_id ? String(item.department_id) : '',
			fiscal_year_id: String(item.fiscal_year_id),
			fiscal_month_id: String(item.fiscal_month_id),
			week_number: String(item.week_number),
			week_start_date: item.week_start_date ?? '',
			week_end_date: item.week_end_date ?? '',
			amount: formatCurrency(item.amount),
			description: item.description ?? '',
			note: item.note ?? '',
		});
		setOpenEditBranch(false);
		setOpenEditDepartment(false);
	}

	function closeEditDialog() {
		setEditingItem(null);
		setEditForm(null);
		setOpenEditBranch(false);
		setOpenEditDepartment(false);
	}

	function handleEditBranchSelect(branch: BranchOption) {
		if (!editForm) return;
		const headOffice = isHeadOfficeBranch(branch);
		setEditForm({
			...editForm,
			branch_id: String(branch.id),
			department_id: headOffice ? editForm.department_id : '',
		});
		setOpenEditBranch(false);
	}

	function handleEditDepartmentSelect(department: DepartmentOption) {
		if (!editForm) return;
		setEditForm({ ...editForm, department_id: String(department.id) });
		setOpenEditDepartment(false);
	}

	function submitEditItem(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!editingItem || !editForm) return;

		if (canEditDepartment && !editForm.department_id) {
			toast.error('The department field is required when the selected branch is Head Office.');
			return;
		}

		const parsedAmount = parseFormattedNumber(editForm.amount);
		if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
			toast.error('Please enter a valid amount.');
			return;
		}

		if (!editForm.week_start_date || !editForm.week_end_date || !editForm.week_number) {
			toast.error('Please select a valid budget week date.');
			return;
		}

		setEditProcessing(true);
		router.put(
			`/budget/weekly-budget/${editingItem.id}`,
			{
				...editForm,
				department_id: canEditDepartment ? editForm.department_id : null,
				amount: parsedAmount,
			},
			{
				preserveScroll: true,
				onSuccess: () => closeEditDialog(),
				onFinish: () => setEditProcessing(false),
			},
		);
	}

	// ─── Filter: Department option ────────────────────────────────────────────
	const selectedDepartmentOption = useMemo(
		() => (selectedDepartment === 'all' ? null : (departments.find((d) => d.id.toString() === selectedDepartment) ?? null)),
		[selectedDepartment, departments],
	);

	// Branch enabled only when department is Operation or HR
	const canFilterByBranch = useMemo(() => isBranchEnabledForDepartment(selectedDepartmentOption), [selectedDepartmentOption]);

	const selectedBranchOption = useMemo(
		() => (selectedBranch === 'all' ? null : (branches.find((b) => b.id.toString() === selectedBranch) ?? null)),
		[selectedBranch, branches],
	);

	const filteredFiscalMonths = useMemo(() => {
		if (selectedFiscalYear === 'all') {
			return fiscalMonths;
		}
		return fiscalMonths.filter((m) => String(m.fiscal_year_id) === selectedFiscalYear);
	}, [fiscalMonths, selectedFiscalYear]);

	// ── View note dialog ──────────────────────────────────────────────────
	const [viewNoteItem, setViewNoteItem] = useState<WeeklyBudgetRow | null>(null);

	// ─── Week filter options ──────────────────────────────────────────────────
	const weekFilterOptions = useMemo((): WeekOption[] => {
		const hasYear = selectedFiscalYear !== 'all';
		const hasMonth = selectedFiscalMonth !== 'all';

		if (hasMonth) {
			// Both year and month selected — show weeks for that month
			const fy = fiscalYears.find((y) => String(y.id) === selectedFiscalYear);
			const fm = fiscalMonths.find((m) => String(m.id) === selectedFiscalMonth);
			if (fy && fm) return buildFiscalMonthWeeks(fy, fm);
			return [];
		}

		if (hasYear) {
			// Year selected only — show all weeks for that year
			const fy = fiscalYears.find((y) => String(y.id) === selectedFiscalYear);
			if (fy) return buildFiscalYearAllWeeks(fy);
			return [];
		}

		// Default: no year/month selected — show current fiscal year weeks up to 2 weeks ahead
		if (currentFiscalYearId) {
			const fy = fiscalYears.find((y) => y.id === currentFiscalYearId);
			if (fy) return buildCurrentFiscalYearWeeks(fy, today);
		}

		return [];
	}, [selectedFiscalYear, selectedFiscalMonth, fiscalYears, fiscalMonths, currentFiscalYearId, today]);

	useEffect(() => {
		if (flash?.message) {
			toast.success(flash.message);
		}
	}, [flash?.message]);

	function buildFilterParams(): Record<string, string> {
		const params: Record<string, string> = {};
		if (selectedRequestType !== 'all') params.request_type = selectedRequestType;
		if (selectedStatusFinance !== 'all') params.status_finance = selectedStatusFinance;
		if (selectedStatusDepartment !== 'all') params.status_department = selectedStatusDepartment;
		if (selectedStatusCeo !== 'all') params.status_ceo = selectedStatusCeo;
		if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
		if (selectedBranch !== 'all') params.branch_id = selectedBranch;
		params.fiscal_year_id = selectedFiscalYear;
		params.fiscal_month_id = selectedFiscalMonth;
		if (selectedWeekStartDate !== 'all') params.week_start_date = selectedWeekStartDate;
		return params;
	}

	function applyFilters(overrides: Record<string, string> = {}) {
		const params = { ...buildFilterParams(), ...overrides };
		Object.keys(params).forEach((key) => {
			if (params[key] === 'all' && key !== 'fiscal_year_id' && key !== 'fiscal_month_id') {
				delete params[key];
			}
		});
		router.get('/budget/weekly-budget', params, { preserveState: true, replace: true });
	}

	function handleDepartmentFilterSelect(departmentId: string) {
		setOpenDepartmentFilter(false);
		setSelectedDepartment(departmentId);
		// Reset branch when department changes
		setSelectedBranch('all');
		setSelectedWeekStartDate('all');
		applyFilters({ department_id: departmentId, branch_id: 'all', week_start_date: 'all' });
	}

	function handleBranchFilterSelect(branchId: string) {
		setOpenBranchFilter(false);
		setSelectedBranch(branchId);
		setSelectedWeekStartDate('all');
		applyFilters({ branch_id: branchId, week_start_date: 'all' });
	}

	function handleFiscalYearChange(value: string) {
		setSelectedFiscalYear(value);
		setSelectedFiscalMonth('all');
		setSelectedWeekStartDate('all');
		applyFilters({ fiscal_year_id: value, fiscal_month_id: 'all', week_start_date: 'all' });
	}

	function handleFiscalMonthChange(value: string) {
		setSelectedFiscalMonth(value);
		setSelectedWeekStartDate('all');
		applyFilters({ fiscal_month_id: value, week_start_date: 'all' });
	}

	function handleWeekFilterChange(value: string) {
		setSelectedWeekStartDate(value);
		applyFilters({ week_start_date: value });
	}

	function handleRequestTypeChange(value: string) {
		setSelectedRequestType(value);
		applyFilters({ request_type: value });
	}

	function handleStatusFinanceChange(value: string) {
		setSelectedStatusFinance(value);
		applyFilters({ status_finance: value });
	}

	function handleStatusDepartmentChange(value: string) {
		setSelectedStatusDepartment(value);
		applyFilters({ status_department: value });
	}

	function handleStatusCeoChange(value: string) {
		setSelectedStatusCeo(value);
		applyFilters({ status_ceo: value });
	}

	function clearFilters() {
		setSelectedRequestType('all');
		setSelectedStatusFinance('all');
		setSelectedStatusDepartment('all');
		setSelectedStatusCeo('all');
		setSelectedDepartment('all');
		setSelectedBranch('all');
		setSelectedFiscalYear(currentFiscalYearId ? String(currentFiscalYearId) : 'all');
		setSelectedFiscalMonth(currentFiscalMonthId ? String(currentFiscalMonthId) : 'all');
		setSelectedWeekStartDate('all');
		router.get(
			'/budget/weekly-budget',
			{
				fiscal_year_id: currentFiscalYearId ? String(currentFiscalYearId) : 'all',
				fiscal_month_id: currentFiscalMonthId ? String(currentFiscalMonthId) : 'all',
			},
			{ preserveState: true, replace: true },
		);
	}

	const hasActiveFilters =
		selectedRequestType !== 'all' ||
		selectedStatusFinance !== 'all' ||
		selectedStatusDepartment !== 'all' ||
		selectedStatusCeo !== 'all' ||
		selectedDepartment !== 'all' ||
		selectedBranch !== 'all' ||
		selectedFiscalYear !== (currentFiscalYearId ? String(currentFiscalYearId) : 'all') ||
		selectedFiscalMonth !== (currentFiscalMonthId ? String(currentFiscalMonthId) : 'all') ||
		selectedWeekStartDate !== 'all';

	// Selected week option label for the filter trigger
	const selectedWeekOption = useMemo(
		() => (selectedWeekStartDate === 'all' ? null : (weekFilterOptions.find((w) => w.startDate === selectedWeekStartDate) ?? null)),
		[selectedWeekStartDate, weekFilterOptions],
	);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Weekly Budgets" />

			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Weekly Budgets</h1>
					<Button onClick={() => setOpenNewRequest(true)}>
						<Plus className="mr-1 size-4" />
						New Request
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" />
							Filters
						</CardTitle>
						<div className="flex flex-wrap items-end gap-3 pt-2">
							<Select value={selectedRequestType} onValueChange={handleRequestTypeChange}>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="All Types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									{requestTypes.map((t) => (
										<SelectItem key={t} value={t}>
											{t.charAt(0).toUpperCase() + t.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={selectedStatusFinance} onValueChange={handleStatusFinanceChange}>
								<SelectTrigger className="w-[170px]">
									<SelectValue placeholder="All Status (Finance)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status (Finance)</SelectItem>
									{statusFinances.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={selectedStatusDepartment} onValueChange={handleStatusDepartmentChange}>
								<SelectTrigger className="w-[170px]">
									<SelectValue placeholder="All Status (Dept)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status (Dept)</SelectItem>
									{statusDepartments.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={selectedStatusCeo} onValueChange={handleStatusCeoChange}>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="All Status (CEO)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status (CEO)</SelectItem>
									{statusCeos.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Department — comes first before Branch */}
							<Popover open={openDepartmentFilter} onOpenChange={setOpenDepartmentFilter}>
								<PopoverTrigger asChild>
									<Button variant="outline" role="combobox" className="w-[180px] justify-between font-normal">
										{selectedDepartmentOption?.name ?? 'All Departments'}
										<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search departments..." />
										<CommandList className="max-h-60">
											<CommandEmpty>No departments found.</CommandEmpty>
											<CommandGroup>
												<CommandItem value="All Departments" onSelect={() => handleDepartmentFilterSelect('all')}>
													<Check
														className={cn('mr-2 size-4', selectedDepartment === 'all' ? 'opacity-100' : 'opacity-0')}
													/>
													All Departments
												</CommandItem>
												{departments.map((department) => (
													<CommandItem
														key={department.id}
														value={department.name}
														onSelect={() => handleDepartmentFilterSelect(department.id.toString())}
													>
														<Check
															className={cn(
																'mr-2 size-4',
																selectedDepartment === department.id.toString() ? 'opacity-100' : 'opacity-0',
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

							{/* Branch — only enabled when Department is Operation or HR */}
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
												<CommandItem value="All Branches" onSelect={() => handleBranchFilterSelect('all')}>
													<Check className={cn('mr-2 size-4', selectedBranch === 'all' ? 'opacity-100' : 'opacity-0')} />
													All Branches
												</CommandItem>
												{branches.map((branch) => (
													<CommandItem
														key={branch.id}
														value={branch.name}
														onSelect={() => handleBranchFilterSelect(branch.id.toString())}
													>
														<Check
															className={cn(
																'mr-2 size-4',
																selectedBranch === branch.id.toString() ? 'opacity-100' : 'opacity-0',
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

							<Select value={selectedFiscalYear} onValueChange={handleFiscalYearChange}>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="All Fiscal Years" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Fiscal Years</SelectItem>
									{fiscalYears.map((year) => (
										<SelectItem key={year.id} value={year.id.toString()}>
											{year.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={selectedFiscalMonth} onValueChange={handleFiscalMonthChange}>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="All Fiscal Months" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Fiscal Months</SelectItem>
									{filteredFiscalMonths.map((month) => (
										<SelectItem key={month.id} value={month.id.toString()}>
											{month.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Week filter — at the end */}
							<Select value={selectedWeekStartDate} onValueChange={handleWeekFilterChange}>
								<SelectTrigger className="w-[260px]">
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

							{hasActiveFilters && (
								<Button type="button" variant="secondary" onClick={clearFilters}>
									<X className="mr-1 size-4" />
									Clear Filters
								</Button>
							)}
						</div>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">ID</TableHead>
									<TableHead className="font-bold text-white">Branch</TableHead>
									<TableHead className="font-bold text-white">Department</TableHead>
									<TableHead className="font-bold text-white">Fiscal Year</TableHead>
									<TableHead className="font-bold text-white">Fiscal Month</TableHead>
									<TableHead className="font-bold text-white">Week</TableHead>
									<TableHead className="font-bold text-white">Request Type</TableHead>
									<TableHead className="font-bold text-white">Status (Dept)</TableHead>
									<TableHead className="font-bold text-white">Status (Finance)</TableHead>
									<TableHead className="font-bold text-white">Status (CEO)</TableHead>
									<TableHead className="font-bold text-white">Amount</TableHead>
									<TableHead className="font-bold text-white">Desc</TableHead>
									<TableHead className="font-bold text-white">Note</TableHead>
									<TableHead className="font-bold text-white">History</TableHead>
									{/* <TableHead className="font-bold text-white">Actions</TableHead> */}
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.data.map((item) => (
									<TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell className="font-mono text-xs text-slate-500">#{item.id}</TableCell>
										<TableCell>{item.branch ?? 'N/A'}</TableCell>
										<TableCell>{item.department ?? '-'}</TableCell>
										<TableCell>{item.fiscal_year ?? 'N/A'}</TableCell>
										<TableCell>{item.fiscal_month ?? 'N/A'}</TableCell>
										<TableCell className="whitespace-nowrap">
											{formatWeekLabelFull(item.week_number, item.week_start_date, item.week_end_date)}
										</TableCell>
										<TableCell>{requestTypeBadge(item.request_type)}</TableCell>
										<TableCell>{statusBadge(item.status_department, 'department')}</TableCell>
										<TableCell>{statusBadge(item.status_finance, 'finance')}</TableCell>
										<TableCell>{statusBadge(item.status_ceo, 'ceo')}</TableCell>
										<TableCell className="whitespace-nowrap">{formatCurrency(item.amount)}</TableCell>
										<TableCell>
											<div className="max-w-xs truncate text-sm text-slate-600">{item.description || '-'}</div>
										</TableCell>
										<TableCell>
											<button
												type="button"
												className={cn(
													'flex items-center justify-center rounded p-1 transition-colors',
													item.note
														? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700'
														: 'cursor-pointer text-slate-300 hover:text-slate-500',
												)}
												onClick={() => setViewNoteItem(item)}
												aria-label="View note"
											>
												<MessageSquare className="size-4" />
											</button>
										</TableCell>
										<TableCell>
											{item.can_view_history && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="size-8 p-0"
													onClick={() => openHistoryDialog(item)}
													aria-label={`View activity history for weekly budget ${item.id}`}
													title="View activity history"
												>
													<History className="size-4" />
												</Button>
											)}
										</TableCell>
										{/* <TableCell>
											{canManageWeeklyBudget && (
												<div className="flex flex-wrap gap-2">
													<Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
														Edit
													</Button>
													<Button variant="destructive" size="sm" onClick={() => setDeleteItemId(item.id)}>
														Delete
													</Button>
												</div>
											)}
										</TableCell> */}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
					{items.data.length > 0 ? (
						<TablePagination total={items.total} from={items.from} to={items.to} links={items.links} />
					) : (
						<div className="flex h-full items-center justify-center py-8">No Results Found!</div>
					)}
				</Card>
			</div>

			<Dialog open={deleteItemId !== null} onOpenChange={(open) => !open && setDeleteItemId(null)}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-destructive">
							<Trash2 className="size-5" />
							Confirm Deletion
						</DialogTitle>
						<DialogDescription>Are you sure you want to delete this weekly budget? This action cannot be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setDeleteItemId(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDeleteItem}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── View Note Dialog ─────────────────────────────────────────── */}
			<Dialog open={!!viewNoteItem} onOpenChange={(open) => !open && setViewNoteItem(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>View Note</DialogTitle>
					</DialogHeader>
					<div className="py-4 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
						{viewNoteItem?.note || <span className="text-slate-400 italic">No note added.</span>}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setViewNoteItem(null)}>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={historyItem !== null} onOpenChange={(open) => !open && closeHistoryDialog()}>
				<DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<History className="size-5 text-muted-foreground" />
							Activity History
						</DialogTitle>
						<DialogDescription>
							{historyData?.item
								? `${historyData.item.department ?? 'Department'}${historyData.item.branch ? ` (${historyData.item.branch})` : ''} · ${historyData.item.fiscal_month ?? 'N/A'} / ${historyData.item.fiscal_year ?? 'N/A'} · Week ${historyData.item.week_number}`
								: historyItem
									? `${historyItem.department ?? 'Department'} · ${historyItem.fiscal_month ?? 'N/A'} / ${historyItem.fiscal_year ?? 'N/A'} · Week ${historyItem.week_number}`
									: 'Weekly budget activity'}
						</DialogDescription>
					</DialogHeader>

					<div className="min-h-0 flex-1 overflow-y-auto pr-1">
						{historyLoading ? (
							<div className="py-10 text-center text-sm text-muted-foreground">Loading activity history...</div>
						) : historyData && historyData.logs.length > 0 ? (
							<div className="relative space-y-4 before:absolute before:inset-y-0 before:left-[17px] before:w-0.5 before:bg-muted">
								{historyData.logs.map((log) => {
									const ActionIcon = getActivityIcon(log.action);

									return (
										<div key={log.id} className="relative pl-10">
											<div className="absolute top-1 left-0 flex size-9 items-center justify-center rounded-full border bg-background shadow-sm">
												<ActionIcon className="size-4 text-muted-foreground" />
											</div>
											<div className="flex flex-col rounded-lg border bg-card p-3 shadow-sm">
												<div className="mb-1 flex items-center justify-between gap-2">
													<span className="text-sm font-semibold">{formatActivityAction(log.action)}</span>
													<span className="text-xs text-muted-foreground">{formatActivityTimestamp(log.created_at)}</span>
												</div>
												<p className="text-sm text-foreground">{log.summary}</p>
												<p className="mt-2 text-xs text-muted-foreground">
													By <span className="font-medium text-foreground">{log.user?.name ?? 'System'}</span>
												</p>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="py-10 text-center text-sm text-muted-foreground italic">
								No activity recorded for this weekly budget yet.
							</div>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={closeHistoryDialog}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={editingItem !== null} onOpenChange={(open) => !open && closeEditDialog()}>
				<DialogContent
					className="overflow-visible sm:max-w-2xl"
					onInteractOutside={(event) => {
						const target = event.target as HTMLElement | null;
						if (target?.closest('[data-radix-popper-content-wrapper], [data-radix-popover-content]')) {
							event.preventDefault();
						}
					}}
				>
					<DialogHeader>
						<DialogTitle>Edit Weekly Budget</DialogTitle>
						<DialogDescription>Update the details of the selected weekly budget.</DialogDescription>
					</DialogHeader>
					{editForm && (
						<form onSubmit={submitEditItem} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="edit_request_type">Request Type</Label>
								<Select
									value={editForm.request_type}
									onValueChange={(val) =>
										setEditForm({
											...editForm,
											request_type: val,
											week_number: '',
											week_start_date: '',
											week_end_date: '',
										})
									}
								>
									<SelectTrigger id="edit_request_type">
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										{requestTypes.map((t) => (
											<SelectItem key={t} value={t}>
												{t.charAt(0).toUpperCase() + t.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Branch</Label>
								<Popover modal={false} open={openEditBranch} onOpenChange={setOpenEditBranch}>
									<PopoverTrigger asChild>
										<Button variant="outline" role="combobox" className="w-full justify-between font-normal">
											{editBranchOption?.name ?? 'Select branch'}
											<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent portalled={false} className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
										<Command>
											<CommandInput placeholder="Search branches..." />
											<CommandList className="max-h-60">
												<CommandEmpty>No branches found.</CommandEmpty>
												<CommandGroup>
													{branches.map((branch) => (
														<CommandItem
															key={branch.id}
															value={branch.name}
															className="cursor-pointer"
															onSelect={() => handleEditBranchSelect(branch)}
															onClick={() => handleEditBranchSelect(branch)}
														>
															<Check
																className={cn(
																	'mr-2 size-4',
																	editForm.branch_id === String(branch.id) ? 'opacity-100' : 'opacity-0',
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

							<div className="space-y-2">
								<Label>Department</Label>
								<Popover modal={false} open={openEditDepartment} onOpenChange={setOpenEditDepartment}>
									<div className={cn(!canEditDepartment && 'cursor-not-allowed')}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												className="w-full justify-between font-normal"
												disabled={!canEditDepartment}
											>
												{editForm.department_id
													? departments.find((d) => d.id.toString() === editForm.department_id)?.name
													: 'Select department'}
												<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
									</div>
									<PopoverContent portalled={false} className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
										<Command>
											<CommandInput placeholder="Search departments..." />
											<CommandList className="max-h-60">
												<CommandEmpty>No departments found.</CommandEmpty>
												<CommandGroup>
													{departments.map((department) => (
														<CommandItem
															key={department.id}
															value={department.name}
															className="cursor-pointer"
															onSelect={() => handleEditDepartmentSelect(department)}
															onClick={() => handleEditDepartmentSelect(department)}
														>
															<Check
																className={cn(
																	'mr-2 size-4',
																	editForm.department_id === String(department.id) ? 'opacity-100' : 'opacity-0',
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

							<div className="space-y-2">
								<Label htmlFor="edit_fiscal_year">Fiscal Year</Label>
								<Select
									value={editForm.fiscal_year_id}
									onValueChange={(val) =>
										setEditForm({
											...editForm,
											fiscal_year_id: val,
											fiscal_month_id: '',
											week_number: '',
											week_start_date: '',
											week_end_date: '',
										})
									}
								>
									<SelectTrigger id="edit_fiscal_year">
										<SelectValue placeholder="Select year" />
									</SelectTrigger>
									<SelectContent>
										{fiscalYears.map((year) => (
											<SelectItem key={year.id} value={String(year.id)}>
												{year.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="edit_fiscal_month">Fiscal Month</Label>
								<Select
									value={editForm.fiscal_month_id}
									onValueChange={(val) =>
										setEditForm({
											...editForm,
											fiscal_month_id: val,
											week_number: '',
											week_start_date: '',
											week_end_date: '',
										})
									}
									disabled={!editForm.fiscal_year_id}
								>
									<SelectTrigger id="edit_fiscal_month">
										<SelectValue placeholder="Select month" />
									</SelectTrigger>
									<SelectContent>
										{editFilteredFiscalMonths.map((month) => (
											<SelectItem key={month.id} value={String(month.id)}>
												{month.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="edit_budget_week">Budget Week Date</Label>
								<Input
									id="edit_budget_week"
									type="date"
									disabled={!editForm.fiscal_month_id}
									value={editForm.week_start_date}
									onChange={(e) => {
										const selectedDateStr = e.target.value;
										if (!selectedDateStr) {
											setEditForm({
												...editForm,
												week_number: '',
												week_start_date: '',
												week_end_date: '',
											});
											return;
										}
										const dateObj = new Date(selectedDateStr);
										if (!isNaN(dateObj.getTime())) {
											const monday = getMondayOfWeek(dateObj);
											const sunday = new Date(monday);
											sunday.setDate(monday.getDate() + 6);
											setEditForm({
												...editForm,
												week_number: String(getISOWeekNumber(dateObj)),
												week_start_date: toDateString(monday),
												week_end_date: toDateString(sunday),
											});
										}
									}}
								/>
								{editForm.week_number && (
									<p className="mt-1 text-xs text-slate-500">
										{formatWeekLabelFull(Number(editForm.week_number), editForm.week_start_date, editForm.week_end_date)}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="edit_amount">Amount</Label>
								<Input
									id="edit_amount"
									value={editForm.amount}
									onChange={(e) => setEditForm({ ...editForm, amount: formatBudgetInput(e.target.value) })}
									placeholder="0.00"
								/>
							</div>

							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="edit_description">Description (Optional)</Label>
								<Textarea
									id="edit_description"
									value={editForm.description}
									onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
									rows={2}
								/>
							</div>

							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="edit_note">Note (Optional)</Label>
								<Textarea
									id="edit_note"
									value={editForm.note}
									onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
									rows={2}
								/>
							</div>

							<div className="mt-4 flex justify-end gap-2 sm:col-span-2">
								<Button type="button" variant="outline" onClick={closeEditDialog} disabled={editProcessing}>
									Cancel
								</Button>
								<Button type="submit" disabled={editProcessing}>
									<Save className="mr-2 size-4" />
									Save Changes
								</Button>
							</div>
						</form>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={openNewRequest} onOpenChange={(open) => !open && closeNewRequestDialog()}>
				<DialogContent
					className="overflow-visible sm:max-w-md"
					onInteractOutside={(event) => {
						const target = event.target as HTMLElement | null;
						if (target?.closest('[data-radix-popper-content-wrapper], [data-radix-popover-content]')) {
							event.preventDefault();
						}
					}}
				>
					<DialogHeader>
						<DialogTitle>New Weekly Budget Request</DialogTitle>
						<DialogDescription>Select department and branch to proceed.</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Department</Label>
							<Popover modal={false} open={openNewDept} onOpenChange={setOpenNewDept}>
								<PopoverTrigger asChild>
									<Button variant="outline" role="combobox" className="w-full justify-between font-normal">
										{newRequestDeptOption?.name ?? 'Select department'}
										<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent portalled={false} className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search departments..." />
										<CommandList className="max-h-60">
											<CommandEmpty>No departments found.</CommandEmpty>
											<CommandGroup>
												{departments.map((department) => (
													<CommandItem
														key={department.id}
														value={department.name}
														className="cursor-pointer"
														onSelect={() => {
															setNewRequestDept(String(department.id));
															setNewRequestBranch('');
															setOpenNewDept(false);
														}}
														onClick={() => {
															setNewRequestDept(String(department.id));
															setNewRequestBranch('');
															setOpenNewDept(false);
														}}
													>
														<Check
															className={cn(
																'mr-2 size-4',
																newRequestDept === String(department.id) ? 'opacity-100' : 'opacity-0',
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

						<div className="space-y-2">
							<Label>Branch</Label>
							<Popover modal={false} open={openNewBranch} onOpenChange={setOpenNewBranch}>
								<div className={cn(!isNewRequestBranchEnabled && 'cursor-not-allowed')}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											className="w-full justify-between font-normal"
											disabled={!isNewRequestBranchEnabled}
										>
											{newRequestBranchOption?.name ?? 'Select branch'}
											<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
								</div>
								<PopoverContent portalled={false} className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search branches..." />
										<CommandList className="max-h-60">
											<CommandEmpty>No branches found.</CommandEmpty>
											<CommandGroup>
												{branches.map((branch) => (
													<CommandItem
														key={branch.id}
														value={branch.name}
														className="cursor-pointer"
														onSelect={() => {
															setNewRequestBranch(String(branch.id));
															setOpenNewBranch(false);
														}}
														onClick={() => {
															setNewRequestBranch(String(branch.id));
															setOpenNewBranch(false);
														}}
													>
														<Check
															className={cn(
																'mr-2 size-4',
																newRequestBranch === String(branch.id) ? 'opacity-100' : 'opacity-0',
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
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={closeNewRequestDialog}>
							Cancel
						</Button>
						<Button type="button" onClick={handleNewRequestContinue}>
							Continue
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}
