import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Filter, History, Pencil, Plus, Trash2, X } from 'lucide-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'View Expense Budget', href: '/budget/expense-budget' },
];

type BranchOption = {
    id: number;
    name: string;
    branch_code: string | null;
};

type DepartmentOption = {
    id: number;
    name: string;
};

type ExpenseItemOption = {
    id: number;
    name: string;
};

type FiscalYearOption = {
    id: number;
    name: string;
};

type FiscalMonthOption = {
    id: number;
    name: string;
    fiscal_year_id: number;
};

type ExpenseBudgetRow = {
    id: number;
    fiscal_year_id: number;
    fiscal_month_id: number;
    fiscal_year: string | null;
    fiscal_month: string | null;
    branch_id: number;
    department_id: number | null;
    branch: string | null;
    department: string | null;
    expense_item_id: number;
    expense_item: string | null;
    planned_budget: string | number;
    submitted_by: string | null;
    can_view_history: boolean;
};

type EditFormState = {
    fiscal_year_id: string;
    fiscal_month_id: string;
    branch_id: string;
    department_id: string;
    expense_item_id: number;
    planned_budget: string;
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
        expense_item: string | null;
        planned_budget: string | number | null;
        fiscal_year: string | null;
        fiscal_month: string | null;
        branch: string | null;
        department: string | null;
    };
    logs: ActivityLogEntry[];
};

interface ExpenseBudgetList extends Pagination {
    data: ExpenseBudgetRow[];
}

type IndexProps = {
    items: ExpenseBudgetList;
    branches: BranchOption[];
    departments: DepartmentOption[];
    expenseItems: ExpenseItemOption[];
    fiscalYears: FiscalYearOption[];
    fiscalMonths: FiscalMonthOption[];
    request?: {
        search?: string;
        branch_id?: string;
        department_id?: string;
        fiscal_month_id?: string;
        fiscal_year_id?: string;
    };
};

function formatCurrency(value: string | number | null | undefined): string {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isNaN(amount) ? 0 : amount);
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
    return Number.parseFloat(cleaned);
}

