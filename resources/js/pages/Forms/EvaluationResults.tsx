import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FilterX, GraduationCap } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

type LinkedForm = { id: number; title: string };
type FiscalOption = { id: number; name: string; fiscal_year_id?: number };

type ResultRow = {
    employee_id: number;
    employee_name: string;
    department_name: string;
    form_id: number;
    form_title: string;
    submission_id: number;
    fiscal_year_id: number | null;
    fiscal_year_name: string | null;
    fiscal_month_id: number | null;
    fiscal_month_name: string;
    score: number | null;
    status: 'pass' | 'fail' | 'not_scored';
    status_label: string;
    next_action: 'na' | 'warning' | 'training' | 'not_scored';
    next_action_label: string;
};

type Summary = {
    rows: number;
    employees: number;
    pass: number;
    fail: number;
    warning: number;
    training: number;
    not_scored: number;
};

type PageState = 'ready' | 'missing_kpi' | 'no_forms';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Form', href: '/forms' },
    { title: 'Evaluation Results', href: '/forms/evaluation-results' },
];

function statusClass(status: ResultRow['status']) {
    if (status === 'pass') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'fail') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
}

function actionClass(action: ResultRow['next_action']) {
    if (action === 'na') return 'bg-green-50 text-green-800 border-green-200';
    if (action === 'warning') return 'bg-amber-100 text-amber-900 border-amber-200';
    if (action === 'training') return 'bg-red-50 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
}

