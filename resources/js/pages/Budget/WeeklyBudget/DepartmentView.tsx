import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Filter, Lock, StickyNote, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Weekly Budgets Department', href: '/budget/weekly-budget/department' }];

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
	payment_category_id: number | null;
	payment_type_id: number | null;
	payment_category: string | null;
	payment_type: string | null;
	submitted_at: string | null;
};

interface WeeklyBudgetList extends Pagination {
	data: WeeklyBudgetRow[];
}

type IndexProps = {
	items: WeeklyBudgetList;
	branches: BranchOption[];
	departments: DepartmentOption[];
	paymentCategories: PaymentCategoryOption[];
	paymentTypes: PaymentTypeOption[];
	fiscalYears: FiscalYearOption[];
	fiscalMonths: FiscalMonthOption[];
	requestTypes: string[];
	statusFinances: string[];
	statusDepartments: string[];
	statusCeos: string[];
	today: string;
	currentFiscalYearId?: number | null;
	request?: any;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number | null | undefined): string {
	const amount = Number(value ?? 0);
	return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isNaN(amount) ? 0 : amount);
}

function isBranchEnabledForDepartment(dept: DepartmentOption | null | undefined): boolean {
	if (!dept) return false;
	const name = dept.name.toLowerCase();
	return name.includes('operation') || name.includes('hr') || name.includes('human resource');
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

function getMondayOfWeek(d: Date): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(date.setDate(diff));
	monday.setHours(0, 0, 0, 0);
	return monday;
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

/**
 * Returns Friday 23:59:59 of the calendar week that `submittedAt` falls in.
 * If submittedAt IS a Friday, the deadline is that same day at EOD.
 */
function getFridayEodOfSubmissionWeek(submittedAt: string): Date {
	const d = new Date(submittedAt + 'T00:00:00');
	const jsDay = d.getDay(); // 0=Sun … 6=Sat
	// Convert to ISO: Mon=1 … Sun=7
	const isoDay = jsDay === 0 ? 7 : jsDay;
	const daysToFriday = (5 - isoDay + 7) % 7; // 0 when already Friday
	d.setDate(d.getDate() + daysToFriday);
	d.setHours(23, 59, 59, 999);
	return d;
}

function isWithinEditWindow(submittedAt: string | null, today: string): boolean {
	if (!submittedAt) return false;
	const deadline = getFridayEodOfSubmissionWeek(submittedAt);
	const now = new Date(today + 'T23:59:59');
	return now <= deadline;
}

function isDepartmentStatusLocked(item: WeeklyBudgetRow): boolean {
	return item.status_finance === 'paid' || item.status_ceo === 'approved';
}

function getDepartmentEditLockReason(item: WeeklyBudgetRow): string {
	if (item.status_finance === 'paid') {
		return 'Locked — Finance Status is Paid';
	}
	if (item.status_ceo === 'approved') {
		return 'Locked — CEO Status is Approved';
	}
	return 'Locked';
}

function statusBadge(status: string, _variant: 'finance' | 'ceo' | 'department') {
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function WeeklyBudgetDepartmentView({
	items,
	branches,
	departments,
	paymentCategories,
	paymentTypes,
	fiscalYears,
	fiscalMonths,
	requestTypes,
	statusFinances,
	statusDepartments,
	statusCeos,
	today,
	currentFiscalYearId,
	request,
}: IndexProps) {
	const { flash, errors } = usePage<any>().props;
	const { can } = usePermission();
	const canManageDept = can('manage department budgets');

	// ── Filter state ────────────────────────────────────────────────────────
	const [selectedRequestType, setSelectedRequestType] = useState<string>(request?.request_type ?? 'all');
	const [selectedStatusFinance, setSelectedStatusFinance] = useState<string>(request?.status_finance ?? 'all');
	const [selectedStatusDepartment, setSelectedStatusDepartment] = useState<string>(request?.status_department ?? 'all');
	const [selectedStatusCeo, setSelectedStatusCeo] = useState<string>(request?.status_ceo ?? 'all');
	const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
	const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
	const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(request?.fiscal_year_id ?? 'all');
	const [selectedFiscalMonth, setSelectedFiscalMonth] = useState<string>(request?.fiscal_month_id ?? 'all');
	const [selectedWeekStartDate, setSelectedWeekStartDate] = useState<string>(request?.week_start_date ?? 'all');
	const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<string>(request?.payment_category_id ?? 'all');
	const [selectedPaymentType, setSelectedPaymentType] = useState<string>(request?.payment_type_id ?? 'all');

	const [openBranchFilter, setOpenBranchFilter] = useState(false);
	const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);
	const [openPaymentTypeFilter, setOpenPaymentTypeFilter] = useState(false);

	// ── Edit state ──────────────────────────────────────────────────────────
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<any>({});
	// Tracks whether the inline note field is required for the current edit
	const [noteMismatchIds, setNoteMismatchIds] = useState<number[]>([]);

	// ── Delete confirm dialog ────────────────────────────────────────────────
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteItem, setDeleteItem] = useState<WeeklyBudgetRow | null>(null);

	// ── Note popup dialog ───────────────────────────────────────────────────
	const [noteDialogItem, setNoteDialogItem] = useState<WeeklyBudgetRow | null>(null);
	const [noteDialogText, setNoteDialogText] = useState<string>('');

	// ── Derived ─────────────────────────────────────────────────────────────
	const selectedDepartmentOption = useMemo(
		() => (selectedDepartment === 'all' ? null : (departments.find((d) => d.id.toString() === selectedDepartment) ?? null)),
		[selectedDepartment, departments],
	);
	const canFilterByBranch = useMemo(() => isBranchEnabledForDepartment(selectedDepartmentOption), [selectedDepartmentOption]);
	const selectedBranchOption = useMemo(
		() => (selectedBranch === 'all' ? null : (branches.find((b) => b.id.toString() === selectedBranch) ?? null)),
		[selectedBranch, branches],
	);

	const filteredFiscalMonths = useMemo(() => {
		if (selectedFiscalYear === 'all') return fiscalMonths;
		return fiscalMonths.filter((m) => String(m.fiscal_year_id) === selectedFiscalYear);
	}, [fiscalMonths, selectedFiscalYear]);

	const filteredPaymentTypesFilter = useMemo(() => {
		if (selectedPaymentCategory === 'all') return paymentTypes;
		return paymentTypes.filter((pt) => String(pt.payment_category_id) === selectedPaymentCategory);
	}, [paymentTypes, selectedPaymentCategory]);

	const weekFilterOptions = useMemo((): WeekOption[] => {
		const hasYear = selectedFiscalYear !== 'all';
		const hasMonth = selectedFiscalMonth !== 'all';
		if (hasMonth) {
			const fy = fiscalYears.find((y) => String(y.id) === selectedFiscalYear);
			const fm = fiscalMonths.find((m) => String(m.id) === selectedFiscalMonth);
			if (fy && fm) return buildFiscalMonthWeeks(fy, fm);
			return [];
		}
		if (hasYear) {
			const fy = fiscalYears.find((y) => String(y.id) === selectedFiscalYear);
			if (fy) return buildFiscalYearAllWeeks(fy);
			return [];
		}
		if (currentFiscalYearId) {
			const fy = fiscalYears.find((y) => y.id === currentFiscalYearId);
			if (fy) return buildCurrentFiscalYearWeeks(fy, today);
		}
		return [];
	}, [selectedFiscalYear, selectedFiscalMonth, fiscalYears, fiscalMonths, currentFiscalYearId, today]);

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
		if (errors?.status_department) toast.error(errors.status_department);
		if (errors?.note) toast.error(errors.note);
		if (errors?.delete) toast.error(errors.delete);
		if (errors?.edit) toast.error(errors.edit);
	}, [flash?.message, errors]);

	// ── Filter helpers ───────────────────────────────────────────────────────
	function buildFilterParams(): Record<string, string> {
		const params: Record<string, string> = {};
		if (selectedRequestType !== 'all') params.request_type = selectedRequestType;
		if (selectedStatusFinance !== 'all') params.status_finance = selectedStatusFinance;
		if (selectedStatusDepartment !== 'all') params.status_department = selectedStatusDepartment;
		if (selectedStatusCeo !== 'all') params.status_ceo = selectedStatusCeo;
		if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
		if (selectedBranch !== 'all') params.branch_id = selectedBranch;
		if (selectedFiscalYear !== 'all') params.fiscal_year_id = selectedFiscalYear;
		if (selectedFiscalMonth !== 'all') params.fiscal_month_id = selectedFiscalMonth;
		if (selectedWeekStartDate !== 'all') params.week_start_date = selectedWeekStartDate;
		if (selectedPaymentCategory !== 'all') params.payment_category_id = selectedPaymentCategory;
		if (selectedPaymentType !== 'all') params.payment_type_id = selectedPaymentType;
		return params;
	}

	function applyFilters(overrides: Record<string, string> = {}) {
		const params = { ...buildFilterParams(), ...overrides };
		Object.keys(params).forEach((key) => {
			if (params[key] === 'all') delete params[key];
		});
		router.get('/budget/weekly-budget/department', params, { preserveState: true, replace: true });
	}

	function handleDepartmentFilterSelect(departmentId: string) {
		setOpenDepartmentFilter(false);
		setSelectedDepartment(departmentId);
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

	function clearFilters() {
		setSelectedRequestType('all');
		setSelectedStatusFinance('all');
		setSelectedStatusDepartment('all');
		setSelectedStatusCeo('all');
		setSelectedDepartment('all');
		setSelectedBranch('all');
		setSelectedFiscalYear('all');
		setSelectedFiscalMonth('all');
		setSelectedWeekStartDate('all');
		setSelectedPaymentCategory('all');
		setSelectedPaymentType('all');
		router.get('/budget/weekly-budget/department', {}, { preserveState: true, replace: true });
	}

	const hasActiveFilters = [
		selectedRequestType,
		selectedStatusFinance,
		selectedStatusDepartment,
		selectedStatusCeo,
		selectedDepartment,
		selectedBranch,
		selectedFiscalYear,
		selectedFiscalMonth,
		selectedWeekStartDate,
		selectedPaymentCategory,
		selectedPaymentType,
	].some((v) => v !== 'all');

	// ── Edit helpers ─────────────────────────────────────────────────────────

	/**
	 * Returns true when the new dept status differs from finance status
	 * AND is not one of the "free" statuses (pending / approved).
	 */
	function statusMismatchNoteRequired(newDeptStatus: string, financeStatus: string): boolean {
		const freeStatuses = ['pending', 'approved'];
		return newDeptStatus !== financeStatus && !freeStatuses.includes(newDeptStatus);
	}

	function startEditRow(item: WeeklyBudgetRow) {
		setEditingRowId(item.id);
		setEditForm({
			status_department: item.status_department,
			payment_category_id: item.payment_category_id ? String(item.payment_category_id) : '',
			payment_type_id: item.payment_type_id ? String(item.payment_type_id) : '',
			request_type: item.request_type,
			amount: String(item.amount),
			inline_note: item.note ?? '',
		});
		// Compute initial mismatch state
		if (statusMismatchNoteRequired(item.status_department, item.status_finance)) {
			setNoteMismatchIds((prev) => [...prev.filter((id) => id !== item.id), item.id]);
		}
	}

	function saveEditRow(item: WeeklyBudgetRow) {
		const withinEditWindow = isWithinEditWindow(item.submitted_at, today);

		// Downgrade: approved → pending always requires a note
		const isDowngrade = item.status_department === 'approved' && editForm.status_department === 'pending';

		// Status mismatch with finance: note required unless new status is pending/approved
		const mismatchNoteNeeded = statusMismatchNoteRequired(editForm.status_department, item.status_finance);

		if ((isDowngrade || mismatchNoteNeeded) && !editForm.inline_note?.trim()) {
			toast.error('A note is required before saving.');
			// Ensure note field is visible
			setNoteMismatchIds((prev) => [...prev.filter((id) => id !== item.id), item.id]);
			return;
		}

		const payload: Record<string, string | number | null> = {
			status_department: editForm.status_department,
			note: editForm.inline_note?.trim() || null,
		};

		if (withinEditWindow) {
			payload.payment_category_id = editForm.payment_category_id || null;
			payload.payment_type_id = editForm.payment_type_id || null;
			payload.request_type = editForm.request_type;
			payload.amount = editForm.amount;
		}

		router.patch(`/budget/weekly-budget/${item.id}/department-status`, payload, {
			preserveScroll: true,
			onSuccess: () => {
				setEditingRowId(null);
				setNoteMismatchIds((prev) => prev.filter((id) => id !== item.id));
			},
		});
	}

	// ── Delete helpers ────────────────────────────────────────────────────────
	function confirmDelete() {
		if (!deleteItem) return;
		router.delete(`/budget/weekly-budget/${deleteItem.id}/department-delete`, {
			preserveScroll: true,
			onSuccess: () => {
				setDeleteDialogOpen(false);
				setDeleteItem(null);
			},
		});
	}

	// ── Note Popup helpers ──────────────────────────────────────────────────
	function openNotePopup(item: WeeklyBudgetRow) {
		setNoteDialogItem(item);
		setNoteDialogText(item.note ?? '');
	}

	function saveNotePopup() {
		if (!noteDialogItem) return;
		if (isDepartmentStatusLocked(noteDialogItem)) {
			return toast.error('Editing is locked because Finance Status is Paid or CEO Status is Approved.');
		}
		router.patch(
			`/budget/weekly-budget/${noteDialogItem.id}/department-status`,
			{
				status_department: noteDialogItem.status_department,
				note: noteDialogText.trim() || null,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setNoteDialogItem(null);
				},
			}
		);
	}

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Weekly Budgets - Department View" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Weekly Budgets — Department View</h1>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" /> Filters
						</CardTitle>
						<div className="flex flex-wrap items-end gap-3 pt-2">
							{/* Department */}
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

							{/* Branch */}
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
													<Check className={cn('mr-2 size-4', selectedBranch === 'all' ? 'opacity-100' : 'opacity-0')} />{' '}
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

							{/* Fiscal Year */}
							<Select
								value={selectedFiscalYear}
								onValueChange={(v) => {
									setSelectedFiscalYear(v);
									setSelectedFiscalMonth('all');
									setSelectedWeekStartDate('all');
									applyFilters({ fiscal_year_id: v, fiscal_month_id: 'all', week_start_date: 'all' });
								}}
							>
								<SelectTrigger className="w-[150px]">
									<SelectValue placeholder="Fiscal Year" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Years</SelectItem>
									{fiscalYears.map((year) => (
										<SelectItem key={year.id} value={year.id.toString()}>
											{year.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Fiscal Month */}
							<Select
								value={selectedFiscalMonth}
								onValueChange={(v) => {
									setSelectedFiscalMonth(v);
									setSelectedWeekStartDate('all');
									applyFilters({ fiscal_month_id: v, week_start_date: 'all' });
								}}
							>
								<SelectTrigger className="w-[150px]">
									<SelectValue placeholder="Fiscal Month" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Months</SelectItem>
									{filteredFiscalMonths.map((month) => (
										<SelectItem key={month.id} value={month.id.toString()}>
											{month.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Fiscal Week */}
							<Select
								value={selectedWeekStartDate}
								onValueChange={(v) => {
									setSelectedWeekStartDate(v);
									applyFilters({ week_start_date: v });
								}}
							>
								<SelectTrigger className="w-[200px]">
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

							{/* Finance Status (read-only filter) */}
							<Select
								value={selectedStatusFinance}
								onValueChange={(v) => {
									setSelectedStatusFinance(v);
									applyFilters({ status_finance: v });
								}}
							>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="Finance Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Finance Status</SelectItem>
									{statusFinances.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* CEO Status (read-only filter) */}
							<Select
								value={selectedStatusCeo}
								onValueChange={(v) => {
									setSelectedStatusCeo(v);
									applyFilters({ status_ceo: v });
								}}
							>
								<SelectTrigger className="w-[150px]">
									<SelectValue placeholder="CEO Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All CEO Status</SelectItem>
									{statusCeos.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Department Status (editable filter) */}
							<Select
								value={selectedStatusDepartment}
								onValueChange={(v) => {
									setSelectedStatusDepartment(v);
									applyFilters({ status_department: v });
								}}
							>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="Dept Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Dept Status</SelectItem>
									{statusDepartments.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Payment Category */}
							<Select
								value={selectedPaymentCategory}
								onValueChange={(v) => {
									setSelectedPaymentCategory(v);
									setSelectedPaymentType('all');
									applyFilters({ payment_category_id: v, payment_type_id: 'all' });
								}}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Payment Category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Categories</SelectItem>
									{paymentCategories.map((pc) => (
										<SelectItem key={pc.id} value={String(pc.id)}>
											{pc.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Payment Type — searchable combobox */}
							<Popover open={openPaymentTypeFilter} onOpenChange={setOpenPaymentTypeFilter}>
								<PopoverTrigger asChild>
									<Button variant="outline" role="combobox" className="w-[220px] justify-between font-normal">
										{selectedPaymentType === 'all'
											? 'All Payment Types'
											: (filteredPaymentTypesFilter.find((pt) => String(pt.id) === selectedPaymentType)?.name ??
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
													/>{' '}
													All Payment Types
												</CommandItem>
												{filteredPaymentTypesFilter.map((pt) => (
													<CommandItem
														key={pt.id}
														value={pt.name}
														onSelect={() => {
															setSelectedPaymentType(String(pt.id));
															setOpenPaymentTypeFilter(false);
															applyFilters({ payment_type_id: String(pt.id) });
														}}
													>
														<Check
															className={cn(
																'mr-2 size-4',
																selectedPaymentType === String(pt.id) ? 'opacity-100' : 'opacity-0',
															)}
														/>
														{pt.name}
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
					</CardHeader>

					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">Department</TableHead>
									<TableHead className="font-bold text-white">Branch</TableHead>
									<TableHead className="font-bold text-white">Request Type</TableHead>
									<TableHead className="font-bold text-white">Status (Dept)</TableHead>
									<TableHead className="font-bold text-white">Status (Finance)</TableHead>
									<TableHead className="font-bold text-white">Status (CEO)</TableHead>
									<TableHead className="font-bold text-white">Payment Category</TableHead>
									<TableHead className="font-bold text-white">Payment Type</TableHead>
									<TableHead className="font-bold text-white">Amount</TableHead>
									<TableHead className="font-bold text-white">Note</TableHead>
									{canManageDept && <TableHead className="font-bold text-white">Actions</TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.data.map((item) => {
									const isEditing = editingRowId === item.id;
									const statusLocked = isDepartmentStatusLocked(item);
									const withinEditWindow = isWithinEditWindow(item.submitted_at, today);
									const canEditRow = canManageDept && !statusLocked;
									const canEditSubmissionData = isEditing && withinEditWindow;

									// Payment type filtered by the current edit form's selected category
									const itemFilteredPaymentTypes = paymentTypes.filter(
										(pt) => String(pt.payment_category_id) === editForm.payment_category_id,
									);

									// Note required: downgrade OR status mismatch with finance (excluding pending/approved)
									const isDowngrade =
										isEditing && item.status_department === 'approved' && editForm.status_department === 'pending';
									const isMismatch = isEditing && statusMismatchNoteRequired(editForm.status_department, item.status_finance);
									const noteRequired = isEditing && (isDowngrade || isMismatch);

									return (
										<TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
											<TableCell>{item.department ?? '-'}</TableCell>
											<TableCell>{item.branch ?? '-'}</TableCell>

											{/* Request Type — editable within submission edit window */}
											<TableCell>
												{canEditSubmissionData ? (
													<Select
														value={editForm.request_type}
														onValueChange={(v) => setEditForm({ ...editForm, request_type: v })}
													>
														<SelectTrigger className="w-[110px]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{requestTypes.map((rt) => (
																<SelectItem key={rt} value={rt}>
																	{rt.charAt(0).toUpperCase() + rt.slice(1)}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													requestTypeBadge(item.request_type)
												)}
											</TableCell>

											{/* Department Status — editable unless row is locked */}
											<TableCell>
												{isEditing ? (
													<Select
														value={editForm.status_department}
														onValueChange={(v) => setEditForm({ ...editForm, status_department: v })}
													>
														<SelectTrigger className="w-[130px]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{statusDepartments.map((s) => (
																<SelectItem key={s} value={s}>
																	{s.charAt(0).toUpperCase() + s.slice(1)}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<div className="flex items-center gap-1.5">
														{statusBadge(item.status_department, 'department')}
														{statusLocked && (
															<Tooltip>
																<TooltipTrigger asChild>
																	<Lock className="size-3 text-slate-400" />
																</TooltipTrigger>
																<TooltipContent side="top">{getDepartmentEditLockReason(item)}</TooltipContent>
															</Tooltip>
														)}
													</div>
												)}
											</TableCell>

											{/* Finance Status — always read-only */}
											<TableCell>{statusBadge(item.status_finance, 'finance')}</TableCell>

											{/* CEO Status — always read-only */}
											<TableCell>{statusBadge(item.status_ceo, 'ceo')}</TableCell>

											{/* Payment Category — editable within submission edit window */}
											<TableCell>
												{canEditSubmissionData ? (
													<Select
														value={editForm.payment_category_id}
														onValueChange={(v) => setEditForm({ ...editForm, payment_category_id: v, payment_type_id: '' })}
													>
														<SelectTrigger className="w-[140px]">
															<SelectValue placeholder="Category" />
														</SelectTrigger>
														<SelectContent>
															{paymentCategories.map((pc) => (
																<SelectItem key={pc.id} value={String(pc.id)}>
																	{pc.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													(item.payment_category ?? '-')
												)}
											</TableCell>

											{/* Payment Type — searchable combobox within submission edit window */}
											<TableCell>
												{canEditSubmissionData ? (
													<Popover>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																role="combobox"
																disabled={!editForm.payment_category_id}
																className="w-[200px] justify-between font-normal"
															>
																{editForm.payment_type_id
																	? (itemFilteredPaymentTypes.find((pt) => String(pt.id) === editForm.payment_type_id)?.name ??
																		'Select type')
																	: 'Select type'}
																<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-[240px] p-0" align="start">
															<Command>
																<CommandInput placeholder="Search types..." />
																<CommandList className="max-h-52">
																	<CommandEmpty>No types found.</CommandEmpty>
																	<CommandGroup>
																		{itemFilteredPaymentTypes.map((pt) => (
																			<CommandItem
																				key={pt.id}
																				value={pt.name}
																				onSelect={() => setEditForm({ ...editForm, payment_type_id: String(pt.id) })}
																			>
																				<Check
																					className={cn(
																						'mr-2 size-4',
																						editForm.payment_type_id === String(pt.id) ? 'opacity-100' : 'opacity-0',
																					)}
																				/>
																				{pt.name}
																			</CommandItem>
																		))}
																	</CommandGroup>
																</CommandList>
															</Command>
														</PopoverContent>
													</Popover>
												) : (
													(item.payment_type ?? '-')
												)}
											</TableCell>

											{/* Amount — editable within submission edit window */}
											<TableCell className="whitespace-nowrap">
												{canEditSubmissionData ? (
													<input
														type="number"
														min="0"
														step="0.01"
														value={editForm.amount}
														onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
														className="w-[130px] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:outline-none"
													/>
												) : (
													formatCurrency(item.amount)
												)}
											</TableCell>

											{/* Note — icon shows existing note; textarea appears in edit mode when required */}
											<TableCell className="min-w-[180px]">
												{isEditing && noteRequired ? (
													<div className="flex flex-col gap-1">
														<Textarea
															id={`inline-note-${item.id}`}
															value={editForm.inline_note}
															onChange={(e) => setEditForm({ ...editForm, inline_note: e.target.value })}
															placeholder="Note required…"
															rows={2}
															className="resize-none text-xs"
														/>
														<span className="text-[10px] font-medium text-amber-600">
															Required for this status change
														</span>
													</div>
												) : (
													<button
														type="button"
														onClick={() => openNotePopup(item)}
														className={cn(
															'flex items-center gap-1 rounded p-1 transition-colors',
															item.note
																? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700'
																: 'text-slate-300 hover:text-slate-500',
														)}
														aria-label={item.note ? 'View/Edit note' : 'Add note'}
													>
														<StickyNote className="size-4" />
													</button>
												)}
											</TableCell>

											{/* Actions — last column */}
											{canManageDept && (
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
													) : (
														<div className="flex items-center gap-1">
															{canEditRow ? (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => startEditRow(item)}
																	className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
																>
																	Edit
																</Button>
															) : (
																canManageDept &&
																statusLocked && (
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<span className="inline-flex cursor-not-allowed items-center gap-1 px-2 py-1 text-xs text-slate-400">
																				<Lock className="size-3" />
																				Locked
																			</span>
																		</TooltipTrigger>
																		<TooltipContent side="top">{getDepartmentEditLockReason(item)}</TooltipContent>
																	</Tooltip>
																)
															)}
															{canEditRow && withinEditWindow ? (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => {
																		setDeleteItem(item);
																		setDeleteDialogOpen(true);
																	}}
																	className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
																>
																	<Trash2 className="size-3.5" />
																</Button>
															) : (
																canEditRow &&
																!withinEditWindow && (
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<span className="inline-flex cursor-not-allowed p-1 text-slate-300">
																				<Trash2 className="size-3.5" />
																			</span>
																		</TooltipTrigger>
																		<TooltipContent side="top">
																			Delete available until Friday EOD of submission week
																		</TooltipContent>
																	</Tooltip>
																)
															)}
														</div>
													)}
												</TableCell>
											)}
										</TableRow>
									);
								})}
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

			{/* ── Delete Confirm Dialog ─────────────────────────────────────── */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete Entry</DialogTitle>
						<DialogDescription>
							Are you sure you want to permanently delete this budget entry? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={() => {
								setDeleteDialogOpen(false);
								setDeleteItem(null);
							}}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Note Popup Dialog ─────────────────────────────────────────── */}
			<Dialog open={!!noteDialogItem} onOpenChange={(open) => !open && setNoteDialogItem(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{noteDialogItem && !isDepartmentStatusLocked(noteDialogItem)
								? noteDialogItem.note
									? 'Edit Note'
									: 'Add Note'
								: 'View Note'}
						</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						{noteDialogItem && !isDepartmentStatusLocked(noteDialogItem) ? (
							<Textarea
								value={noteDialogText}
								onChange={(e) => setNoteDialogText(e.target.value)}
								placeholder="Enter note details..."
								rows={5}
								className="resize-none"
							/>
						) : (
							<p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
								{noteDialogItem?.note || <span className="text-slate-400 italic">No note added.</span>}
							</p>
						)}
					</div>
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setNoteDialogItem(null)}>
							Cancel
						</Button>
						{noteDialogItem && !isDepartmentStatusLocked(noteDialogItem) && (
							<Button
								onClick={saveNotePopup}
								disabled={noteDialogText === (noteDialogItem?.note ?? '')}
							>
								Save Changes
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}