function formatActivityAction(action: string): string {
    return action
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getActivityIcon(action: string) {
    if (action.includes('created')) {
        return Plus;
    }

    if (action.includes('deleted')) {
        return Trash2;
    }

    if (action.includes('updated')) {
        return Pencil;
    }

    return History;
}

function formatActivityTimestamp(value: string): string {
    return new Date(value).toLocaleString();
}

function buildFilterParams(
    search: string,
    selectedBranch: string,
    selectedDepartment: string,
    selectedFiscalMonth: string,
    selectedFiscalYear: string,
): Record<string, string> {
    const params: Record<string, string> = {};

    if (search) {
        params.search = search;
    }
    if (selectedBranch !== 'all') {
        params.branch_id = selectedBranch;
    }
    if (selectedDepartment !== 'all') {
        params.department_id = selectedDepartment;
    }
    if (selectedFiscalMonth !== 'all') {
        params.fiscal_month_id = selectedFiscalMonth;
    }
    if (selectedFiscalYear !== 'all') {
        params.fiscal_year_id = selectedFiscalYear;
    }

    return params;
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

export default function ExpenseBudgetIndex({
    items,
    branches,
    departments,
    expenseItems,
    fiscalYears,
    fiscalMonths,
    request,
}: IndexProps) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const { canManageExpenseBudget } = usePermission();

    const [search, setSearch] = useState<string>(request?.search ?? '');
    const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
    const [selectedFiscalMonth, setSelectedFiscalMonth] = useState<string>(request?.fiscal_month_id ?? 'all');
    const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(request?.fiscal_year_id ?? 'all');
    const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
    const [historyItem, setHistoryItem] = useState<ExpenseBudgetRow | null>(null);
    const [historyData, setHistoryData] = useState<ActivityLogResponse | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [editingItem, setEditingItem] = useState<ExpenseBudgetRow | null>(null);
    const [editForm, setEditForm] = useState<EditFormState | null>(null);
    const [editProcessing, setEditProcessing] = useState(false);
    const [openEditBranch, setOpenEditBranch] = useState(false);
    const [openEditDepartment, setOpenEditDepartment] = useState(false);
    const [openEditExpenseItem, setOpenEditExpenseItem] = useState(false);
    const [openBranchFilter, setOpenBranchFilter] = useState(false);
    const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);

    const selectedBranchOption = useMemo(
        () => (selectedBranch === 'all' ? null : branches.find((branch) => branch.id.toString() === selectedBranch) ?? null),
        [selectedBranch, branches],
    );

    const selectedDepartmentOption = useMemo(
        () =>
            selectedDepartment === 'all'
                ? null
                : departments.find((department) => department.id.toString() === selectedDepartment) ?? null,
        [selectedDepartment, departments],
    );

    const canFilterByDepartment = isHeadOfficeBranch(selectedBranchOption);

    const editBranchOption = useMemo(
        () =>
            editForm?.branch_id
                ? branches.find((branch) => branch.id.toString() === editForm.branch_id) ?? null
                : null,
        [editForm?.branch_id, branches],
    );

    const canEditDepartment = isHeadOfficeBranch(editBranchOption);

    const filteredFiscalMonths = useMemo(() => {
        if (selectedFiscalYear === 'all') {
            return fiscalMonths;
        }

        return fiscalMonths.filter((month) => String(month.fiscal_year_id) === selectedFiscalYear);
    }, [fiscalMonths, selectedFiscalYear]);

    const editFilteredFiscalMonths = useMemo(() => {
        if (!editForm?.fiscal_year_id) {
            return fiscalMonths;
        }

        return fiscalMonths.filter((month) => String(month.fiscal_year_id) === editForm.fiscal_year_id);
    }, [editForm?.fiscal_year_id, fiscalMonths]);

    const selectedEditExpenseItem = useMemo(
        () => expenseItems.find((item) => item.id === editForm?.expense_item_id) ?? null,
        [editForm?.expense_item_id, expenseItems],
    );

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                '/budget/expense-budget',
                buildFilterParams(value, selectedBranch, selectedDepartment, selectedFiscalMonth, selectedFiscalYear),
                { preserveState: true, replace: true },
            );
        }, 500),
        [selectedBranch, selectedDepartment, selectedFiscalMonth, selectedFiscalYear],
    );

    function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setSearch(value);
        debouncedSearch(value);
    }

    function applyFilters(
        overrides: Partial<{
            search: string;
            branch: string;
            department: string;
            fiscal_month: string;
            fiscal_year: string;
        }> = {},
    ) {
        const params = buildFilterParams(
            overrides.search ?? search,
            overrides.branch ?? selectedBranch,
            overrides.department ?? selectedDepartment,
            overrides.fiscal_month ?? selectedFiscalMonth,
            overrides.fiscal_year ?? selectedFiscalYear,
        );

        router.get('/budget/expense-budget', params, { preserveState: true, replace: true });
    }

    function handleBranchFilterSelect(branchId: string) {
        setOpenBranchFilter(false);
        setSelectedBranch(branchId);
        setSelectedDepartment('all');
        applyFilters({ branch: branchId, department: 'all' });
    }

    function handleDepartmentFilterSelect(departmentId: string) {
        setOpenDepartmentFilter(false);
        setSelectedDepartment(departmentId);
        applyFilters({ department: departmentId });
    }

    function handleFiscalMonthChange(value: string) {
        setSelectedFiscalMonth(value);
        applyFilters({ fiscal_month: value });
    }

    function handleFiscalYearChange(value: string) {
        setSelectedFiscalYear(value);
        setSelectedFiscalMonth('all');
        applyFilters({ fiscal_year: value, fiscal_month: 'all' });
    }

    function clearFilters() {
        debouncedSearch.cancel();
        setSearch('');
        setSelectedBranch('all');
        setSelectedDepartment('all');
        setSelectedFiscalMonth('all');
        setSelectedFiscalYear('all');
        router.get('/budget/expense-budget', {}, { preserveState: true, replace: true });
    }

    function confirmDeleteItem() {
        if (deleteItemId === null) {
            return;
        }

        router.delete(`/budget/expense-budget/items/${deleteItemId}`, {
            onSuccess: () => setDeleteItemId(null),
        });
    }

    async function openHistoryDialog(item: ExpenseBudgetRow) {
        setHistoryItem(item);
        setHistoryData(null);
        setHistoryLoading(true);

        try {
            const response = await fetch(`/budget/expense-budget/items/${item.id}/activity-logs`);

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('You can only view activity history for your own branch or department.');
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

    function openEditDialog(item: ExpenseBudgetRow) {
        setEditingItem(item);
        setEditForm({
            fiscal_year_id: String(item.fiscal_year_id),
            fiscal_month_id: String(item.fiscal_month_id),
            branch_id: String(item.branch_id),
            department_id: item.department_id ? String(item.department_id) : '',
            expense_item_id: item.expense_item_id,
            planned_budget: formatCurrency(item.planned_budget),
        });
        setOpenEditBranch(false);
        setOpenEditDepartment(false);
        setOpenEditExpenseItem(false);
    }

    function closeEditDialog() {
        setEditingItem(null);
        setEditForm(null);
        setOpenEditBranch(false);
        setOpenEditDepartment(false);
        setOpenEditExpenseItem(false);
    }

    function handleEditBranchSelect(branch: BranchOption) {
        if (!editForm) {
            return;
        }

        const headOffice = isHeadOfficeBranch(branch);

        setEditForm({
            ...editForm,
            branch_id: String(branch.id),
            department_id: headOffice ? editForm.department_id : '',
        });
        setOpenEditBranch(false);
    }

    function handleEditDepartmentSelect(department: DepartmentOption) {
        if (!editForm) {
            return;
        }

        setEditForm({
            ...editForm,
            department_id: String(department.id),
        });
        setOpenEditDepartment(false);
    }

    function submitEditItem(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!editingItem || !editForm) {
            return;
        }

        if (canEditDepartment && !editForm.department_id) {
            toast.error('The department field is required when the selected branch is Head Office.');
            return;
        }

        const parsedBudget = parseFormattedNumber(editForm.planned_budget);
        if (Number.isNaN(parsedBudget) || parsedBudget < 0) {
            toast.error('Please enter a valid planned budget.');
            return;
        }

        setEditProcessing(true);

        router.patch(
            `/budget/expense-budget/items/${editingItem.id}`,
            {
                fiscal_year_id: editForm.fiscal_year_id,
                fiscal_month_id: editForm.fiscal_month_id,
                branch_id: editForm.branch_id,
                department_id: canEditDepartment ? editForm.department_id : null,
                expense_item_id: editForm.expense_item_id,
                planned_budget: parsedBudget,
            },
            {
                preserveScroll: true,
                onSuccess: () => closeEditDialog(),
                onFinish: () => setEditProcessing(false),
            },
        );
    }

    const hasActiveFilters =
        search !== '' ||
        selectedBranch !== 'all' ||
        selectedDepartment !== 'all' ||
        selectedFiscalMonth !== 'all' ||
        selectedFiscalYear !== 'all';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Expense Budget" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="size-4 text-muted-foreground" />
                            Filters
                        </CardTitle>
                        <div className="flex flex-wrap items-end gap-3 pt-2">
                            <Input
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search by expense item"
                                className="max-w-xs"
                            />
                            <div className="flex flex-wrap gap-2">
                                <Popover open={openBranchFilter} onOpenChange={setOpenBranchFilter}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-[180px] justify-between font-normal"
                                        >
                                            {selectedBranchOption?.name ?? 'All Branches'}
                                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
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
                                                        onSelect={() => handleBranchFilterSelect('all')}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 size-4',
                                                                selectedBranch === 'all' ? 'opacity-100' : 'opacity-0',
                                                            )}
                                                        />
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
                                                                    selectedBranch === branch.id.toString()
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
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
                                <Popover open={openDepartmentFilter} onOpenChange={setOpenDepartmentFilter}>
                                    <div className={cn(!canFilterByDepartment && 'cursor-not-allowed')}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-[180px] justify-between font-normal"
                                                disabled={!canFilterByDepartment}
                                            >
                                                {selectedDepartmentOption?.name ?? 'All Departments'}
                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                    </div>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search departments..." />
                                            <CommandList className="max-h-60">
                                                <CommandEmpty>No departments found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="All Departments"
                                                        onSelect={() => handleDepartmentFilterSelect('all')}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 size-4',
                                                                selectedDepartment === 'all' ? 'opacity-100' : 'opacity-0',
                                                            )}
                                                        />
                                                        All Departments
                                                    </CommandItem>
                                                    {departments.map((department) => (
                                                        <CommandItem
                                                            key={department.id}
                                                            value={department.name}
                                                            onSelect={() =>
                                                                handleDepartmentFilterSelect(department.id.toString())
                                                            }
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 size-4',
                                                                    selectedDepartment === department.id.toString()
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
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
                                {hasActiveFilters && (
                                    <Button type="button" variant="secondary" onClick={clearFilters}>
                                        <X className="mr-1 size-4" />
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="font-bold text-white">Fiscal Month</TableHead>
                                    <TableHead className="font-bold text-white">Fiscal Year</TableHead>
                                    <TableHead className="font-bold text-white">Branch</TableHead>
                                    <TableHead className="font-bold text-white">Department</TableHead>
                                    <TableHead className="font-bold text-white">Expense Item</TableHead>
                                    <TableHead className="font-bold text-white">Planned Budget</TableHead>
                                    <TableHead className="font-bold text-white">Submitted By</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.data.map((item) => (
                                    <TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{item.fiscal_month ?? 'N/A'}</TableCell>
                                        <TableCell>{item.fiscal_year ?? 'N/A'}</TableCell>
                                        <TableCell>{item.branch ?? 'N/A'}</TableCell>
                                        <TableCell>{item.department ?? '-'}</TableCell>
                                        <TableCell>{item.expense_item ?? 'N/A'}</TableCell>
                                        <TableCell>{formatCurrency(item.planned_budget)}</TableCell>
                                        <TableCell>{item.submitted_by ?? 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {item.can_view_history && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openHistoryDialog(item)}
                                                    >
                                                        <History className="mr-1 size-4" />
                                                        History
                                                    </Button>
                                                )}
                                                {canManageExpenseBudget && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditDialog(item)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setDeleteItemId(item.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
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
                            Delete Expense Budget Item
                        </DialogTitle>
                        <DialogDescription className="pt-1">
                            Are you sure you want to delete this expense budget row? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteItemId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteItem}>
                            <Trash2 className="size-4 mr-1.5" />
                            Delete
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
                        <DialogTitle>Edit Expense Budget Item</DialogTitle>
                        <DialogDescription>
                            Update expense budget details for this row.
                        </DialogDescription>
                    </DialogHeader>
                    {editForm && (
                        <form className="space-y-4" onSubmit={submitEditItem}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-fiscal-year">
                                        Fiscal Year <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={editForm.fiscal_year_id}
                                        onValueChange={(value) =>
                                            setEditForm({
                                                ...editForm,
                                                fiscal_year_id: value,
                                                fiscal_month_id: '',
                                            })
                                        }
                                    >
                                        <SelectTrigger id="edit-fiscal-year">
                                            <SelectValue placeholder="Select fiscal year" />
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
                                    <Label htmlFor="edit-fiscal-month">
                                        Fiscal Month <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={editForm.fiscal_month_id}
                                        onValueChange={(value) =>
                                            setEditForm({ ...editForm, fiscal_month_id: value })
                                        }
                                        disabled={!editForm.fiscal_year_id}
                                    >
                                        <SelectTrigger id="edit-fiscal-month">
                                            <SelectValue
                                                placeholder={
                                                    editForm.fiscal_year_id
                                                        ? 'Select fiscal month'
                                                        : 'Select fiscal year first'
                                                }
                                            />
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
                                    <Label>
                                        Branch <span className="text-red-500">*</span>
                                    </Label>
                                    <Popover modal={false} open={openEditBranch} onOpenChange={setOpenEditBranch}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between font-normal"
                                            >
                                                {editBranchOption?.name ?? 'Select branch...'}
                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            portalled={false}
                                            className="z-[100] w-[var(--radix-popover-trigger-width)] p-0"
                                            align="start"
                                        >
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
                                                                        editForm.branch_id === String(branch.id)
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0',
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
                                    <Label>
                                        Department {canEditDepartment && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Popover modal={false} open={openEditDepartment} onOpenChange={setOpenEditDepartment}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between font-normal"
                                                disabled={!canEditDepartment}
                                            >
                                                {editForm.department_id
                                                    ? departments.find(
                                                          (department) =>
                                                              department.id.toString() === editForm.department_id,
                                                      )?.name
                                                    : 'Select Department'}
                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            portalled={false}
                                            className="z-[100] w-[var(--radix-popover-trigger-width)] p-0"
                                            align="start"
                                        >
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
                                                                        editForm.department_id === String(department.id)
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0',
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
                                    <Label>
                                        Expense Item <span className="text-red-500">*</span>
                                    </Label>
                                    <Popover modal={false} open={openEditExpenseItem} onOpenChange={setOpenEditExpenseItem}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between font-normal"
                                            >
                                                {selectedEditExpenseItem?.name ?? 'Select expense item...'}
                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            portalled={false}
                                            className="z-[100] w-[var(--radix-popover-trigger-width)] p-0"
                                            align="start"
                                        >
                                            <Command>
                                                <CommandInput placeholder="Search expense items..." />
                                                <CommandList className="max-h-60">
                                                    <CommandEmpty>No expense items found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {expenseItems.map((expenseItem) => (
                                                            <CommandItem
                                                                key={expenseItem.id}
                                                                value={expenseItem.name}
                                                                className="cursor-pointer"
                                                                onSelect={() => {
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        expense_item_id: expenseItem.id,
                                                                    });
                                                                    setOpenEditExpenseItem(false);
                                                                }}
                                                                onClick={() => {
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        expense_item_id: expenseItem.id,
                                                                    });
                                                                    setOpenEditExpenseItem(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        'mr-2 size-4',
                                                                        editForm.expense_item_id === expenseItem.id
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0',
                                                                    )}
                                                                />
                                                                {expenseItem.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-planned-budget">
                                        Planned Budget <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-planned-budget"
                                        value={editForm.planned_budget}
                                        onChange={(event) =>
                                            setEditForm({
                                                ...editForm,
                                                planned_budget: formatBudgetInput(event.target.value),
                                            })
                                        }
                                        placeholder="Enter planned budget"
                                        inputMode="decimal"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={editProcessing}>
                                    {editProcessing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
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
                                ? `${historyData.item.expense_item ?? 'Expense item'} · ${historyData.item.fiscal_month ?? 'N/A'} / ${historyData.item.fiscal_year ?? 'N/A'} · ${historyData.item.branch ?? 'N/A'}${historyData.item.department ? ` (${historyData.item.department})` : ''}`
                                : historyItem
                                  ? `${historyItem.expense_item ?? 'Expense item'} · ${historyItem.fiscal_month ?? 'N/A'} / ${historyItem.fiscal_year ?? 'N/A'}`
                                  : 'Expense budget item activity'}
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
                                                    <span className="text-sm font-semibold">
                                                        {formatActivityAction(log.action)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatActivityTimestamp(log.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground">{log.summary}</p>
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    By{' '}
                                                    <span className="font-medium text-foreground">
                                                        {log.user?.name ?? 'System'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-10 text-center text-sm italic text-muted-foreground">
                                No activity recorded for this item yet.
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
        </AppLayout>
    );
}
