import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Users,
    Briefcase,
    Building2,
    ClipboardCheck,
    FileCheck2,
    TrendingUp,
    Search,
    Download,
    Layers,
    FilterX,
    ArrowUpDown,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronsDownUp,
    ChevronsUpDown,
    Calendar,
    Filter,
    X,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Reports',
        href: '/reports/employee-evaluations',
    },
    {
        title: 'Checklist Summary',
        href: '/reports/checklist-summary',
    },
];

interface SummaryRow {
    employee_id: number;
    employee_name: string;
    employee_code?: string | null;
    branch_id?: number | null;
    branch: string;
    department_id?: number | null;
    department?: string | null;
    score_type_1: number | null;
    score_type_2: number | null;
    avg_score: number | null;
    type_1_count: number;
    type_2_count: number;
}

interface BranchGroup {
    branch_name: string;
    branch_id?: number | null;
    employees: SummaryRow[];
    avg_type_1: number | null;
    avg_type_2: number | null;
    overall_avg: number | null;
    both_completed_count: number;
}

interface SummaryMetrics {
    total_employees: number;
    both_completed_count: number;
    avg_type_1: number | null;
    avg_type_2: number | null;
    overall_avg: number | null;
}

interface ChecklistSummaryProps {
    summaryRows?: SummaryRow[];
    summaryMetrics?: SummaryMetrics;
    filters?: {
        fiscal_year_id: string;
        fiscal_month_id: string;
        branch_id: string;
        department_id?: string;
        completion_status: string;
        search: string;
        start_date?: string;
        end_date?: string;
    };
    branches?: Array<{ id: number; name: string }>;
    departments?: Array<{ id: number; name: string }>;
    fiscalYears?: Array<{ id: number; name: string }>;
    fiscalMonths?: Array<{ id: number; fiscal_year_id: number; name: string }>;
    currentFiscalYearId?: number | null;
    currentFiscalMonthId?: number | null;
}

