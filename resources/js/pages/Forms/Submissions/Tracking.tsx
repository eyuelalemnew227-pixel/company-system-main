import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    LabelList
} from 'recharts';
import {
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    FilterX,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    Users,
    ArrowLeft,
    BarChart3,
    TrendingUp,
    AlertCircle,
    X,
    ExternalLink,
    RefreshCw
} from 'lucide-react';

interface BranchItem {
    id: number | string;
    name: string;
    branch_code?: string | null;
    location?: string | null;
}

interface SubmissionItem {
    id: number;
    branch_id: number | string;
    branch_name: string;
    user_id: number;
    user_name: string;
    status: string;
    created_at: string;
    date: string;
    fiscal_year_id?: number | null;
    fiscal_year_name?: string | null;
    fiscal_month_id?: number | null;
    fiscal_month_name?: string | null;
}

interface BranchRowItem {
    id: number | string;
    name: string;
    branch_code?: string | null;
    location?: string | null;
    is_visited: boolean;
    visits_count: number;
    latest_visit_at: string | null;
    inspectors: string[];
    submissions: SubmissionItem[];
}

interface FiscalYear {
    id: number;
    name: string;
    start_date?: string | null;
    end_date?: string | null;
}

interface FiscalMonth {
    id: number;
    fiscal_year_id: number;
    name: string;
    start_date?: string | null;
    end_date?: string | null;
}

interface TrackingProps {
    form: {
        id: number;
        title: string;
        description?: string | null;
        status?: string | null;
    };
    availableForms?: Array<{ id: number; title: string }>;
    allBranches: BranchItem[];
    submissions: SubmissionItem[];
    fiscalYears: FiscalYear[];
    fiscalMonths: FiscalMonth[];
    currentFiscalYearId?: number | null;
    currentFiscalMonthId?: number | null;
}

