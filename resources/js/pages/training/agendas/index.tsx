import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Eye, FileText, Filter, Plus, RotateCcw, Search } from 'lucide-react';
import React, { useState } from 'react';

type Department = { id: number; name: string };
type TrainingAgenda = {
    id: number;
    title: string;
    proposed_date: string;
    allocated_minutes: number;
    delivery_method: string;
    status: string;
    department?: Department | null;
    submitted_by?: { id: number; name: string } | null;
};

type PageProps = {
    agendas: TrainingAgenda[];
    departments?: Department[];
    filters?: {
        search: string;
        department_id: string;
        status: string;
        start_date: string;
        end_date: string;
    };
    userDepartment?: Department | null;
};

export default function AgendasIndex({ agendas = [], departments = [], filters = { search: '', department_id: 'all', status: 'all', start_date: '', end_date: '' }, userDepartment }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [deptFilter, setDeptFilter] = useState(filters.department_id || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const handleApplyFilters = () => {
        router.get('/training/agendas', {
            search,
            department_id: deptFilter,
            status: statusFilter,
            start_date: startDate,
            end_date: endDate,
        }, { preserveState: true, replace: true });
    };

    const handleResetFilters = () => {
        setSearch('');
        setDeptFilter('all');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
        router.get('/training/agendas', {}, { preserveState: true, replace: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'submitted':
                return <Badge className="bg-blue-600">Submitted</Badge>;
            case 'scheduled':
                return <Badge className="bg-amber-600">Scheduled</Badge>;
            case 'approved':
                return <Badge className="bg-emerald-600">Approved</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Training Agendas', href: '/training/agendas' },
            ]}
        >
            <Head title="Department Training Agendas" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Department Training Agendas</h1>
                        <p className="text-sm text-muted-foreground">
                            Submit, filter, and manage departmental training proposals
                        </p>
                    </div>

                </div>

                {/* Filters Card */}
                <Card className="border-purple-100 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-purple-100 dark:border-purple-900">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-900 dark:text-purple-300">
                            <Filter className="h-4 w-4 text-purple-600" /> Filter Department Agendas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Search Topic / Keyphrase</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search agendas..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                    className="pl-8 text-xs h-9 bg-white dark:bg-slate-950"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Department</label>
                            <Select value={deptFilter} onValueChange={setDeptFilter}>
                                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((d) => (
                                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Agenda Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 text-xs bg-white dark:bg-slate-950"
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <Button onClick={handleApplyFilters} className="h-9 text-xs bg-purple-700 hover:bg-purple-800 flex-1 font-bold">
                                Filter
                            </Button>
                            <Button onClick={handleResetFilters} variant="outline" className="h-9 text-xs gap-1">
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-600" /> Submitted Proposals ({agendas.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-800 text-white">
                                <TableRow>
                                    <TableHead className="font-bold text-white">Department</TableHead>
                                    <TableHead className="font-bold text-white">Training Title (አጀንዳ)</TableHead>
                                    <TableHead className="font-bold text-white">Proposed Date</TableHead>
                                    <TableHead className="font-bold text-white">Duration</TableHead>
                                    <TableHead className="font-bold text-white">Delivery Method</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agendas.map((agenda) => (
                                    <TableRow key={agenda.id} className="odd:bg-muted/40">
                                        <TableCell className="font-bold text-slate-900 dark:text-slate-100">{agenda.department?.name ?? '-'}</TableCell>
                                        <TableCell className="font-semibold">{agenda.title}</TableCell>
                                        <TableCell className="font-mono text-xs">{agenda.proposed_date}</TableCell>
                                        <TableCell className="font-mono font-medium">{agenda.allocated_minutes} min</TableCell>
                                        <TableCell className="text-xs">{agenda.delivery_method}</TableCell>
                                        <TableCell>{getStatusBadge(agenda.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/training/agendas/${agenda.id}`}>
                                                <Button variant="ghost" size="sm" className="gap-1 text-purple-700 hover:text-purple-900">
                                                    <Eye className="h-4 w-4" /> View Format
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {agendas.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No training agendas match the selected filter criteria.
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
