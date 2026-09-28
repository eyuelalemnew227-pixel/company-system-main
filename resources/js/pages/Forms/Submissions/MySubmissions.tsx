import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, FileCheck, ClipboardCheck, FilterX, ChevronLeft, ChevronRight, Search, FileText, CheckCircle2, Clock, XCircle, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import React, { useState, useMemo, useEffect } from 'react';

interface Props {
    submissions: any[];
    forms: { id: number; title: string }[];
    branches?: Record<string, string>;
    departments?: Record<string, string>;
    employees?: Record<string, string>;
    fiscalYears?: { id: number; name: string }[];
    fiscalMonths?: { id: number; fiscal_year_id: number; name: string }[];
    currentFiscalYearId?: number | null;
    currentFiscalMonthId?: number | null;
}

export default function MySubmissions({
    submissions = [],
    forms = [],
    branches = {},
    departments = {},
    employees = {},
    fiscalYears = [],
    fiscalMonths = [],
    currentFiscalYearId = null,
    currentFiscalMonthId = null,
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/available-forms' },
        { title: 'My Submissions', href: '/my-submissions' },
    ];

    const [searchQuery, setSearchQuery] = useState('');
    const [formFilter, setFormFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [fiscalYearFilter, setFiscalYearFilter] = useState('all');
    const [fiscalMonthFilter, setFiscalMonthFilter] = useState('all');

    // Helper to get lookup answers like branch or employee
    const getLookupValue = (sub: any, type: string, dictionary: Record<string, string>) => {
        const ans = sub.answers?.find((a: any) => (a.question?.input_type || a.question?.inputType)?.type_identifier === type);
        return ans ? (dictionary[ans.value_text] || ans.value_text) : '-';
    };

    const hasBranch = useMemo(() => submissions.some(s => s.answers?.some((a: any) => (a.question?.input_type || a.question?.inputType)?.type_identifier === 'branch_lookup')), [submissions]);

    // Metric counts
    const stats = useMemo(() => {
        const total = submissions.length;
        const approved = submissions.filter(s => s.status === 'approved').length;
        const pending = submissions.filter(s => !s.status || s.status === 'pending').length;
        const rejected = submissions.filter(s => s.status === 'rejected').length;
        return { total, approved, pending, rejected };
    }, [submissions]);

    // Filtering
    const filteredSubmissions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return submissions.filter((sub: any) => {
            const fVer = sub.form_version || sub.formVersion;
            const formObj = fVer?.form || sub.form;
            const formTitle = formObj?.title || (fVer?.version_number ? `Form Version ${fVer.version_number}` : 'Form Checklist');
            const subId = String(sub.id);
            const branchName = hasBranch ? getLookupValue(sub, 'branch_lookup', branches) : '';

            // Search query filter
            if (q) {
                const matchSearch = formTitle.toLowerCase().includes(q) ||
                    subId.includes(q) ||
                    branchName.toLowerCase().includes(q);
                if (!matchSearch) return false;
            }

            // Form filter
            if (formFilter !== 'all' && String(formObj?.id) !== formFilter) {
                return false;
            }

            // Status filter
            if (statusFilter !== 'all' && (sub.status || 'pending').toLowerCase() !== statusFilter) {
                return false;
            }

            // Branch filter
            if (hasBranch && branchFilter !== 'all') {
                if (branchName !== branchFilter) return false;
            }

            // Fiscal Year
            if (fiscalYearFilter !== 'all' && String(sub.fiscal_year_id) !== fiscalYearFilter) {
                return false;
            }

            // Fiscal Month
            if (fiscalMonthFilter !== 'all' && String(sub.fiscal_month_id) !== fiscalMonthFilter) {
                return false;
            }

            return true;
        });
    }, [submissions, searchQuery, formFilter, statusFilter, branchFilter, fiscalYearFilter, fiscalMonthFilter, hasBranch, branches]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, formFilter, statusFilter, branchFilter, fiscalYearFilter, fiscalMonthFilter]);

    const paginatedSubmissions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredSubmissions.slice(start, start + itemsPerPage);
    }, [filteredSubmissions, currentPage]);

    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

    const resetFilters = () => {
        setSearchQuery('');
        setFormFilter('all');
        setStatusFilter('all');
        setBranchFilter('all');
        setFiscalYearFilter('all');
        setFiscalMonthFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters = searchQuery !== '' || formFilter !== 'all' || statusFilter !== 'all' || branchFilter !== 'all' || fiscalYearFilter !== 'all' || fiscalMonthFilter !== 'all';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Submissions" />

            <div className="max-w-[90rem] mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="bg-amber-100 text-amber-800 p-2 rounded-lg border border-amber-200">
                                <FileCheck className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-amber-950">My Submissions</h1>
                                <p className="text-sm text-muted-foreground">View and review all form checklists and surveys submitted by you.</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button asChild className="bg-amber-700 hover:bg-amber-800 text-white shadow-sm">
                            <Link href="/available-forms">
                                <ClipboardCheck className="w-4 h-4 mr-2" /> Fill New Form
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Quick Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-amber-900/10 shadow-sm bg-white hover:border-amber-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Submissions</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                            </div>
                            <div className="p-2.5 rounded-full bg-gray-100 text-gray-600">
                                <FileText className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 shadow-sm bg-white hover:border-emerald-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Approved</p>
                                <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.approved}</p>
                            </div>
                            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200 shadow-sm bg-white hover:border-amber-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Review</p>
                                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</p>
                            </div>
                            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                <Clock className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-rose-200 shadow-sm bg-white hover:border-rose-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Rejected</p>
                                <p className="text-2xl font-bold text-rose-900 mt-1">{stats.rejected}</p>
                            </div>
                            <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                                <XCircle className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-white rounded-lg shadow-sm border border-amber-900/10 p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search by form title, ID, branch..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-gray-50/50"
                            />
                        </div>

                        {forms.length > 0 && (
                            <div className="w-[200px]">
                                <Select value={formFilter} onValueChange={setFormFilter}>
                                    <SelectTrigger className="bg-gray-50/50">
                                        <SelectValue placeholder="All Forms" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Forms ({forms.length})</SelectItem>
                                        {forms.map((f) => (
                                            <SelectItem key={f.id} value={String(f.id)}>
                                                {f.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="w-[150px]">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="bg-gray-50/50">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasBranch && (
                            <SearchableSelect
                                value={branchFilter}
                                onValueChange={setBranchFilter}
                                placeholder="Branch"
                                searchPlaceholder="Search branch..."
                                allowAll={true}
                                allLabel="All Branches"
                                className="w-[180px] bg-gray-50/50"
                                options={Array.from(new Set(submissions.map((s: any) => getLookupValue(s, 'branch_lookup', branches))))
                                    .filter(v => v !== '-')
                                    .sort()
                                    .map(v => ({ id: String(v), name: String(v) }))}
                            />
                        )}

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            >
                                <FilterX className="w-4 h-4 mr-1.5" /> Reset Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Submissions Table */}
                <div className="bg-white rounded-lg shadow-sm border border-amber-900/10 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50/80">
                            <TableRow>
                                <TableHead className="w-[80px]">#ID</TableHead>
                                <TableHead>Form Template</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="w-[100px]">Score</TableHead>
                                {hasBranch && <TableHead>Branch</TableHead>}
                                <TableHead className="w-[180px]">Submitted At</TableHead>
                                <TableHead className="w-[140px] text-center">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSubmissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={hasBranch ? 7 : 6} className="text-center py-16">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="p-3 bg-amber-50 rounded-full text-amber-700">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold text-gray-900">No submissions found</p>
                                                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                                    {hasActiveFilters
                                                        ? 'No submissions matched your current search filters.'
                                                        : "You haven't filled out or submitted any forms yet."}
                                                </p>
                                            </div>
                                            {hasActiveFilters ? (
                                                <Button variant="outline" size="sm" onClick={resetFilters}>
                                                    Reset Filters
                                                </Button>
                                            ) : (
                                                <Button asChild size="sm" className="bg-amber-700 hover:bg-amber-800 text-white mt-2">
                                                    <Link href="/available-forms">
                                                        <ClipboardCheck className="w-4 h-4 mr-1.5" /> Start a Form Checklist
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSubmissions.map((sub: any) => {
                                    const fVer = sub.form_version || sub.formVersion;
                                    const formObj = fVer?.form || sub.form;
                                    const formTitle = formObj?.title || (fVer?.version_number ? `Form Version ${fVer.version_number}` : 'Form Checklist');
                                    const versionNum = fVer?.version_number || 1;
                                    const statusLower = (sub.status || 'pending').toLowerCase();
                                    const branchVal = hasBranch ? getLookupValue(sub, 'branch_lookup', branches) : null;

                                    return (
                                        <TableRow key={sub.id} className="hover:bg-amber-50/30 transition-colors">
                                            <TableCell className="font-mono text-xs font-semibold text-gray-700">
                                                #{sub.id}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 line-clamp-1">{formTitle}</span>
                                                        <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                            v{versionNum}.0
                                                        </span>
                                                    </div>
                                                    {formObj?.description && (
                                                        <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                            {formObj.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    statusLower === 'approved'
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : statusLower === 'rejected'
                                                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                                }`}>
                                                    {statusLower === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />}
                                                    {statusLower === 'pending' && <Clock className="w-3 h-3 mr-1 text-amber-600" />}
                                                    {statusLower === 'rejected' && <XCircle className="w-3 h-3 mr-1 text-rose-600" />}
                                                    {statusLower.toUpperCase()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {sub.calculated_score !== null && sub.calculated_score !== undefined ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                        Number(sub.calculated_score) >= 80
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : Number(sub.calculated_score) >= 50
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        {sub.calculated_score}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </TableCell>
                                            {hasBranch && (
                                                <TableCell>
                                                    <span className="text-sm text-gray-700">{branchVal}</span>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-medium text-gray-800">
                                                        {new Date(sub.created_at).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {new Date(sub.created_at).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {/* ONLY View Detail Button (No Edit, No Delete) */}
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900 shadow-sm font-medium"
                                                >
                                                    <Link href={`/my-submissions/${sub.id}`}>
                                                        <Eye className="mr-1.5 h-3.5 w-3.5 text-amber-700" /> View Detail
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {filteredSubmissions.length > itemsPerPage && (
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-amber-900/10 sm:px-6">
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}</span> of{' '}
                                        <span className="font-medium">{filteredSubmissions.length}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <Button
                                            variant="outline"
                                            className="rounded-r-none rounded-l-md px-3 border-r-0 hover:bg-white text-gray-500"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                        </Button>
                                        <div className="px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 bg-white">
                                            Page {currentPage} of {totalPages || 1}
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="rounded-l-none rounded-r-md px-3 border-l-0 hover:bg-white text-gray-500"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        >
                                            Next <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