export default function Tracking({
    form,
    availableForms = [],
    allBranches = [],
    submissions = [],
    fiscalYears = [],
    fiscalMonths = [],
    currentFiscalYearId = null,
    currentFiscalMonthId = null,
}: TrackingProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form', href: '/forms' },
        { title: 'All Submissions', href: '/submissions' },
        { title: `${form.title} Tracking`, href: `/submissions/form/${form.id}/tracking` },
    ];

    // Filter States
    const [fiscalYearFilter, setFiscalYearFilter] = useState(() =>
        currentFiscalYearId ? String(currentFiscalYearId) : 'all'
    );
    const [fiscalMonthFilter, setFiscalMonthFilter] = useState(() =>
        currentFiscalMonthId ? String(currentFiscalMonthId) : 'all'
    );
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [branchTab, setBranchTab] = useState<'all' | 'visited' | 'unvisited' | 'submissions'>('all');
    const [chartFilter, setChartFilter] = useState<'all' | 'visited'>('visited');
    const [selectedBranch, setSelectedBranch] = useState<BranchRowItem | null>(null);

    // Reset fiscal month if chosen year does not contain that month
    useEffect(() => {
        if (fiscalYearFilter !== 'all' && fiscalMonthFilter !== 'all') {
            const validInYear = fiscalMonths.some(
                fm => String(fm.fiscal_year_id) === fiscalYearFilter && String(fm.id) === fiscalMonthFilter
            );
            if (!validInYear) {
                setFiscalMonthFilter('all');
            }
        }
    }, [fiscalYearFilter, fiscalMonthFilter, fiscalMonths]);

    // Available fiscal months filtered by selected fiscal year
    const availableFiscalMonths = useMemo(() => {
        if (fiscalYearFilter === 'all') return fiscalMonths;
        return fiscalMonths.filter(fm => String(fm.fiscal_year_id) === fiscalYearFilter);
    }, [fiscalMonths, fiscalYearFilter]);

    // 1. Filter raw submissions according to fiscal year, fiscal month, and date range
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            // Fiscal Year Filter
            if (fiscalYearFilter !== 'all' && String(sub.fiscal_year_id) !== fiscalYearFilter) {
                return false;
            }

            // Fiscal Month Filter
            if (fiscalMonthFilter !== 'all' && String(sub.fiscal_month_id) !== fiscalMonthFilter) {
                return false;
            }

            // Date Range Filter (compare YYYY-MM-DD)
            const subDate = sub.date || sub.created_at.slice(0, 10);
            if (startDate && subDate < startDate) return false;
            if (endDate && subDate > endDate) return false;

            return true;
        });
    }, [submissions, fiscalYearFilter, fiscalMonthFilter, startDate, endDate]);

    // 2. Aggregate branch visits from filtered submissions
    const branchVisitStats = useMemo(() => {
        // Map from branch identifier (ID or normalized name) to submission list
        const branchSubmissionsMap: Record<string, SubmissionItem[]> = {};

        filteredSubmissions.forEach(sub => {
            const key = String(sub.branch_id || sub.branch_name || 'unassigned');
            if (!branchSubmissionsMap[key]) {
                branchSubmissionsMap[key] = [];
            }
            branchSubmissionsMap[key].push(sub);
        });

        // Track all branches in system plus any extra custom/unassigned branches
        const branchRows: Array<{
            id: string | number;
            name: string;
            branch_code?: string | null;
            location?: string | null;
            is_visited: boolean;
            visits_count: number;
            latest_visit_at: string | null;
            inspectors: string[];
            submissions: SubmissionItem[];
        }> = [];

        const accountedKeys = new Set<string>();

        allBranches.forEach(b => {
            const key = String(b.id);
            accountedKeys.add(key);

            // Also check by exact name match if id didn't match directly
            const subs = branchSubmissionsMap[key] ||
                Object.entries(branchSubmissionsMap).find(([k, sList]) =>
                    sList.length > 0 && sList[0].branch_name.toLowerCase() === b.name.toLowerCase()
                )?.[1] || [];

            const isVisited = subs.length > 0;
            const inspectors = Array.from(new Set(subs.map(s => s.user_name))).filter(Boolean);
            const latestSub = subs[0]; // submissions are pre-sorted newest first

            branchRows.push({
                id: b.id,
                name: b.name,
                branch_code: b.branch_code,
                location: b.location,
                is_visited: isVisited,
                visits_count: subs.length,
                latest_visit_at: latestSub ? latestSub.created_at : null,
                inspectors,
                submissions: subs,
            });
        });

        return branchRows;
    }, [allBranches, filteredSubmissions]);

    // 3. Overall KPI calculations
    const kpiMetrics = useMemo(() => {
        const total = branchVisitStats.length;
        const visited = branchVisitStats.filter(b => b.is_visited).length;
        const unvisited = total - visited;
        const coverageRate = total > 0 ? Math.round((visited / total) * 1000) / 10 : 0;
        const totalSubmissions = filteredSubmissions.length;

        return {
            total,
            visited,
            unvisited,
            coverageRate,
            totalSubmissions,
        };
    }, [branchVisitStats, filteredSubmissions]);

    // 4. Bar Chart Data (Branches, sorted by visits descending, no top-15 limit)
    const barChartData = useMemo(() => {
        let list = branchVisitStats;
        if (chartFilter === 'visited') {
            list = list.filter(b => b.is_visited);
        }
        return list
            .sort((a, b) => {
                if (b.visits_count !== a.visits_count) return b.visits_count - a.visits_count;
                return a.name.localeCompare(b.name);
            })
            .map(b => ({
                name: b.name,
                visits: b.visits_count,
                latest: b.latest_visit_at
                    ? new Date(b.latest_visit_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                    })
                    : '-',
            }));
    }, [branchVisitStats, chartFilter]);

    // 5. Pie Chart Data (Visited vs Unvisited)
    const pieChartData = useMemo(() => {
        return [
            { name: 'Visited', value: kpiMetrics.visited, color: '#059669' },
            { name: 'Not Visited', value: kpiMetrics.unvisited, color: '#f59e0b' },
        ];
    }, [kpiMetrics]);

    // 6. Filtered branches list according to tab & search input
    const displayedBranches = useMemo(() => {
        let list = branchVisitStats;

        if (branchTab === 'visited') {
            list = list.filter(b => b.is_visited);
        } else if (branchTab === 'unvisited') {
            list = list.filter(b => !b.is_visited);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(b =>
                b.name.toLowerCase().includes(q) ||
                (b.branch_code && b.branch_code.toLowerCase().includes(q))
            );
        }

        // Sort: visited first, then by visits count descending, then alphabetical
        return list.sort((a, b) => {
            if (a.is_visited !== b.is_visited) return a.is_visited ? -1 : 1;
            if (b.visits_count !== a.visits_count) return b.visits_count - a.visits_count;
            return a.name.localeCompare(b.name);
        });
    }, [branchVisitStats, branchTab, searchQuery]);

    // Reset all active filters
    const resetFilters = () => {
        setFiscalYearFilter('all');
        setFiscalMonthFilter('all');
        setStartDate('');
        setEndDate('');
        setSearchQuery('');
        setBranchTab('all');
        setChartFilter('visited');
    };

    const hasActiveFilters =
        fiscalYearFilter !== 'all' ||
        fiscalMonthFilter !== 'all' ||
        startDate !== '' ||
        endDate !== '' ||
        searchQuery !== '';

    // Export CSV report of branch tracking
    const exportTrackingCSV = () => {
        const headers = ['Branch Name', 'Branch Code', 'Visit Status', 'Total Visits', 'Latest Visit Date'];
        const rows = branchVisitStats.map(b => [
            `"${b.name.replace(/"/g, '""')}"`,
            `"${(b.branch_code || '').replace(/"/g, '""')}"`,
            b.is_visited ? 'Visited' : 'Not Visited',
            b.visits_count,
            b.latest_visit_at ? `"${new Date(b.latest_visit_at).toLocaleString()}"` : 'N/A',
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${form.title.replace(/\s+/g, '_')}_tracking_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${form.title} - Submission Tracking`} />

            <div className="max-w-[90rem] mx-auto space-y-6 pb-14">
                {/* Header with Navigation and Form Switcher */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-xl border border-amber-900/10 shadow-xs">
                    <div>
                        <div className="flex items-center space-x-2 text-sm text-amber-700 mb-1">
                            <Link href="/submissions" className="hover:underline flex items-center font-medium">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Submissions Directory
                            </Link>
                            <span>/</span>
                            <Link href={`/submissions/form/${form.id}`} className="hover:underline text-gray-500">
                                View Submissions Data
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2.5 rounded-lg border border-amber-200">
                                <TrendingUp className="w-6 h-6 text-amber-800" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-amber-950 flex items-center gap-2">
                                    {form.title} Tracking
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Branch visit coverage, frequency analytics, and inspection timeline.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                        {/* Form Switcher */}
                        {availableForms.length > 1 && (
                            <div className="w-[220px]">
                                <SearchableSelect
                                    value={String(form.id)}
                                    onValueChange={(val) => {
                                        if (val && val !== String(form.id)) {
                                            router.visit(`/submissions/form/${val}/tracking`);
                                        }
                                    }}
                                    placeholder="Switch Checklist..."
                                    searchPlaceholder="Search checklist..."
                                    allowAll={false}
                                    className="bg-amber-50/50 border-amber-200 text-amber-950"
                                    options={availableForms.map(f => ({ id: String(f.id), name: f.title }))}
                                />
                            </div>
                        )}

                        <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 shadow-2xs">
                            <Link href={`/submissions/form/${form.id}`}>
                                <Eye className="w-4 h-4 mr-1.5 text-gray-500" />
                                View Submissions Data
                            </Link>
                        </Button>

                        <Button
                            onClick={exportTrackingCSV}
                            variant="outline"
                            className="text-amber-900 border-amber-300 hover:bg-amber-50 shadow-2xs"
                        >
                            <Download className="w-4 h-4 mr-1.5 text-amber-700" />
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Visited Branches */}
                    <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold text-emerald-900">Visited Branches</CardTitle>
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-3xl font-extrabold text-emerald-900">{kpiMetrics.visited}</span>
                                <span className="text-sm font-medium text-gray-500">/ {kpiMetrics.total} branches</span>
                            </div>
                            <p className="text-xs text-emerald-700 mt-1 font-medium">
                                Successfully inspected in selected period
                            </p>
                        </CardContent>
                    </Card>

                    {/* Unvisited Branches */}
                    <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white shadow-2xs">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold text-amber-950">Pending / Unvisited</CardTitle>
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                                <Clock className="w-5 h-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-3xl font-extrabold text-amber-900">{kpiMetrics.unvisited}</span>
                                <span className="text-sm font-medium text-gray-500">branches</span>
                            </div>
                            <p className="text-xs text-amber-700 mt-1 font-medium">
                                Require inspection visit
                            </p>
                        </CardContent>
                    </Card>

                    {/* Coverage Percentage */}
                    <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/40 to-white shadow-2xs">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold text-blue-900">Branch Coverage</CardTitle>
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-3xl font-extrabold text-blue-950">{kpiMetrics.coverageRate}%</span>
                            </div>
                            <div className="w-full bg-blue-100 h-2 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, kpiMetrics.coverageRate)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Submissions Recorded */}
                    <Card className="border-gray-200 bg-white shadow-2xs">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold text-gray-900">Total Visits Recorded</CardTitle>
                            <div className="p-2 bg-gray-100 rounded-lg text-gray-700">
                                <FileText className="w-5 h-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-3xl font-extrabold text-gray-900">{kpiMetrics.totalSubmissions}</span>
                                <span className="text-sm font-medium text-gray-500">submissions</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Across all inspected branches
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-white rounded-xl shadow-xs border border-amber-900/10 p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Branch Input */}
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search branch name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-gray-50/60 border-gray-200 focus:border-amber-400"
                            />
                        </div>

                        {/* Fiscal Year Filter */}
                        <div className="w-[180px]">
                            <SearchableSelect
                                value={fiscalYearFilter}
                                onValueChange={setFiscalYearFilter}
                                placeholder="Fiscal Year"
                                searchPlaceholder="Search fiscal year..."
                                allowAll={true}
                                allLabel="All Fiscal Years"
                                className="bg-gray-50/60 border-gray-200"
                                options={fiscalYears.map(fy => ({ id: String(fy.id), name: fy.name }))}
                            />
                        </div>

                        {/* Fiscal Month Filter */}
                        <div className="w-[180px]">
                            <SearchableSelect
                                value={fiscalMonthFilter}
                                onValueChange={setFiscalMonthFilter}
                                placeholder="Fiscal Month"
                                searchPlaceholder="Search month..."
                                allowAll={true}
                                allLabel="All Fiscal Months"
                                className="bg-gray-50/60 border-gray-200"
                                options={availableFiscalMonths.map(fm => ({ id: String(fm.id), name: fm.name }))}
                            />
                        </div>

                        {/* Date Range Filter (From & To) */}
                        <div className="flex items-center gap-2 bg-gray-50/90 px-3 py-1 rounded-lg border border-gray-200 shadow-2xs">
                            <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                            <div className="flex items-center gap-1.5">
                                <div className="relative flex items-center">
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        onClick={(e) => {
                                            try {
                                                e.currentTarget.showPicker();
                                            } catch {}
                                        }}
                                        className="h-8 w-[145px] cursor-pointer bg-white text-xs border-gray-200 focus:border-amber-400 px-2.5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                                        title="Start Date (click to pick)"
                                        aria-label="Start Date"
                                    />
                                </div>
                                <span className="text-gray-400 text-xs font-semibold px-0.5">to</span>
                                <div className="relative flex items-center">
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        onClick={(e) => {
                                            try {
                                                e.currentTarget.showPicker();
                                            } catch {}
                                        }}
                                        className="h-8 w-[145px] cursor-pointer bg-white text-xs border-gray-200 focus:border-amber-400 px-2.5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                                        title="End Date (click to pick)"
                                        aria-label="End Date"
                                    />
                                </div>
                                {(startDate || endDate) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStartDate('');
                                            setEndDate('');
                                        }}
                                        className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-100 transition-colors ml-0.5"
                                        title="Clear date range"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="text-gray-600 hover:text-amber-900 hover:bg-amber-50 h-9"
                            >
                                <FilterX className="w-4 h-4 mr-1.5 text-amber-700" />
                                Reset Filters
                            </Button>
                        )}
                    </div>

                    {/* Active Filter Summary Badges */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">Active Filters:</span>
                            {fiscalYearFilter !== 'all' && (
                                <Badge variant="secondary" className="bg-amber-100/70 text-amber-900 border-amber-200">
                                    FY: {fiscalYears.find(fy => String(fy.id) === fiscalYearFilter)?.name || fiscalYearFilter}
                                </Badge>
                            )}
                            {fiscalMonthFilter !== 'all' && (
                                <Badge variant="secondary" className="bg-amber-100/70 text-amber-900 border-amber-200">
                                    Month: {fiscalMonths.find(fm => String(fm.id) === fiscalMonthFilter)?.name || fiscalMonthFilter}
                                </Badge>
                            )}
                            {(startDate || endDate) && (
                                <Badge variant="secondary" className="bg-amber-100/70 text-amber-900 border-amber-200">
                                    Dates: {startDate || 'Start'} → {endDate || 'End'}
                                </Badge>
                            )}
                            {searchQuery && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                    Search: "{searchQuery}"
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                {/* Graphs Section: Visited Branches Bar Chart & Coverage Donut */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Graph 1: Visited Branches Ranking Bar Chart */}
                    <Card className="lg:col-span-2 border-amber-900/10 shadow-xs">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <div>
                                    <CardTitle className="text-lg font-bold text-amber-950 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-amber-700" />
                                        Branches Visited & Visit Frequency
                                    </CardTitle>
                                    <CardDescription>
                                        Number of inspection visits recorded per branch
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                                        <button
                                            type="button"
                                            onClick={() => setChartFilter('visited')}
                                            className={`px-2.5 py-1 rounded-md transition-colors ${chartFilter === 'visited'
                                                ? 'bg-white font-bold text-emerald-800 shadow-2xs'
                                                : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                        >
                                            Visited Only ({kpiMetrics.visited})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChartFilter('all')}
                                            className={`px-2.5 py-1 rounded-md transition-colors ${chartFilter === 'all'
                                                ? 'bg-white font-bold text-amber-950 shadow-2xs'
                                                : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                        >
                                            All Branches ({kpiMetrics.total})
                                        </button>
                                    </div>
                                    <Badge variant="outline" className="text-amber-800 border-amber-200 bg-amber-50">
                                        {barChartData.length} Branches
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {barChartData.length === 0 ? (
                                <div className="h-[320px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                    <AlertCircle className="w-10 h-10 text-gray-300 mb-2" />
                                    <h4 className="font-semibold text-gray-700">No branch visits found</h4>
                                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                                        No checklist submissions match the selected fiscal year, month, or date range.
                                    </p>
                                    {hasActiveFilters && (
                                        <Button size="sm" variant="outline" onClick={resetFilters} className="mt-3 text-xs">
                                            Reset Filters
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[340px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={barChartData}
                                            margin={{ top: 25, right: 15, left: 10, bottom: 55 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis
                                                dataKey="name"
                                                angle={-45}
                                                textAnchor="end"
                                                interval={0}
                                                height={65}
                                                tick={{ fontSize: 10, fill: '#4b5563' }}
                                            />
                                            <YAxis
                                                hide
                                                domain={[0, (dataMax: number) => Math.max(dataMax + 1, Math.ceil(dataMax * 1.15))]}
                                            />
                                            <Bar
                                                dataKey="visits"
                                                name="Inspection Visits"
                                                fill="#b45309"
                                                radius={[6, 6, 0, 0]}
                                                activeBar={false}
                                                maxBarSize={32}
                                                className="cursor-pointer"
                                                onClick={(entry: any) => {
                                                    if (entry && entry.name) {
                                                        const found = branchVisitStats.find(b => b.name === entry.name);
                                                        if (found) setSelectedBranch(found);
                                                    }
                                                }}
                                            >
                                                <LabelList
                                                    dataKey="visits"
                                                    position="top"
                                                    fill="#78350f"
                                                    fontSize={11}
                                                    fontWeight="bold"
                                                    offset={6}
                                                    formatter={(val: number) => val > 0 ? val : (chartFilter === 'all' ? 0 : '')}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Graph 2: Coverage Donut / Pie Chart */}
                    <Card className="border-amber-900/10 shadow-xs flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold text-amber-950 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-amber-700" />
                                Visit Distribution
                            </CardTitle>
                            <CardDescription>
                                Visited vs Unvisited branches in system
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2 flex-1 flex flex-col justify-center">
                            <div className="h-[230px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            innerRadius={65}
                                            outerRadius={88}
                                            paddingAngle={4}
                                            dataKey="value"
                                            isAnimationActive={false}
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(val: string) => {
                                                const count = val === 'Visited' ? kpiMetrics.visited : kpiMetrics.unvisited;
                                                return `${val}: ${count}`;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-9">
                                    <span className="text-2xl font-extrabold text-amber-950">
                                        {kpiMetrics.coverageRate}%
                                    </span>
                                    <span className="text-[11px] font-medium text-gray-500">Coverage</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-center text-xs">
                                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                                    <div className="text-emerald-700 font-bold text-base">{kpiMetrics.visited}</div>
                                    <div className="text-emerald-900 font-medium">Visited Branches</div>
                                </div>
                                <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                                    <div className="text-amber-800 font-bold text-base">{kpiMetrics.unvisited}</div>
                                    <div className="text-amber-900 font-medium">Pending Branches</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Branches Table & Detail Tabs */}
                <Card className="border-amber-900/10 shadow-xs">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                                <CardTitle className="text-lg font-bold text-amber-950 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-amber-700" />
                                    Branch Inspection Breakdown
                                </CardTitle>
                                <CardDescription>
                                    Click any branch to view all its recorded inspection visits and submissions.
                                </CardDescription>
                            </div>

                            {/* View Filter Tabs */}
                            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
                                <button
                                    onClick={() => setBranchTab('all')}
                                    className={`px-3 py-1.5 rounded-md transition-colors ${branchTab === 'all'
                                        ? 'bg-white text-amber-950 shadow-2xs font-bold'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    All ({kpiMetrics.total})
                                </button>
                                <button
                                    onClick={() => setBranchTab('visited')}
                                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${branchTab === 'visited'
                                        ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Visited ({kpiMetrics.visited})
                                </button>
                                <button
                                    onClick={() => setBranchTab('unvisited')}
                                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${branchTab === 'unvisited'
                                        ? 'bg-white text-amber-800 shadow-2xs font-bold'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Not Visited ({kpiMetrics.unvisited})
                                </button>
                                <button
                                    onClick={() => setBranchTab('submissions')}
                                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${branchTab === 'submissions'
                                        ? 'bg-white text-blue-900 shadow-2xs font-bold'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                                    Submissions Log ({filteredSubmissions.length})
                                </button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {branchTab === 'submissions' ? (
                            /* Submissions Log View */
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/60">
                                            <TableHead className="w-[100px]">ID</TableHead>
                                            <TableHead>Branch</TableHead>
                                            <TableHead>Submitted By</TableHead>
                                            <TableHead>Fiscal Period</TableHead>
                                            <TableHead>Submitted At</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSubmissions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                                    No submissions found matching the selected filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSubmissions.map((sub) => (
                                                <TableRow key={sub.id} className="hover:bg-amber-50/20">
                                                    <TableCell className="font-mono font-medium text-amber-900">
                                                        #{sub.id}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-gray-900">
                                                        {sub.branch_name}
                                                    </TableCell>
                                                    <TableCell className="text-gray-700">
                                                        {sub.user_name}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-500">
                                                        {sub.fiscal_year_name && (
                                                            <span className="font-medium text-gray-700">{sub.fiscal_year_name}</span>
                                                        )}
                                                        {sub.fiscal_month_name && (
                                                            <span className="ml-1 text-gray-500">({sub.fiscal_month_name})</span>
                                                        )}
                                                        {!sub.fiscal_year_name && !sub.fiscal_month_name && '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600">
                                                        {new Date(sub.created_at).toLocaleString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                sub.status === 'approved'
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                                    : sub.status === 'rejected'
                                                                        ? 'bg-red-100 text-red-800 border-red-200'
                                                                        : 'bg-amber-100 text-amber-900 border-amber-200'
                                                            }
                                                        >
                                                            {sub.status || 'pending'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button asChild size="sm" variant="ghost" className="h-8 text-amber-900 hover:text-amber-950 hover:bg-amber-100/50">
                                                            <Link href={`/submissions/${sub.id}`}>
                                                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            /* Branches Overview Table */
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/60">
                                            <TableHead className="w-[300px]">Branch</TableHead>
                                            <TableHead className="w-[150px]">Visit Status</TableHead>
                                            <TableHead className="w-[130px] text-center">Visit Count</TableHead>
                                            <TableHead>Latest Visit Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedBranches.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-gray-500">
                                                    No branches found matching your search and filter criteria.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            displayedBranches.map((b) => (
                                                <TableRow
                                                    key={String(b.id)}
                                                    onClick={() => setSelectedBranch(b)}
                                                    className="hover:bg-amber-50/30 cursor-pointer group transition-colors"
                                                >
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900 group-hover:text-amber-900 group-hover:underline text-sm flex items-center gap-1.5">
                                                                {b.name}
                                                                <ExternalLink className="w-3 h-3 text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                            </span>
                                                            {b.branch_code && (
                                                                <span className="text-xs text-gray-400">
                                                                    {b.branch_code}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        {b.is_visited ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center w-fit gap-1 text-xs">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Visited
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50/80 flex items-center w-fit gap-1 text-xs">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Not Visited
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {b.visits_count > 0 ? (
                                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 group-hover:bg-amber-200 transition-colors">
                                                                {b.visits_count} {b.visits_count === 1 ? 'visit' : 'visits'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">0</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs text-gray-600">
                                                        {b.latest_visit_at ? (
                                                            <span>
                                                                {new Date(b.latest_visit_at).toLocaleString(undefined, {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 italic">No visits recorded</span>
                                                        )}
                                                    </TableCell>


                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Branch Visits Modal Dialog */}
                <Dialog open={selectedBranch !== null} onOpenChange={(open) => !open && setSelectedBranch(null)}>
                    <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                        <DialogHeader className="p-5 pb-4 border-b border-gray-100 bg-gradient-to-r from-amber-50/60 to-white">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-100 rounded-xl text-amber-900 border border-amber-200">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-bold text-amber-950 flex items-center gap-2">
                                            {selectedBranch?.name}
                                            {selectedBranch?.branch_code && (
                                                <Badge variant="outline" className="font-mono text-xs text-gray-600 border-gray-300">
                                                    {selectedBranch?.branch_code}
                                                </Badge>
                                            )}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-gray-500 mt-1">
                                            {selectedBranch?.submissions.length === 0
                                                ? 'No inspection visits recorded for this branch in current filter period.'
                                                : `Viewing all ${selectedBranch?.submissions.length} inspection ${selectedBranch?.submissions.length === 1 ? 'visit' : 'visits'} recorded for this branch.`
                                            }
                                        </DialogDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mr-6">
                                    {selectedBranch?.is_visited ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1 font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {selectedBranch.submissions.length} {selectedBranch.submissions.length === 1 ? 'Visit' : 'Visits'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50 flex items-center gap-1 font-semibold">
                                            <Clock className="w-3.5 h-3.5" />
                                            Not Visited
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="p-5 overflow-y-auto flex-1">
                            {selectedBranch && selectedBranch.submissions.length > 0 ? (
                                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/80">
                                                <TableHead className="w-[80px]">ID</TableHead>
                                                <TableHead>Inspector / Submitted By</TableHead>
                                                <TableHead>Fiscal Period</TableHead>
                                                <TableHead>Visit Date & Time</TableHead>
                                                <TableHead className="w-[110px]">Status</TableHead>
                                                <TableHead className="text-right w-[110px]">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedBranch.submissions.map((sub) => (
                                                <TableRow key={sub.id} className="hover:bg-amber-50/20">
                                                    <TableCell className="font-mono font-bold text-amber-900 text-xs">
                                                        #{sub.id}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {sub.user_name ? sub.user_name.charAt(0).toUpperCase() : 'U'}
                                                            </div>
                                                            <span className="font-medium text-gray-900 text-sm">
                                                                {sub.user_name}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600">
                                                        {sub.fiscal_year_name && (
                                                            <span className="font-semibold text-gray-800">{sub.fiscal_year_name}</span>
                                                        )}
                                                        {sub.fiscal_month_name && (
                                                            <span className="text-gray-500 ml-1">({sub.fiscal_month_name})</span>
                                                        )}
                                                        {!sub.fiscal_year_name && !sub.fiscal_month_name && '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600">
                                                        {new Date(sub.created_at).toLocaleString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                sub.status === 'approved'
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-xs'
                                                                    : sub.status === 'rejected'
                                                                        ? 'bg-red-100 text-red-800 border-red-200 text-xs'
                                                                        : 'bg-amber-100 text-amber-900 border-amber-200 text-xs'
                                                            }
                                                        >
                                                            {sub.status || 'pending'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            className="h-8 text-xs bg-amber-800 hover:bg-amber-900 text-white shadow-2xs"
                                                        >
                                                            <Link href={`/submissions/${sub.id}`}>
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                View
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                    <Clock className="w-12 h-12 text-amber-400 mb-3" />
                                    <h4 className="font-bold text-gray-800 text-base">No inspection visits recorded</h4>
                                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                                        There are no submitted checklist inspections recorded for {selectedBranch?.name} matching the selected fiscal period or date range.
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-row items-center justify-between sm:justify-between">
                            <div className="text-xs text-gray-500">
                                {selectedBranch && selectedBranch.submissions.length > 0 && (
                                    <span>
                                        Total <strong>{selectedBranch.submissions.length}</strong> {selectedBranch.submissions.length === 1 ? 'visit' : 'visits'} on record
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedBranch && selectedBranch.submissions.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSearchQuery(selectedBranch.name);
                                            setBranchTab('submissions');
                                            setSelectedBranch(null);
                                        }}
                                        className="text-xs border-blue-200 text-blue-900 hover:bg-blue-50"
                                    >
                                        <FileText className="w-3.5 h-3.5 mr-1 text-blue-700" />
                                        View in Submissions Tab
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedBranch(null)}
                                    className="text-xs text-gray-700"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
