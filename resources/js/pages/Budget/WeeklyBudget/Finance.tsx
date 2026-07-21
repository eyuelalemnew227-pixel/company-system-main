import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Check, ChevronsUpDown, FileText, Filter, MessageSquare, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Weekly Budgets Finance', href: '/budget/weekly-budget/finance' }];

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
	currentFiscalMonthId?: number | null;
	request?: any;
};

function formatCurrency(value: string | number | null | undefined): string {
	const amount = Number(value ?? 0);
	return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isNaN(amount) ? 0 : amount);
}

function formatAmountInput(value: string): string {
	const raw = value.replace(/[^0-9.]/g, '');
	const firstDot = raw.indexOf('.');
	const cleaned = firstDot === -1 ? raw : raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
	const [intPart, decPart] = cleaned.split('.');
	const trimmedInt = intPart.replace(/^0+(?=\d)/, '');
	const formattedInt = trimmedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return decPart !== undefined ? `${formattedInt}.${decPart.slice(0, 2)}` : formattedInt;
}

function stripCommas(value: string): string {
	return value.replace(/,/g, '');
}

type FinanceEditMode = 'full' | 'mark-paid' | 'revert-paid';

function getFinanceEditMode(item: WeeklyBudgetRow, canManageFinance: boolean, canOverridePaid: boolean): FinanceEditMode | null {
	if (!canManageFinance || item.status_department !== 'approved') {
		return null;
	}

	if (item.status_finance === 'paid') {
		return canOverridePaid ? 'revert-paid' : null;
	}

	if (item.status_ceo === 'approved' && item.status_finance === 'approved') {
		return 'mark-paid';
	}

	if (item.status_ceo !== 'approved') {
		return 'full';
	}

	return null;
}

function getAllowedFinanceStatuses(item: WeeklyBudgetRow, editMode: FinanceEditMode, allStatuses: string[]): string[] {
	switch (editMode) {
		case 'revert-paid':
			return ['approved'];
		case 'mark-paid':
			return ['approved', 'paid'];
		case 'full':
			return allStatuses.filter((status) => status !== 'paid');
		default:
			return [];
	}
}

