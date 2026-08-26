import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Pencil, Trash2, ArrowLeft, Download, FilterX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useMemo, useEffect } from 'react';

export default function FormSubmissions({ form, submissions, branches = {}, departments = {}, employees = {} }: { form: any, submissions: any[], branches?: Record<string, string>, departments?: Record<string, string>, employees?: Record<string, string> }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Submissions Directory', href: '/submissions' },
        { title: `${form.title} Records`, href: `/submissions/form/${form.id}` },
    ];

    const destroy = (id: string) => {
        router.delete(id);
    };

    const hasBranch = useMemo(() => submissions.some(s => s.answers?.some((a: any) => (a.question?.input_type || a.question?.inputType)?.type_identifier === 'branch_lookup')), [submissions]);
    const hasDepartment = useMemo(() => submissions.some(s => s.answers?.some((a: any) => (a.question?.input_type || a.question?.inputType)?.type_identifier === 'department_lookup')), [submissions]);
    const hasEmployee = useMemo(() => submissions.some(s => s.answers?.some((a: any) => (a.question?.input_type || a.question?.inputType)?.type_identifier === 'employee_lookup')), [submissions]);

    const getLookupValue = (sub: any, type: string, dictionary: Record<string, string>) => {
        const ans = sub.answers?.find((a: any) => (a.question?.input_type || a.question?.inputType)?.type_identifier === type);
        return ans ? (dictionary[ans.value_text] || ans.value_text) : '-';
    };

    const getDynamicLabel = (type: string, fallback: string) => {
        const matchingAns = submissions.flatMap(s => s.answers || []).find((a: any) => (a.question?.input_type || a.question?.inputType)?.type_identifier === type);
        return matchingAns?.question?.label || fallback;
    };

    // Filters State
    const [statusFilter, setStatusFilter] = useState('all');
    const [submittedByFilter, setSubmittedByFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const getUserName = (user: any) => user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.employee_code || 'Unknown User';

    const filteredSubmissions = useMemo(() => {
        return submissions.filter((sub: any) => {
            // Status Pipeline
            if (statusFilter !== 'all' && (sub.status || 'pending').toLowerCase() !== statusFilter) return false;

            // Submitted By Pipeline
            if (submittedByFilter !== 'all' && getUserName(sub.user) !== submittedByFilter) return false;

            // Date Pipeline
            if (dateFrom) {
                if (new Date(sub.created_at) < new Date(dateFrom)) return false;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (new Date(sub.created_at) > toDate) return false;
            }

            // Relationship Pipelines
            if (hasBranch && branchFilter !== 'all') {
                const bVal = getLookupValue(sub, 'branch_lookup', branches);
                if (bVal !== branchFilter) return false;
            }
            if (hasDepartment && departmentFilter !== 'all') {
                const dVal = getLookupValue(sub, 'department_lookup', departments);
                if (dVal !== departmentFilter) return false;
            }
            if (hasEmployee && employeeFilter !== 'all') {
                const eVal = getLookupValue(sub, 'employee_lookup', employees);
                if (eVal !== employeeFilter) return false;
            }

            return true;
        });
    }, [submissions, statusFilter, submittedByFilter, dateFrom, dateTo, branchFilter, departmentFilter, employeeFilter, hasBranch, hasDepartment, hasEmployee, branches, departments, employees]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Reset back to page 1 whenever filters fundamentally change the dataset length
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredSubmissions.length]);

    const paginatedSubmissions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredSubmissions.slice(start, start + itemsPerPage);
    }, [filteredSubmissions, currentPage]);

    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

    const resetFilters = () => {
        setStatusFilter('all');
        setSubmittedByFilter('all');
        setBranchFilter('all');
        setDepartmentFilter('all');
        setEmployeeFilter('all');
        setDateFrom('');
        setDateTo('');
        setCurrentPage(1);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${form.title} Submissions`} />

            <div className="max-w-[90rem] mx-auto space-y-6 pb-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center space-x-2 text-sm text-amber-600 mb-1">
                            <Link href="/submissions" className="hover:underline flex items-center">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to Directory
                            </Link>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-amber-900">{form.title} Submissions</h2>
                        <p className="text-muted-foreground">Manage {submissions.length} collected records for this checklist.</p>
                    </div>
                    {submissions.length > 0 && (
                        <div className="flex space-x-3">
                            <Button asChild variant="outline" className="text-blue-700 border-blue-200 hover:bg-blue-50">
                                <a href={`/submissions/form/${form.id}/export`} target="_blank" rel="noreferrer">
                                    <Download className="mr-2 w-4 h-4" /> Export CSV
                                </a>
                            </Button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-amber-900/10 p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {hasBranch && (
                                <Select value={branchFilter} onValueChange={setBranchFilter}>
                                    <SelectTrigger className="w-[180px] bg-gray-50/50">
                                        <SelectValue placeholder={getDynamicLabel('branch_lookup', 'Branch')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{getDynamicLabel('branch_lookup', 'Branch')}</SelectItem>
                                        {Array.from(new Set(submissions.map((s: any) => getLookupValue(s, 'branch_lookup', branches))))
                                            .filter(v => v !== '-')
                                            .sort()
                                            .map((v: any, idx) => <SelectItem key={idx} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            {hasDepartment && (
                                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                    <SelectTrigger className="w-[180px] bg-gray-50/50">
                                        <SelectValue placeholder={getDynamicLabel('department_lookup', 'Department')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{getDynamicLabel('department_lookup', 'Department')}</SelectItem>
                                        {Array.from(new Set(submissions.map((s: any) => getLookupValue(s, 'department_lookup', departments))))
                                            .filter(v => v !== '-')
                                            .sort()
                                            .map((v: any, idx) => <SelectItem key={idx} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            {hasEmployee && (
                                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                                    <SelectTrigger className="w-[180px] bg-gray-50/50">
                                        <SelectValue placeholder={getDynamicLabel('employee_lookup', 'Evaluated Employee')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{getDynamicLabel('employee_lookup', 'Evaluated Employee')}</SelectItem>
                                        {Array.from(new Set(submissions.map((s: any) => getLookupValue(s, 'employee_lookup', employees))))
                                            .filter(v => v !== '-')
                                            .sort()
                                            .map((v: any, idx) => <SelectItem key={idx} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px] bg-gray-50/50">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={submittedByFilter} onValueChange={setSubmittedByFilter}>
                                <SelectTrigger className="w-[180px] bg-gray-50/50">
                                    <SelectValue placeholder="Submitted By" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Submitted By</SelectItem>
                                    {Array.from(new Set(submissions.map((s: any) => getUserName(s.user))))
                                        .filter(Boolean)
                                        .sort()
                                        .map((v: any, idx) => <SelectItem key={idx} value={v}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <div className="flex items-center space-x-2 text-sm bg-gray-50/50 rounded-md border px-2">
                                <span className="text-gray-500 font-medium px-2">From:</span>
                                <Input type="date" className="border-0 bg-transparent h-9 w-[130px] shadow-none focus-visible:ring-0 px-0" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                <span className="text-gray-500 font-medium px-2 border-l">To:</span>
                                <Input type="date" className="border-0 bg-transparent h-9 w-[130px] shadow-none focus-visible:ring-0 px-0" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                            </div>

                            <Button variant="ghost" className="text-gray-500 hover:text-amber-700" onClick={resetFilters}>
                                <FilterX className="w-4 h-4 mr-2" /> Reset
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-amber-900/10 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-amber-50/50">
                            <TableRow>
                                <TableHead className="w-[100px] text-center">Record #</TableHead>
                                {hasBranch && <TableHead>{getDynamicLabel('branch_lookup', 'Branch')}</TableHead>}
                                {hasDepartment && <TableHead>{getDynamicLabel('department_lookup', 'Department')}</TableHead>}
                                {hasEmployee && <TableHead>{getDynamicLabel('employee_lookup', 'Evaluated Employee')}</TableHead>}
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted By</TableHead>
                                <TableHead>Submission Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSubmissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={hasBranch ? (hasDepartment ? (hasEmployee ? 8 : 7) : (hasEmployee ? 7 : 6)) : (hasDepartment ? (hasEmployee ? 7 : 6) : (hasEmployee ? 6 : 5))} className="text-center py-10 text-muted-foreground">
                                        No items recorded strictly matching those filter parameters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSubmissions.map((sub: any) => (
                                    <TableRow key={sub.id} className="hover:bg-amber-50/30 transition-colors">
                                        <TableCell className="text-center font-medium">#{sub.id}</TableCell>
                                        {hasBranch && <TableCell className="font-medium text-amber-900">{getLookupValue(sub, 'branch_lookup', branches)}</TableCell>}
                                        {hasDepartment && <TableCell className="font-medium text-amber-900">{getLookupValue(sub, 'department_lookup', departments)}</TableCell>}
                                        {hasEmployee && <TableCell className="font-semibold text-blue-900">{getLookupValue(sub, 'employee_lookup', employees)}</TableCell>}
                                        <TableCell>
                                            <span className={`px-2 py-1 flex w-fit items-center justify-center text-xs font-semibold rounded-full ${sub.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                                                    sub.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                                                        sub.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                            'bg-gray-100 text-gray-800 border border-gray-200'
                                                }`}>
                                                {(sub.status || 'pending').toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-700">
                                            {getUserName(sub.user)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(sub.created_at).toLocaleDateString()} at {new Date(sub.created_at).toLocaleTimeString()}
                                        </TableCell>
                                        <TableCell className="text-right flex items-center justify-end space-x-2">
                                            <Button size="sm" variant="ghost" asChild className="text-amber-700 hover:text-amber-800 hover:bg-amber-100">
                                                <Link href={`/submissions/${sub.id}`}>
                                                    <Eye className="mr-1 w-4 h-4" /> View
                                                </Link>
                                            </Button>
                                            <Button size="sm" variant="ghost" asChild className="text-blue-700 hover:text-blue-800 hover:bg-blue-100">
                                                <Link href={`/submissions/${sub.id}/edit`}>
                                                    <Pencil className="mr-1 w-4 h-4" /> Edit
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to permanently delete this submission?')) {
                                                        destroy(`/submissions/${sub.id}`);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="mr-1 w-4 h-4" /> Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {filteredSubmissions.length > itemsPerPage && (
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-amber-900/10 sm:px-6">
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}</span> of <span className="font-medium">{filteredSubmissions.length}</span> results
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