export default function ChecklistSummary({
    summaryRows = [],
    summaryMetrics = {
        total_employees: 0,
        both_completed_count: 0,
        avg_type_1: null,
        avg_type_2: null,
        overall_avg: null,
    },
    filters = {
        fiscal_year_id: 'all',
        fiscal_month_id: 'all',
        branch_id: 'all',
        department_id: 'all',
        completion_status: 'all',
        search: '',
        start_date: '',
        end_date: '',
    },
    branches = [],
    departments = [],
    fiscalYears = [],
    fiscalMonths = [],
    currentFiscalYearId = null,
    currentFiscalMonthId = null,
}: ChecklistSummaryProps) {
    // Local filter states for instant response & navigation
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedYear, setSelectedYear] = useState<string>(filters.fiscal_year_id || 'all');
    const [selectedMonth, setSelectedMonth] = useState<string>(filters.fiscal_month_id || 'all');
    const [selectedBranch, setSelectedBranch] = useState<string>(filters.branch_id || 'all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>(filters.department_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState<string>(filters.completion_status || 'all');
    const [startDate, setStartDate] = useState<string>(filters.start_date || '');
    const [endDate, setEndDate] = useState<string>(filters.end_date || '');

    // Keep date states in sync if props change
    useEffect(() => {
        setStartDate(filters.start_date || '');
        setEndDate(filters.end_date || '');
    }, [filters.start_date, filters.end_date]);

    // Sorting state
    const [sortColumn, setSortColumn] = useState<keyof SummaryRow>('branch');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Branch expansion state (collapsible branches like inventory-count-summary)
    const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

    // Pagination state (paginating by branch)
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 25;

    // Filter available months based on selected fiscal year
    const availableMonths = useMemo(() => {
        if (!selectedYear || selectedYear === 'all') {
            return fiscalMonths;
        }
        const yearIdNum = parseInt(selectedYear);
        return fiscalMonths.filter((m) => m.fiscal_year_id === yearIdNum);
    }, [selectedYear, fiscalMonths]);

    // Handle filter application
    const applyFilters = (newFilters: Record<string, string | undefined>) => {
        const merged: Record<string, string> = {
            fiscal_year_id: selectedYear,
            fiscal_month_id: selectedMonth,
            branch_id: selectedBranch,
            department_id: selectedDepartment,
            completion_status: selectedStatus,
            search: searchTerm,
            start_date: startDate,
            end_date: endDate,
        };

        Object.entries(newFilters).forEach(([k, v]) => {
            if (v !== undefined) {
                merged[k] = v;
            }
        });

        // Clean out empty string values to keep URLs tidy
        const cleaned: Record<string, string> = {};
        Object.entries(merged).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                cleaned[k] = v;
            }
        });

        router.get('/reports/checklist-summary', cleaned, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search: searchTerm });
    };

    const handleApplyDateRange = () => {
        setSelectedYear('all');
        setSelectedMonth('all');
        applyFilters({
            start_date: startDate,
            end_date: endDate,
            fiscal_year_id: 'all',
            fiscal_month_id: 'all',
        });
    };

    const handleClearDateRange = () => {
        setStartDate('');
        setEndDate('');
        applyFilters({
            start_date: '',
            end_date: '',
        });
    };

    const handleReset = () => {
        setSearchTerm('');
        setSelectedYear('all');
        setSelectedMonth('all');
        setSelectedBranch('all');
        setSelectedDepartment('all');
        setSelectedStatus('all');
        setStartDate('');
        setEndDate('');

        router.get('/reports/checklist-summary', {
            fiscal_year_id: 'all',
            fiscal_month_id: 'all',
            branch_id: 'all',
            department_id: 'all',
            completion_status: 'all',
            search: '',
            start_date: '',
            end_date: '',
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Client-side sorting and search refinement
    const sortedAndFilteredRows = useMemo(() => {
        let list = [...summaryRows];

        // Search filter (client-side backup for smooth feel)
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            list = list.filter(
                (row) =>
                    row.employee_name.toLowerCase().includes(term) ||
                    row.branch.toLowerCase().includes(term) ||
                    (row.department && row.department.toLowerCase().includes(term)) ||
                    (row.employee_code && row.employee_code.toLowerCase().includes(term))
            );
        }

        // Sorting individual employees
        list.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            return 0;
        });

        return list;
    }, [summaryRows, searchTerm, sortColumn, sortDirection]);

    // Group employees by branch and compute branch averages
    const branchGroups = useMemo(() => {
        const map: Record<string, {
            branch_name: string;
            branch_id?: number | null;
            employees: SummaryRow[];
        }> = {};

        sortedAndFilteredRows.forEach((row) => {
            const key = row.branch || 'Unassigned';
            if (!map[key]) {
                map[key] = {
                    branch_name: key,
                    branch_id: row.branch_id,
                    employees: [],
                };
            }
            map[key].employees.push(row);
        });

        const groups: BranchGroup[] = Object.values(map).map((group) => {
            const t1 = group.employees
                .map((e) => e.score_type_1)
                .filter((s): s is number => s !== null);
            const t2 = group.employees
                .map((e) => e.score_type_2)
                .filter((s): s is number => s !== null);
            const avgs = group.employees
                .map((e) => e.avg_score)
                .filter((s): s is number => s !== null);

            const avg_type_1 = t1.length > 0
                ? Math.round((t1.reduce((a, b) => a + b, 0) / t1.length) * 10) / 10
                : null;
            const avg_type_2 = t2.length > 0
                ? Math.round((t2.reduce((a, b) => a + b, 0) / t2.length) * 10) / 10
                : null;

            let overall_avg: number | null = null;
            if (avg_type_1 !== null && avg_type_2 !== null) {
                overall_avg = Math.round(((avg_type_1 + avg_type_2) / 2) * 10) / 10;
            } else if (avgs.length > 0) {
                overall_avg = Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10;
            }

            const both_completed_count = group.employees.filter(
                (e) => e.score_type_1 !== null && e.score_type_2 !== null
            ).length;

            return {
                ...group,
                avg_type_1,
                avg_type_2,
                overall_avg,
                both_completed_count,
            };
        });

        // Sort branch groups
        groups.sort((a, b) => {
            if (sortColumn === 'branch') {
                return sortDirection === 'asc'
                    ? a.branch_name.localeCompare(b.branch_name)
                    : b.branch_name.localeCompare(a.branch_name);
            }
            if (sortColumn === 'score_type_1') {
                const valA = a.avg_type_1 ?? -1;
                const valB = b.avg_type_1 ?? -1;
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            if (sortColumn === 'score_type_2') {
                const valA = a.avg_type_2 ?? -1;
                const valB = b.avg_type_2 ?? -1;
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            if (sortColumn === 'avg_score') {
                const valA = a.overall_avg ?? -1;
                const valB = b.overall_avg ?? -1;
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            return a.branch_name.localeCompare(b.branch_name);
        });

        return groups;
    }, [sortedAndFilteredRows, sortColumn, sortDirection]);

    // Auto-expand all branches when searching
    useEffect(() => {
        if (searchTerm.trim() !== '') {
            const all: Record<string, boolean> = {};
            branchGroups.forEach((bg) => {
                all[bg.branch_name] = true;
            });
            setExpandedBranches(all);
        }
    }, [searchTerm, branchGroups]);

    const toggleBranch = (branchName: string) => {
        setExpandedBranches((prev) => ({
            ...prev,
            [branchName]: !prev[branchName],
        }));
    };

    const expandAllBranches = () => {
        const all: Record<string, boolean> = {};
        branchGroups.forEach((bg) => {
            all[bg.branch_name] = true;
        });
        setExpandedBranches(all);
    };

    const collapseAllBranches = () => {
        setExpandedBranches({});
    };

    // Paginated branch groups
    const totalPages = Math.ceil(branchGroups.length / pageSize) || 1;
    const paginatedBranchGroups = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return branchGroups.slice(start, start + pageSize);
    }, [branchGroups, currentPage, pageSize]);

    const handleSort = (column: keyof SummaryRow) => {
        if (sortColumn === column) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const getScoreBadge = (score: number | null, count?: number) => {
        if (score === null) {
            return (
                <span className="inline-flex items-center text-xs font-medium text-gray-400 bg-gray-50 border border-dashed border-gray-200 px-2.5 py-1 rounded-md">
                    Not Evaluated
                </span>
            );
        }

        let colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        if (score >= 85) {
            colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        } else if (score >= 70) {
            colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
        }

        return (
            <div className="inline-flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colorClasses}`}>
                    {score}%
                </span>
                {count !== undefined && count > 1 && (
                    <span className="text-[10px] text-gray-400" title={`${count} evaluations recorded`}>
                        ({count}x)
                    </span>
                )}
            </div>
        );
    };

    const getAvgScoreBadge = (avg: number | null, hasBoth: boolean) => {
        if (avg === null) {
            return (
                <span className="inline-flex items-center text-xs text-gray-400 italic">
                    —
                </span>
            );
        }

        let bgClass = 'bg-rose-100 text-rose-900 border-rose-300';
        if (avg >= 85) {
            bgClass = 'bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold';
        } else if (avg >= 70) {
            bgClass = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
        }

        return (
            <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-md text-sm tracking-tight border shadow-xs ${bgClass}`}>
                    {avg}%
                </span>
                {hasBoth ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 h-5">
                        Complete
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 h-5">
                        Partial
                    </Badge>
                )}
            </div>
        );
    };

    // Build export CSV URL
    const exportUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (selectedYear && selectedYear !== 'all') params.set('fiscal_year_id', selectedYear);
        if (selectedMonth && selectedMonth !== 'all') params.set('fiscal_month_id', selectedMonth);
        if (selectedBranch && selectedBranch !== 'all') params.set('branch_id', selectedBranch);
        if (selectedDepartment && selectedDepartment !== 'all') params.set('department_id', selectedDepartment);
        if (selectedStatus && selectedStatus !== 'all') params.set('completion_status', selectedStatus);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        if (searchTerm) params.set('search', searchTerm);
        return `/reports/checklist-summary/export?${params.toString()}`;
    }, [selectedYear, selectedMonth, selectedBranch, selectedDepartment, selectedStatus, startDate, endDate, searchTerm]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Checklist Summary for Employees" />
            <div className="space-y-8 pb-16 max-w-7xl mx-auto">
                {/* Metrics Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-amber-900/10 shadow-xs hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Evaluated Employees
                            </CardTitle>
                            <div className="p-2 bg-amber-100/60 text-amber-800 rounded-lg">
                                <Users className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                {summaryMetrics.total_employees}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                                <span className="font-semibold text-emerald-700">{summaryMetrics.both_completed_count}</span> completed both rounds
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-900/10 shadow-xs hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Form Type 1 Average
                            </CardTitle>
                            <div className="p-2 bg-blue-100/60 text-blue-800 rounded-lg">
                                <ClipboardCheck className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                {summaryMetrics.avg_type_1 !== null ? `${summaryMetrics.avg_type_1}%` : '—'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Score out of 100 for Checklist Round 1
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-900/10 shadow-xs hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Form Type 2 Average
                            </CardTitle>
                            <div className="p-2 bg-purple-100/60 text-purple-800 rounded-lg">
                                <FileCheck2 className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                {summaryMetrics.avg_type_2 !== null ? `${summaryMetrics.avg_type_2}%` : '—'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Score out of 100 for Checklist Round 2
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-900/10 shadow-xs hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Combined Average Score
                            </CardTitle>
                            <div className="p-2 bg-emerald-100/60 text-emerald-800 rounded-lg">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                {summaryMetrics.overall_avg !== null ? `${summaryMetrics.overall_avg}%` : '—'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Aggregate average of both form types
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Checklist Summary Section */}
                <Card className="border-amber-900/10 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-amber-50/40 to-white pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl font-bold text-amber-950 flex items-center gap-2">
                                    <ClipboardCheck className="w-5 h-5 text-amber-700" />
                                    Checklist Summary for Employees
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-500 mt-1">
                                    Scores out of 100 for Form Type 1, Form Type 2, and the average score of both checklists.
                                </CardDescription>
                            </div>

                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-amber-300 text-amber-900 hover:bg-amber-50 shadow-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                                            <Download className="w-4 h-4 text-amber-700" />
                                            <span>Export CSV</span>
                                            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-amber-700" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 p-1.5 bg-white border border-gray-200 shadow-lg rounded-lg">
                                        <DropdownMenuItem asChild>
                                            <a href={`${exportUrl}&level=employee`} download className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-md hover:bg-amber-50/70 transition-colors">
                                                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-xs text-gray-900">Employee Level</span>
                                                    <span className="text-[10px] text-muted-foreground">Individual employee scores & details</span>
                                                </div>
                                            </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <a href={`${exportUrl}&level=branch`} download className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-md hover:bg-amber-50/70 transition-colors">
                                                <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-xs text-gray-900">Branch Level</span>
                                                    <span className="text-[10px] text-muted-foreground">Aggregated scores by branch</span>
                                                </div>
                                            </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <a href={`${exportUrl}&level=department`} download className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-md hover:bg-amber-50/70 transition-colors">
                                                <Briefcase className="w-4 h-4 text-purple-600 shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-xs text-gray-900">Department Level</span>
                                                    <span className="text-[10px] text-muted-foreground">Aggregated scores by department</span>
                                                </div>
                                            </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <a href={`${exportUrl}&level=branch_department`} download className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-md hover:bg-amber-50/70 transition-colors">
                                                <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-xs text-gray-900">Branch & Department Level</span>
                                                    <span className="text-[10px] text-muted-foreground">Breakdown by branch & department</span>
                                                </div>
                                            </a>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Filter Toolbar */}
                        <div className="mt-4 pt-4 border-t border-gray-200/60 space-y-3">
                            {/* Row 1: Search & Date Range Picker */}
                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                                {/* Search */}
                                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                    <Input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search employee or branch..."
                                        className="pl-9 h-9 bg-white text-xs border-gray-200"
                                    />
                                </form>

                                {/* Date Range Picker */}
                                <div className="flex flex-wrap items-center gap-2 bg-amber-50/70 px-3 py-1.5 rounded-lg border border-amber-200/80 shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                                        <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                                        <span className="hidden sm:inline">Date Range:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleApplyDateRange();
                                            }}
                                            onClick={(e) => {
                                                try {
                                                    e.currentTarget.showPicker();
                                                } catch {}
                                            }}
                                            className="h-8 w-[138px] cursor-pointer bg-white text-xs border-gray-200 focus:border-amber-400 px-2"
                                            title="Start Date (From)"
                                            aria-label="Start Date"
                                        />
                                        <span className="text-gray-400 text-xs font-semibold">to</span>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleApplyDateRange();
                                            }}
                                            onClick={(e) => {
                                                try {
                                                    e.currentTarget.showPicker();
                                                } catch {}
                                            }}
                                            className="h-8 w-[138px] cursor-pointer bg-white text-xs border-gray-200 focus:border-amber-400 px-2"
                                            title="End Date (To)"
                                            aria-label="End Date"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleApplyDateRange}
                                        className="h-8 px-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium shadow-xs"
                                    >
                                        <Filter className="w-3.5 h-3.5 mr-1" />
                                        Filter
                                    </Button>
                                    {(startDate || endDate) && (
                                        <button
                                            type="button"
                                            onClick={handleClearDateRange}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-amber-100/70 transition-colors"
                                            title="Clear date range"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Fiscal Period, Branch, Status, Active Range & Reset */}
                            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                {/* Fiscal Year */}
                                <div className="w-[160px]">
                                    <Select
                                        value={selectedYear}
                                        onValueChange={(val) => {
                                            setSelectedYear(val);
                                            setStartDate('');
                                            setEndDate('');
                                            applyFilters({ fiscal_year_id: val, start_date: '', end_date: '' });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 bg-white text-xs border-gray-200">
                                            <SelectValue placeholder="Fiscal Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Fiscal Years</SelectItem>
                                            {fiscalYears.map((y) => (
                                                <SelectItem key={y.id} value={String(y.id)}>
                                                    {y.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Fiscal Month */}
                                <div className="w-[160px]">
                                    <Select
                                        value={selectedMonth}
                                        onValueChange={(val) => {
                                            setSelectedMonth(val);
                                            setStartDate('');
                                            setEndDate('');
                                            applyFilters({ fiscal_month_id: val, start_date: '', end_date: '' });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 bg-white text-xs border-gray-200">
                                            <SelectValue placeholder="Fiscal Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Months</SelectItem>
                                            {availableMonths.map((m) => (
                                                <SelectItem key={m.id} value={String(m.id)}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Branch */}
                                <div className="w-[180px]">
                                    <Select
                                        value={selectedBranch}
                                        onValueChange={(val) => {
                                            setSelectedBranch(val);
                                            applyFilters({ branch_id: val });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 bg-white text-xs border-gray-200 truncate">
                                            <SelectValue placeholder="Branch" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {branches.map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)}>
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Department */}
                                <div className="w-[180px]">
                                    <Select
                                        value={selectedDepartment}
                                        onValueChange={(val) => {
                                            setSelectedDepartment(val);
                                            applyFilters({ department_id: val });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 bg-white text-xs border-gray-200 truncate">
                                            <SelectValue placeholder="Department" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>
                                                    {d.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Completion Status */}
                                <div className="w-[140px]">
                                    <Select
                                        value={selectedStatus}
                                        onValueChange={(val) => {
                                            setSelectedStatus(val);
                                            applyFilters({ completion_status: val });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 bg-white text-xs border-gray-200">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="both">Both Done</SelectItem>
                                            <SelectItem value="type_1_only">Type 1 Only</SelectItem>
                                            <SelectItem value="type_2_only">Type 2 Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Active custom date badge if applicable */}
                                {(startDate || endDate) && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-900 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-md">
                                        <span className="font-semibold">Custom Period:</span>
                                        <span>{startDate || 'Start'} → {endDate || 'Now'}</span>
                                    </div>
                                )}

                                {/* Reset All */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    title="Reset all filters"
                                    className="h-8 px-2.5 text-xs text-gray-600 hover:text-amber-900 hover:bg-amber-50 border-gray-200 ml-auto"
                                >
                                    <FilterX className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                    Reset Filters
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-700 dark:bg-slate-800 text-white sticky top-0 z-10">
                                    <TableRow className="hover:bg-slate-700 border-none">
                                        <TableHead className="font-bold text-white w-[22%]">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    onClick={() => handleSort('branch')}
                                                    className="cursor-pointer select-none flex items-center gap-1.5 hover:text-amber-300 transition-colors"
                                                >
                                                    <Building2 className="w-4 h-4 text-amber-400" />
                                                    <span>Branch</span>
                                                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                                </span>
                                                <div className="flex items-center gap-1 ml-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 w-6 p-0 text-white hover:bg-slate-600 hover:text-white"
                                                        onClick={expandAllBranches}
                                                        title="Expand all branches"
                                                    >
                                                        <ChevronsDownUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 w-6 p-0 text-white hover:bg-slate-600 hover:text-white"
                                                        onClick={collapseAllBranches}
                                                        title="Collapse all branches"
                                                    >
                                                        <ChevronsUpDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableHead>

                                        <TableHead
                                            onClick={() => handleSort('department')}
                                            className="cursor-pointer select-none font-bold text-white hover:text-amber-300 transition-colors w-[16%]"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase className="w-4 h-4 text-amber-400" />
                                                <span>Department</span>
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                            </div>
                                        </TableHead>

                                        <TableHead
                                            onClick={() => handleSort('employee_name')}
                                            className="cursor-pointer select-none font-bold text-white hover:text-amber-300 transition-colors w-[22%]"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-amber-400" />
                                                <span>Employee Name</span>
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                            </div>
                                        </TableHead>

                                        <TableHead
                                            onClick={() => handleSort('score_type_1')}
                                            className="cursor-pointer select-none font-bold text-white hover:text-amber-300 transition-colors text-center w-[14%]"
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                <ClipboardCheck className="w-4 h-4 text-blue-300" />
                                                <span>Form Type 1 (Score / 100)</span>
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                            </div>
                                        </TableHead>

                                        <TableHead
                                            onClick={() => handleSort('score_type_2')}
                                            className="cursor-pointer select-none font-bold text-white hover:text-amber-300 transition-colors text-center w-[14%]"
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                <FileCheck2 className="w-4 h-4 text-purple-300" />
                                                <span>Form Type 2 (Score / 100)</span>
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                            </div>
                                        </TableHead>

                                        <TableHead
                                            onClick={() => handleSort('avg_score')}
                                            className="cursor-pointer select-none font-bold text-white hover:text-amber-300 transition-colors text-left w-[12%]"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp className="w-4 h-4 text-emerald-300" />
                                                <span>Average Score</span>
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {paginatedBranchGroups.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                                                    <ClipboardCheck className="w-10 h-10 stroke-1 text-gray-300" />
                                                    <p className="text-base font-medium text-gray-600">
                                                        No employee checklist records found
                                                    </p>
                                                    <p className="text-xs text-gray-400 max-w-sm">
                                                        Try adjusting your search terms, fiscal month, or branch filter to see results.
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleReset}
                                                        className="mt-2 text-xs"
                                                    >
                                                        Reset Filters
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedBranchGroups.map((branchGroup) => {
                                            const isExpanded = !!expandedBranches[branchGroup.branch_name];

                                            return (
                                                <React.Fragment key={`branch-${branchGroup.branch_name}`}>
                                                    {/* Collapsible Branch Summary Row */}
                                                    <TableRow
                                                        className="cursor-pointer bg-blue-50/80 font-semibold hover:bg-blue-100/90 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border-b border-blue-200/60 dark:border-blue-900 transition-colors select-none"
                                                        onClick={() => toggleBranch(branchGroup.branch_name)}
                                                    >
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
                                                                )}
                                                                <Building2 className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
                                                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                                                    {branchGroup.branch_name}
                                                                </span>
                                                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                                                    ({branchGroup.employees.length} {branchGroup.employees.length === 1 ? 'employee' : 'employees'})
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <span className="text-xs font-medium text-blue-900/60 dark:text-blue-300/70 italic">
                                                                —
                                                            </span>
                                                        </TableCell>

                                                        <TableCell>
                                                            <span className="text-xs font-medium text-blue-900/80 dark:text-blue-300 italic">
                                                                Branch Average ({branchGroup.both_completed_count}/{branchGroup.employees.length} completed)
                                                            </span>
                                                        </TableCell>

                                                        <TableCell className="text-center font-bold">
                                                            {getScoreBadge(branchGroup.avg_type_1)}
                                                        </TableCell>

                                                        <TableCell className="text-center font-bold">
                                                            {getScoreBadge(branchGroup.avg_type_2)}
                                                        </TableCell>

                                                        <TableCell>
                                                            {getAvgScoreBadge(
                                                                branchGroup.overall_avg,
                                                                branchGroup.both_completed_count === branchGroup.employees.length && branchGroup.employees.length > 0
                                                            )}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Expanded Employees List */}
                                                    {isExpanded && branchGroup.employees.map((row) => {
                                                        const hasBoth = row.score_type_1 !== null && row.score_type_2 !== null;
                                                        return (
                                                            <TableRow
                                                                key={`emp-${row.employee_id}`}
                                                                className="hover:bg-amber-50/30 transition-colors odd:bg-slate-50/50 dark:odd:bg-slate-900/50"
                                                            >
                                                                <TableCell>
                                                                    <div className="pl-6 flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                                                        <span className="truncate">{row.branch}</span>
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell>
                                                                    <span className="inline-flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/70 dark:border-slate-700">
                                                                        {row.department || '—'}
                                                                    </span>
                                                                </TableCell>

                                                                <TableCell>
                                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                        {row.employee_name}
                                                                    </span>
                                                                </TableCell>

                                                                <TableCell className="text-center">
                                                                    {getScoreBadge(row.score_type_1, row.type_1_count)}
                                                                </TableCell>

                                                                <TableCell className="text-center">
                                                                    {getScoreBadge(row.score_type_2, row.type_2_count)}
                                                                </TableCell>

                                                                <TableCell>
                                                                    {getAvgScoreBadge(row.avg_score, hasBoth)}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Bar */}
                        {branchGroups.length > 0 && (
                            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-gray-50/30">
                                <div>
                                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                                    <span className="font-semibold text-gray-900">
                                        {Math.min(currentPage * pageSize, branchGroups.length)}
                                    </span>{' '}
                                    of <span className="font-semibold text-gray-900">{branchGroups.length}</span> branches{' '}
                                    (<span className="font-semibold text-gray-900">{sortedAndFilteredRows.length}</span> total employees)
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            className="h-8 px-2 text-xs"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                                        </Button>

                                        <span className="text-xs font-medium px-2">
                                            Page {currentPage} of {totalPages}
                                        </span>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            className="h-8 px-2 text-xs"
                                        >
                                            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