function isBranchEnabledForDepartment(dept: DepartmentOption | null | undefined): boolean {
	if (!dept) return false;
	const name = dept.name.toLowerCase();
	return name.includes('operation') || name.includes('hr') || name.includes('human resource');
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

function buildCurrentFiscalYearWeeks(fiscalYear: FiscalYearOption, todayStr: string): WeekOption[] {
	if (!fiscalYear.gregorian_start_date || !fiscalYear.gregorian_end_date) return [];
	const fyStart = new Date(fiscalYear.gregorian_start_date + 'T00:00:00');
	const fyEnd = new Date(fiscalYear.gregorian_end_date + 'T00:00:00');
	const today = new Date(todayStr + 'T00:00:00');
	const twoWeeksAheadMonday = getMondayOfWeek(today);
	twoWeeksAheadMonday.setDate(twoWeeksAheadMonday.getDate() + 14);
	const cutoff = twoWeeksAheadMonday;
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

export default function WeeklyBudgetFinance({
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
	currentFiscalMonthId,
	request,
}: IndexProps) {
	const { flash, errors } = usePage<any>().props;
	const { can } = usePermission();
	const canManageFinance = can('manage finance budgets');
	const canOverridePaid = can('override_paid_status');

	const [selectedRequestType, setSelectedRequestType] = useState<string>(request?.request_type ?? 'all');
	const [selectedStatusFinance, setSelectedStatusFinance] = useState<string>(request?.status_finance ?? 'all');
	const [selectedStatusDepartment, setSelectedStatusDepartment] = useState<string>(request?.status_department ?? 'all');
	const [selectedStatusCeo, setSelectedStatusCeo] = useState<string>(request?.status_ceo ?? 'all');

	const [viewNoteItem, setViewNoteItem] = useState<WeeklyBudgetRow | null>(null);

	const [descriptionDialogItem, setDescriptionDialogItem] = useState<WeeklyBudgetRow | null>(null);
	const [descriptionDialogText, setDescriptionDialogText] = useState<string>('');
	const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
	const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
	const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(
		request?.fiscal_year_id ?? (currentFiscalYearId ? String(currentFiscalYearId) : 'all'),
	);
	const [selectedFiscalMonth, setSelectedFiscalMonth] = useState<string>(
		request?.fiscal_month_id ?? (currentFiscalMonthId ? String(currentFiscalMonthId) : 'all'),
	);
	const [selectedWeekStartDate, setSelectedWeekStartDate] = useState<string>(request?.week_start_date ?? 'all');
	const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<string>(request?.payment_category_id ?? 'all');
	const [selectedPaymentType, setSelectedPaymentType] = useState<string>(request?.payment_type_id ?? 'all');

	const [openBranchFilter, setOpenBranchFilter] = useState(false);
	const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);
	const [openPaymentTypeFilter, setOpenPaymentTypeFilter] = useState(false);

	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [bulkStatus, setBulkStatus] = useState<string>('');

	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<any>({});

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
		if (errors?.status_finance) toast.error(errors.status_finance);
	}, [flash?.message, errors]);

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
		if (selectedPaymentCategory !== 'all') params.payment_category_id = selectedPaymentCategory;
		if (selectedPaymentType !== 'all') params.payment_type_id = selectedPaymentType;
		return params;
	}

	function applyFilters(overrides: Record<string, string> = {}) {
		const params = { ...buildFilterParams(), ...overrides };
		Object.keys(params).forEach((key) => {
			if (params[key] === 'all' && key !== 'fiscal_year_id' && key !== 'fiscal_month_id') {
				delete params[key];
			}
		});
		router.get('/budget/weekly-budget/finance', params, { preserveState: true, replace: true });
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
		setSelectedFiscalYear(currentFiscalYearId ? String(currentFiscalYearId) : 'all');
		setSelectedFiscalMonth(currentFiscalMonthId ? String(currentFiscalMonthId) : 'all');
		setSelectedWeekStartDate('all');
		setSelectedPaymentCategory('all');
		setSelectedPaymentType('all');
		router.get(
			'/budget/weekly-budget/finance',
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
		selectedWeekStartDate !== 'all' ||
		selectedPaymentCategory !== 'all' ||
		selectedPaymentType !== 'all';

	const allSelectableIds = useMemo(() => {
		return items.data.filter((item) => item.status_department === 'approved' && item.status_finance !== 'paid').map((item) => item.id);
	}, [items.data]);

	const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.includes(id));
	const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

	function toggleSelectAll() {
		if (isAllSelected) setSelectedIds([]);
		else setSelectedIds(allSelectableIds);
	}

	function toggleSelectRow(id: number) {
		if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((i) => i !== id));
		else setSelectedIds([...selectedIds, id]);
	}

	function handleBulkUpdate() {
		if (!bulkStatus) return toast.error('Select a status to apply.');
		if (selectedIds.length === 0) return toast.error('Select at least one item.');

		router.patch(
			'/budget/weekly-budget/finance/bulk',
			{
				ids: selectedIds,
				status_finance: bulkStatus,
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

	function startEditRow(item: WeeklyBudgetRow) {
		setEditingRowId(item.id);
		setEditForm({
			status_finance: item.status_finance,
			payment_category_id: item.payment_category_id ? String(item.payment_category_id) : '',
			payment_type_id: item.payment_type_id ? String(item.payment_type_id) : '',
			request_type: item.request_type,
			amount: formatAmountInput(String(item.amount)),
		});
	}
	function saveEditRow(item: WeeklyBudgetRow) {
		const editMode = getFinanceEditMode(item, canManageFinance, canOverridePaid);
		if (!editMode) return;

		if (editForm.status_finance === 'paid') {
			if (item.status_ceo !== 'approved') {
				return toast.error('Cannot mark as Paid until CEO Status is Approved.');
			}
			if (!editForm.payment_category_id || !editForm.payment_type_id) {
				return toast.error('Payment Category and Payment Type are required to mark as Paid.');
			}
		}

		if (item.status_finance === 'paid' && editForm.status_finance === 'approved' && !canOverridePaid) {
			return toast.error('You do not have permission to revert Paid status.');
		}

		router.patch(
			`/budget/weekly-budget/${item.id}/finance-status`,
			{
				status_finance: editForm.status_finance,
				payment_category_id: editForm.payment_category_id || null,
				payment_type_id: editForm.payment_type_id || null,
				request_type: editMode === 'full' ? editForm.request_type : item.request_type,
				amount: editMode === 'full' ? stripCommas(editForm.amount) : item.amount,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setEditingRowId(null);
				},
			},
		);
	}

	function canEditDescription(item: WeeklyBudgetRow): boolean {
		return getFinanceEditMode(item, canManageFinance, canOverridePaid) === 'full';
	}

	function openDescriptionPopup(item: WeeklyBudgetRow) {
		setDescriptionDialogItem(item);
		setDescriptionDialogText(item.description ?? '');
	}

	function saveDescriptionPopup() {
		if (!descriptionDialogItem) return;
		router.patch(
			`/budget/weekly-budget/${descriptionDialogItem.id}/finance-status`,
			{
				status_finance: descriptionDialogItem.status_finance,
				description: descriptionDialogText.trim() || null,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setDescriptionDialogItem(null);
				},
			},
		);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Weekly Budgets - Finance View" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Weekly Budgets - Finance View</h1>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" /> Filters
						</CardTitle>
						<div className="flex flex-wrap items-end gap-3 pt-2">
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

							<Select
								value={selectedStatusDepartment}
								onValueChange={(v) => {
									setSelectedStatusDepartment(v);
									applyFilters({ status_department: v });
								}}
							>
								<SelectTrigger className="w-[150px]">
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
													/>
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

						{canManageFinance && (
							<div className="mt-6 flex items-center gap-3 rounded-lg border bg-slate-50 p-3 dark:bg-slate-900">
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
									{canManageFinance && (
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
									<TableHead className="font-bold text-white">Status (Finance)</TableHead>
									<TableHead className="font-bold text-white">Status (Dept)</TableHead>
									<TableHead className="font-bold text-white">Status (CEO)</TableHead>
									<TableHead className="font-bold text-white">Payment Category</TableHead>
									<TableHead className="font-bold text-white">Payment Type</TableHead>
									<TableHead className="font-bold text-white">Description</TableHead>
									<TableHead className="font-bold text-white">Note</TableHead>
									<TableHead className="font-bold text-white">Amount</TableHead>
									{canManageFinance && <TableHead className="font-bold text-white">Actions</TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.data.map((item) => {
									const isEditing = editingRowId === item.id;
									const editMode = getFinanceEditMode(item, canManageFinance, canOverridePaid);
									const isEditable = editMode !== null;
									const allowedFinanceStatuses = editMode ? getAllowedFinanceStatuses(item, editMode, statusFinances) : [];
									const canEditPaymentFields = isEditing && editMode !== 'revert-paid';
									const canEditRequestFields = isEditing && editMode === 'full';

									const itemFilteredPaymentTypes = paymentTypes.filter(
										(pt) => String(pt.payment_category_id) === editForm.payment_category_id,
									);

									return (
										<TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
											{canManageFinance && (
												<TableCell className="text-center">
													<Checkbox
														checked={selectedIds.includes(item.id)}
														onCheckedChange={() => toggleSelectRow(item.id)}
														disabled={item.status_department !== 'approved' || item.status_finance === 'paid'}
													/>
												</TableCell>
											)}
											<TableCell>{item.department ?? '-'}</TableCell>
											<TableCell>{item.branch ?? '-'}</TableCell>
											<TableCell>
												{canEditRequestFields ? (
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
											<TableCell>
												{isEditing ? (
													<Select
														value={editForm.status_finance}
														onValueChange={(v) => setEditForm({ ...editForm, status_finance: v })}
													>
														<SelectTrigger className="w-[120px]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{allowedFinanceStatuses.map((s) => (
																<SelectItem key={s} value={s}>
																	{s.charAt(0).toUpperCase() + s.slice(1)}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													statusBadge(item.status_finance, 'finance')
												)}
											</TableCell>

											<TableCell>{statusBadge(item.status_department, 'department')}</TableCell>
											<TableCell>{statusBadge(item.status_ceo, 'ceo')}</TableCell>

											<TableCell>
												{canEditPaymentFields ? (
													<Select
														value={editForm.payment_category_id}
														onValueChange={(v) =>
															setEditForm({ ...editForm, payment_category_id: v, payment_type_id: '' })
														}
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

											{/* Payment Type — searchable combobox when editing */}
											<TableCell>
												{canEditPaymentFields ? (
													<Popover>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																role="combobox"
																disabled={!editForm.payment_category_id}
																className="w-[200px] justify-between font-normal"
															>
																{editForm.payment_type_id
																	? (itemFilteredPaymentTypes.find(
																			(pt) => String(pt.id) === editForm.payment_type_id,
																		)?.name ?? 'Select type')
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
																				onSelect={() =>
																					setEditForm({ ...editForm, payment_type_id: String(pt.id) })
																				}
																			>
																				<Check
																					className={cn(
																						'mr-2 size-4',
																						editForm.payment_type_id === String(pt.id)
																							? 'opacity-100'
																							: 'opacity-0',
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

											<TableCell>
												<button
													type="button"
													className={cn(
														'flex items-center justify-center rounded p-1 transition-colors',
														item.description
															? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700'
															: 'cursor-pointer text-slate-300 hover:text-slate-500',
													)}
													onClick={() => openDescriptionPopup(item)}
													aria-label="View description"
												>
													<FileText className="size-4" />
												</button>
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

											<TableCell className="whitespace-nowrap">
												{canEditRequestFields ? (
													<input
														type="text"
														inputMode="decimal"
														value={editForm.amount}
														onChange={(e) => setEditForm({ ...editForm, amount: formatAmountInput(e.target.value) })}
														className="w-28 rounded border px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
													/>
												) : (
													formatCurrency(item.amount)
												)}
											</TableCell>

											{/* Actions — last column */}
											{canManageFinance && (
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
						</Table>
					</CardContent>
					{items.data.length > 0 ? (
						<TablePagination total={items.total} from={items.from} to={items.to} links={items.links} />
					) : (
						<div className="flex h-full items-center justify-center py-8">No Results Found!</div>
					)}
				</Card>
			</div>

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

			{/* ── Description Dialog ─────────────────────────────────────────── */}
			<Dialog open={!!descriptionDialogItem} onOpenChange={(open) => !open && setDescriptionDialogItem(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{descriptionDialogItem && canEditDescription(descriptionDialogItem) ? 'Edit Description' : 'View Description'}
						</DialogTitle>
					</DialogHeader>
					<div className="py-4 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
						{descriptionDialogItem && canEditDescription(descriptionDialogItem) ? (
							<Textarea
								value={descriptionDialogText}
								onChange={(e) => setDescriptionDialogText(e.target.value)}
								placeholder="Enter description..."
								rows={4}
							/>
						) : (
							descriptionDialogItem?.description || <span className="text-slate-400 italic">No description provided.</span>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDescriptionDialogItem(null)}>
							Cancel
						</Button>
						{descriptionDialogItem && canEditDescription(descriptionDialogItem) && (
							<Button onClick={saveDescriptionPopup} disabled={descriptionDialogText === (descriptionDialogItem?.description ?? '')}>
								Save Changes
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}
