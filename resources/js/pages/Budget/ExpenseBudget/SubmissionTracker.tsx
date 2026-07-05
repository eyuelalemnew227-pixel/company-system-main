import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check, ChevronsUpDown, Filter, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Expense Submission Tracker', href: '/budget/expense-budget/submission-tracker' },
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

type FrequentExpenseItem = {
    id: number;
    name: string;
};

type TrackerRow = {
    branch: string;
    department: string;
    submissions: Record<string, boolean>;
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

type SubmissionTrackerProps = {
    rows: TrackerRow[];
    frequentExpenseItems: FrequentExpenseItem[];
    branches: BranchOption[];
    departments: DepartmentOption[];
    fiscalYears: FiscalYearOption[];
    fiscalMonths: FiscalMonthOption[];
    request?: {
        branch_id?: string;
        department_id?: string;
        fiscal_month_id?: string;
        fiscal_year_id?: string;
    };
};

function isHeadOfficeBranch(branch: BranchOption | null | undefined): boolean {
    if (!branch) {
        return false;
    }

    if (branch.branch_code?.toUpperCase() === 'HO') {
        return true;
    }

    return branch.name.includes('Head Office');
}

function countSubmittedExpenses(submissions: Record<string, boolean>): number {
    return Object.values(submissions).filter(Boolean).length;
}

function formatTrackerLabel(name: string, submittedCount: number): string {
    return `${name}(${submittedCount})`;
}

function buildFilterParams(
    selectedBranch: string,
    selectedDepartment: string,
    selectedFiscalMonth: string,
    selectedFiscalYear: string,
): Record<string, string> {
    const params: Record<string, string> = {};

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

export default function ExpenseSubmissionTracker({
    rows,
    frequentExpenseItems,
    branches,
    departments,
    fiscalYears,
    fiscalMonths,
    request,
}: SubmissionTrackerProps) {
    const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
    const [selectedFiscalMonth, setSelectedFiscalMonth] = useState<string>(request?.fiscal_month_id ?? 'all');
    const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(request?.fiscal_year_id ?? 'all');
    const [openBranchFilter, setOpenBranchFilter] = useState(false);
    const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);

    const filteredFiscalMonths = useMemo(() => {
        if (selectedFiscalYear === 'all') {
            return fiscalMonths;
        }

        return fiscalMonths.filter((month) => String(month.fiscal_year_id) === selectedFiscalYear);
    }, [fiscalMonths, selectedFiscalYear]);

    const selectedBranchOption =
        selectedBranch === 'all' ? null : branches.find((branch) => branch.id.toString() === selectedBranch) ?? null;

    const selectedDepartmentOption =
        selectedDepartment === 'all'
            ? null
            : departments.find((department) => department.id.toString() === selectedDepartment) ?? null;

    const canFilterByDepartment = isHeadOfficeBranch(selectedBranchOption);

    function applyFilters(
        overrides: Partial<{
            branch: string;
            department: string;
            fiscal_month: string;
            fiscal_year: string;
        }> = {},
    ) {
        const params = buildFilterParams(
            overrides.branch ?? selectedBranch,
            overrides.department ?? selectedDepartment,
            overrides.fiscal_month ?? selectedFiscalMonth,
            overrides.fiscal_year ?? selectedFiscalYear,
        );

        router.get('/budget/expense-budget/submission-tracker', params, { preserveState: true, replace: true });
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
        setSelectedBranch('all');
        setSelectedDepartment('all');
        setSelectedFiscalMonth('all');
        setSelectedFiscalYear('all');
        router.get('/budget/expense-budget/submission-tracker', {}, { preserveState: true, replace: true });
    }

    const hasActiveFilters =
        selectedBranch !== 'all' ||
        selectedDepartment !== 'all' ||
        selectedFiscalMonth !== 'all' ||
        selectedFiscalYear !== 'all';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expense Submission Tracker" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="size-4 text-muted-foreground" />
                            Filters
                        </CardTitle>
                        <div className="flex flex-wrap items-end gap-3 pt-2">
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
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="sticky left-0 z-30 min-w-[180px] bg-slate-500 font-bold text-white dark:bg-slate-700">
                                        Branch
                                    </TableHead>
                                    <TableHead className="sticky left-[180px] z-40 min-w-[180px] bg-slate-500 font-bold text-white shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)] dark:bg-slate-700">
                                        Department
                                    </TableHead>
                                    {frequentExpenseItems.map((item) => (
                                        <TableHead
                                            key={item.id}
                                            className="relative z-0 min-w-[140px] bg-slate-500 text-center font-bold text-white dark:bg-slate-700"
                                        >
                                            {item.name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length > 0 ? (
                                    rows.map((row, index) => {
                                        const stickyRowBg =
                                            index % 2 === 1
                                                ? 'bg-slate-100 dark:bg-slate-800'
                                                : 'bg-white dark:bg-background';
                                        const submittedCount = countSubmittedExpenses(row.submissions);
                                        const isHeadOfficeRow = row.department !== '-';
                                        const branchLabel = isHeadOfficeRow
                                            ? row.branch
                                            : formatTrackerLabel(row.branch, submittedCount);
                                        const departmentLabel = isHeadOfficeRow
                                            ? formatTrackerLabel(row.department, submittedCount)
                                            : row.department;

                                        return (
                                            <TableRow
                                                key={`${row.branch}-${row.department}-${index}`}
                                                className="odd:bg-slate-100 dark:odd:bg-slate-800"
                                            >
                                                <TableCell
                                                    className={cn(
                                                        'sticky left-0 z-20 min-w-[180px] font-medium',
                                                        stickyRowBg,
                                                    )}
                                                >
                                                    {branchLabel}
                                                </TableCell>
                                                <TableCell
                                                    className={cn(
                                                        'sticky left-[180px] z-30 min-w-[180px] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]',
                                                        stickyRowBg,
                                                    )}
                                                >
                                                    {departmentLabel}
                                                </TableCell>
                                                {frequentExpenseItems.map((item) => {
                                                    const submitted = row.submissions[String(item.id)] ?? false;

                                                    return (
                                                        <TableCell
                                                            key={item.id}
                                                            className="relative z-0 bg-inherit text-center"
                                                        >
                                                            {submitted ? (
                                                                <Check className="mx-auto size-5 text-green-600" />
                                                            ) : (
                                                                <X className="mx-auto size-5 text-red-500" />
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2 + frequentExpenseItems.length}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            No Results Found!
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
