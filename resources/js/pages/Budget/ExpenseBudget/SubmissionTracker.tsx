import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { ETHIOPIAN_FISCAL_MONTHS } from '@/lib/ethiopian-calendar';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check, Filter, X } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Budget', href: null },
    { title: 'Expense Budget', href: '/budget/expense-budget' },
    { title: 'Submission Tracker', href: '/budget/expense-budget/submission-tracker' },
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

type SubmissionTrackerProps = {
    rows: TrackerRow[];
    frequentExpenseItems: FrequentExpenseItem[];
    branches: BranchOption[];
    departments: DepartmentOption[];
    years: number[];
    request?: {
        branch_id?: string;
        department_id?: string;
        month?: string;
        year?: string;
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
    selectedMonth: string,
    selectedYear: string,
): Record<string, string> {
    const params: Record<string, string> = {};

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

export default function ExpenseSubmissionTracker({
    rows,
    frequentExpenseItems,
    branches,
    departments,
    years,
    request,
}: SubmissionTrackerProps) {
    const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
    const [selectedMonth, setSelectedMonth] = useState<string>(request?.month ?? 'all');
    const [selectedYear, setSelectedYear] = useState<string>(request?.year ?? 'all');

    const selectedBranchOption =
        selectedBranch === 'all' ? null : branches.find((branch) => branch.id.toString() === selectedBranch) ?? null;

    const canFilterByDepartment = isHeadOfficeBranch(selectedBranchOption);

    function applyFilters(
        overrides: Partial<{
            branch: string;
            department: string;
            month: string;
            year: string;
        }> = {},
    ) {
        const params = buildFilterParams(
            overrides.branch ?? selectedBranch,
            overrides.department ?? selectedDepartment,
            overrides.month ?? selectedMonth,
            overrides.year ?? selectedYear,
        );

        router.get('/budget/expense-budget/submission-tracker', params, { preserveState: true, replace: true });
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
        setSelectedBranch('all');
        setSelectedDepartment('all');
        setSelectedMonth('all');
        setSelectedYear('all');
        router.get('/budget/expense-budget/submission-tracker', {}, { preserveState: true, replace: true });
    }

    const hasActiveFilters =
        selectedBranch !== 'all' ||
        selectedDepartment !== 'all' ||
        selectedMonth !== 'all' ||
        selectedYear !== 'all';

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
