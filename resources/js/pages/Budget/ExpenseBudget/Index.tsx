import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { ETHIOPIAN_FISCAL_MONTHS, getEthiopianMonthEnglishName } from '@/lib/ethiopian-calendar';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { Filter, Trash2, X } from 'lucide-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Budget', href: null },
    { title: 'Expense Budget', href: '/budget/expense-budget' },
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

type ExpenseBudgetRow = {
    id: number;
    month: number;
    year: number;
    branch: string | null;
    department: string | null;
    expense_item: string | null;
    planned_budget: string | number;
    actual_budget: number;
    status: string;
    submitted_by: string | null;
};

interface ExpenseBudgetList extends Pagination {
    data: ExpenseBudgetRow[];
}

type IndexProps = {
    items: ExpenseBudgetList;
    branches: BranchOption[];
    departments: DepartmentOption[];
    years: number[];
    request?: {
        search?: string;
        branch_id?: string;
        department_id?: string;
        month?: string;
        year?: string;
    };
};

function formatCurrency(value: string | number | null | undefined): string {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isNaN(amount) ? 0 : amount);
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'approved':
            return 'Approved';
        case 'submitted':
            return 'Pending';
        case 'draft':
        default:
            return 'Pending';
    }
}

function getStatusClassName(status: string): string {
    switch (status) {
        case 'approved':
            return 'border-green-200 bg-green-100 text-green-800 hover:bg-green-100';
        case 'submitted':
            return 'border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100';
        case 'draft':
        default:
            return 'border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100';
    }
}

function buildFilterParams(
    search: string,
    selectedBranch: string,
    selectedDepartment: string,
    selectedMonth: string,
    selectedYear: string,
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
    if (selectedMonth !== 'all') {
        params.month = selectedMonth;
    }
    if (selectedYear !== 'all') {
        params.year = selectedYear;
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

export default function ExpenseBudgetIndex({ items, branches, departments, years, request }: IndexProps) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const { can } = usePermission();

    const [search, setSearch] = useState<string>(request?.search ?? '');
    const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
    const [selectedMonth, setSelectedMonth] = useState<string>(request?.month ?? 'all');
    const [selectedYear, setSelectedYear] = useState<string>(request?.year ?? 'all');
    const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

    const selectedBranchOption = useMemo(
        () => (selectedBranch === 'all' ? null : branches.find((branch) => branch.id.toString() === selectedBranch) ?? null),
        [selectedBranch, branches],
    );

    const canFilterByDepartment = isHeadOfficeBranch(selectedBranchOption);

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                '/budget/expense-budget',
                buildFilterParams(value, selectedBranch, selectedDepartment, selectedMonth, selectedYear),
                { preserveState: true, replace: true },
            );
        }, 500),
        [selectedBranch, selectedDepartment, selectedMonth, selectedYear],
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
            month: string;
            year: string;
        }> = {},
    ) {
        const params = buildFilterParams(
            overrides.search ?? search,
            overrides.branch ?? selectedBranch,
            overrides.department ?? selectedDepartment,
            overrides.month ?? selectedMonth,
            overrides.year ?? selectedYear,
        );

        router.get('/budget/expense-budget', params, { preserveState: true, replace: true });
    }

    function handleBranchChange(value: string) {
        setSelectedBranch(value);
        setSelectedDepartment('all');
        applyFilters({ branch: value, department: 'all' });
    }

    function handleDepartmentChange(value: string) {
        setSelectedDepartment(value);
        applyFilters({ department: value });
    }

    function handleMonthChange(value: string) {
        setSelectedMonth(value);
        applyFilters({ month: value });
    }

    function handleYearChange(value: string) {
        setSelectedYear(value);
        applyFilters({ year: value });
    }

    function clearFilters() {
        debouncedSearch.cancel();
        setSearch('');
        setSelectedBranch('all');
        setSelectedDepartment('all');
        setSelectedMonth('all');
        setSelectedYear('all');
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

    const hasActiveFilters =
        search !== '' ||
        selectedBranch !== 'all' ||
        selectedDepartment !== 'all' ||
        selectedMonth !== 'all' ||
        selectedYear !== 'all';

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
                                <Select value={selectedBranch} onValueChange={handleBranchChange}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="All Branches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={selectedDepartment}
                                    onValueChange={handleDepartmentChange}
                                    disabled={!canFilterByDepartment}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map((department) => (
                                            <SelectItem key={department.id} value={department.id.toString()}>
                                                {department.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="All Months" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Months</SelectItem>
                                        {ETHIOPIAN_FISCAL_MONTHS.map((month) => (
                                            <SelectItem key={month.value} value={month.value.toString()}>
                                                {month.am}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedYear} onValueChange={handleYearChange}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="All Years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Years</SelectItem>
                                        {years.map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
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
                                    <TableHead className="font-bold text-white">Month</TableHead>
                                    <TableHead className="font-bold text-white">Year</TableHead>
                                    <TableHead className="font-bold text-white">Branch</TableHead>
                                    <TableHead className="font-bold text-white">Department</TableHead>
                                    <TableHead className="font-bold text-white">Expense Item</TableHead>
                                    <TableHead className="font-bold text-white">Planned Budget</TableHead>
                                    <TableHead className="font-bold text-white">Actual Budget</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Submitted By</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.data.map((item) => (
                                    <TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{ETHIOPIAN_FISCAL_MONTHS.find((month) => month.value === item.month)?.am ?? item.month}</TableCell>
                                        <TableCell>{item.year}</TableCell>
                                        <TableCell>{item.branch ?? 'N/A'}</TableCell>
                                        <TableCell>{item.department ?? '-'}</TableCell>
                                        <TableCell>{item.expense_item ?? 'N/A'}</TableCell>
                                        <TableCell>{formatCurrency(item.planned_budget)}</TableCell>
                                        <TableCell>{formatCurrency(item.actual_budget)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(getStatusClassName(item.status))}>
                                                {getStatusLabel(item.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{item.submitted_by ?? 'N/A'}</TableCell>
                                        <TableCell>
                                            {can('manage expense budgets') && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toast.info('Edit expense budget is coming soon.')}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        className="m-2"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setDeleteItemId(item.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            )}
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
        </AppLayout>
    );
}