export default function EvaluationResults({
    kpiName,
    pageState,
    linkedForms = [],
    rows = [],
    fiscalYears = [],
    fiscalMonths = [],
    currentFiscalYearId = null,
    currentFiscalMonthId = null,
}: {
    kpiName: string;
    pageState: PageState;
    linkedForms: LinkedForm[];
    rows: ResultRow[];
    summary?: Summary;
    fiscalYears: FiscalOption[];
    fiscalMonths: FiscalOption[];
    currentFiscalYearId?: number | null;
    currentFiscalMonthId?: number | null;
}) {
    const defaultYearFilter = currentFiscalYearId ? String(currentFiscalYearId) : 'all';
    const defaultMonthFilter = currentFiscalMonthId ? String(currentFiscalMonthId) : 'all';
    const [search, setSearch] = useState('');
    const [formFilter, setFormFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState(defaultYearFilter);
    const [monthFilter, setMonthFilter] = useState(defaultMonthFilter);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    const monthsForYear = useMemo(() => {
        if (yearFilter === 'all') return fiscalMonths;
        return fiscalMonths.filter((month) => String(month.fiscal_year_id) === yearFilter);
    }, [fiscalMonths, yearFilter]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (query && !row.employee_name.toLowerCase().includes(query) && !row.department_name.toLowerCase().includes(query)) {
                return false;
            }
            if (formFilter !== 'all' && String(row.form_id) !== formFilter) return false;
            if (statusFilter !== 'all' && row.status !== statusFilter) return false;
            if (actionFilter !== 'all' && row.next_action !== actionFilter) return false;
            if (yearFilter !== 'all' && String(row.fiscal_year_id) !== yearFilter) return false;
            if (monthFilter !== 'all' && String(row.fiscal_month_id) !== monthFilter) return false;
            return true;
        });
    }, [rows, search, formFilter, statusFilter, actionFilter, yearFilter, monthFilter]);

    const filteredSummary = useMemo((): Summary => ({
        rows: filteredRows.length,
        employees: new Set(filteredRows.map((row) => row.employee_id)).size,
        pass: filteredRows.filter((row) => row.status === 'pass').length,
        fail: filteredRows.filter((row) => row.status === 'fail').length,
        warning: filteredRows.filter((row) => row.next_action === 'warning').length,
        training: filteredRows.filter((row) => row.next_action === 'training').length,
        not_scored: filteredRows.filter((row) => row.status === 'not_scored').length,
    }), [filteredRows]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredRows.length, search, formFilter, statusFilter, actionFilter, yearFilter, monthFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
    const pageRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const resetFilters = () => {
        setSearch('');
        setFormFilter('all');
        setStatusFilter('all');
        setActionFilter('all');
        setYearFilter(defaultYearFilter);
        setMonthFilter(defaultMonthFilter);
    };

    const escapeCsvCell = (value: string | number | null | undefined) => {
        const cell = value === null || value === undefined ? '' : String(value);
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
    };

    const exportCsv = () => {
        if (filteredRows.length === 0) return;

        const headers = [
            'employee_id',
            'Employee',
            'Department',
            'Form',
            'Fiscal month',
            'Score',
        ];

        const csvContent = [
            headers.join(','),
            ...filteredRows.map((row) =>
                [
                    row.employee_id,
                    row.employee_name,
                    row.department_name,
                    row.form_title,
                    row.fiscal_year_name
                        ? `${row.fiscal_month_name} / ${row.fiscal_year_name}`
                        : row.fiscal_month_name,
                    row.score === null ? '' : row.score.toFixed(1),
                ]
                    .map(escapeCsvCell)
                    .join(',')
            ),
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `evaluation_results_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluation Results" />
            <div className="max-w-[90rem] mx-auto space-y-6 pb-12">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-amber-900">Evaluation Results</h2>
                    <p className="text-muted-foreground">
                        Employees scored on forms linked to <span className="font-medium text-gray-800">{kpiName}</span>.
                        Pass is 75 or above. A fail from 60 to 74.9 is a warning. Below 60 is training.
                    </p>
                </div>

                {pageState === 'missing_kpi' && (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-8 text-center">
                        <GraduationCap className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                        <h3 className="text-lg font-medium text-gray-900">KPI not found</h3>
                        <p className="mx-auto mt-1 max-w-xl text-gray-600">
                            Add a KPI Library entry named "{kpiName}", then link the assessment forms to it.
                        </p>
                        <Button asChild className="mt-4" variant="outline">
                            <Link href="/kpi-libraries">Open KPI Library</Link>
                        </Button>
                    </div>
                )}

                {pageState === 'no_forms' && (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-8 text-center">
                        <GraduationCap className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                        <h3 className="text-lg font-medium text-gray-900">No forms linked</h3>
                        <p className="mx-auto mt-1 max-w-xl text-gray-600">
                            "{kpiName}" exists, but it is not linked to any form yet.
                        </p>
                        <Button asChild className="mt-4" variant="outline">
                            <Link href="/kpi-libraries">Link forms in KPI Library</Link>
                        </Button>
                    </div>
                )}

                {pageState === 'ready' && (
                    <>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                            {[
                                ['Rows', filteredSummary.rows],
                                ['Employees', filteredSummary.employees],
                                ['Pass', filteredSummary.pass],
                                ['Fail', filteredSummary.fail],
                                ['Warning', filteredSummary.warning],
                                ['Training', filteredSummary.training],
                                ['Not scored', filteredSummary.not_scored],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="rounded-lg border bg-white px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                                    <p className="mt-1 text-2xl font-bold text-amber-950">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:flex-wrap lg:items-center">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search employee or department"
                                className="lg:max-w-xs"
                            />
                            <Select value={formFilter} onValueChange={setFormFilter}>
                                <SelectTrigger className="lg:w-56">
                                    <SelectValue placeholder="Form" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All linked forms</SelectItem>
                                    {linkedForms.map((form) => (
                                        <SelectItem key={form.id} value={String(form.id)}>{form.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="lg:w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="pass">Pass</SelectItem>
                                    <SelectItem value="fail">Fail</SelectItem>
                                    <SelectItem value="not_scored">Not scored</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="lg:w-44">
                                    <SelectValue placeholder="Next action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All actions</SelectItem>
                                    <SelectItem value="na">NA</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="training">Training</SelectItem>
                                    <SelectItem value="not_scored">Not scored</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={yearFilter}
                                onValueChange={(value) => {
                                    setYearFilter(value);
                                    setMonthFilter('all');
                                }}
                            >
                                <SelectTrigger className="lg:w-44">
                                    <SelectValue placeholder="Fiscal year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All years</SelectItem>
                                    {fiscalYears.map((year) => (
                                        <SelectItem key={year.id} value={String(year.id)}>{year.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={monthFilter} onValueChange={setMonthFilter}>
                                <SelectTrigger className="lg:w-44">
                                    <SelectValue placeholder="Fiscal month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All months</SelectItem>
                                    {monthsForYear.map((month) => (
                                        <SelectItem key={month.id} value={String(month.id)}>{month.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" onClick={resetFilters} className="text-gray-600">
                                <FilterX className="mr-2 h-4 w-4" /> Reset
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={exportCsv}
                                disabled={filteredRows.length === 0}
                                className="lg:ml-auto"
                            >
                                <Download className="mr-2 h-4 w-4" /> Export CSV
                            </Button>
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Form</TableHead>
                                        <TableHead>Fiscal month</TableHead>
                                        <TableHead className="text-right">Score</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Next action</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pageRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                                                {rows.length === 0
                                                    ? 'No employees have an assessment on the linked forms yet.'
                                                    : 'No rows match these filters.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pageRows.map((row) => (
                                            <TableRow key={`${row.employee_id}-${row.form_id}-${row.fiscal_month_id ?? 'none'}`}>
                                                <TableCell className="font-medium text-gray-900">{row.employee_name}</TableCell>
                                                <TableCell>{row.department_name}</TableCell>
                                                <TableCell>{row.form_title}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{row.fiscal_month_name}</span>
                                                        {row.fiscal_year_name && (
                                                            <span className="text-xs text-muted-foreground">{row.fiscal_year_name}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {row.score === null ? '—' : `${row.score.toFixed(1)}`}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                                                        {row.status_label}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${actionClass(row.next_action)}`}>
                                                        {row.next_action_label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/submissions/${row.submission_id}`} className="text-sm font-medium text-amber-800 hover:underline">
                                                        View
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {filteredRows.length > itemsPerPage && (
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>
                                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length}
                                </span>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>
                                        Previous
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
