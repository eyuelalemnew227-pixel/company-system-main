import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Award, BarChart3, Calendar, CheckCircle2, FileSpreadsheet, FileText, Filter, Printer, RotateCcw, Search, Star, ThumbsUp, UserCheck, Users } from 'lucide-react';
import React, { useState } from 'react';

type Department = { id: number; name: string };
type PageProps = {
    attendanceStats?: {
        total: number;
        branch_managers: { on_time: number; late: number; absent: number };
        trainers: { on_time: number; late: number; absent: number };
    };
    attendances?: any[];
    agendas?: any[];
    feedbacks?: any[];
    feedbackSummary?: {
        total_responses: number;
        avg_relevance: number;
        avg_response_quality: number;
        avg_participatory: number;
        avg_motivating: number;
        gained_knowledge_yes: number;
    };
    schedules?: any[];
    evaluations?: any[];
    departments?: Department[];
    filters?: {
        period: string;
        department_id: string;
        start_date: string;
        end_date: string;
    };
};

export default function ReportsIndex({
    attendanceStats = { total: 0, branch_managers: { on_time: 0, late: 0, absent: 0 }, trainers: { on_time: 0, late: 0, absent: 0 } },
    attendances = [],
    agendas = [],
    feedbacks = [],
    feedbackSummary = { total_responses: 0, avg_relevance: 0, avg_response_quality: 0, avg_participatory: 0, avg_motivating: 0, gained_knowledge_yes: 0 },
    schedules = [],
    evaluations = [],
    departments = [],
    filters = { period: 'all', department_id: 'all', start_date: '', end_date: '' },
}: PageProps) {
    const [deptFilter, setDeptFilter] = useState(filters.department_id || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const handleApplyFilters = () => {
        router.get('/training/reports', {
            department_id: deptFilter,
            start_date: startDate,
            end_date: endDate,
        }, { preserveState: true, replace: true });
    };

    const handleResetFilters = () => {
        setDeptFilter('all');
        setStartDate('');
        setEndDate('');
        router.get('/training/reports', {}, { preserveState: true, replace: true });
    };

    const handlePrintReport = () => {
        window.print();
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Consolidated Training Reports', href: '/training/reports' },
            ]}
        >
            <Head title="Comprehensive Training Performance Report" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 print:p-0 print:m-0">
                {/* Header Banner */}
                <div className="rounded-xl bg-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
                    <div className="space-y-1">
                        <Badge className="bg-purple-500/30 text-purple-200 border-none font-semibold">
                            📊 Training Audit & Compliance
                        </Badge>
                        <h1 className="text-2xl font-black">Consolidated Master Training Report</h1>
                        <p className="text-slate-300 text-xs">
                            Complete training intelligence report incorporating Attendance, Department Agendas, 11 Amharic Feedbacks, and Master Schedules.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handlePrintReport} className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold">
                            <Printer className="h-4 w-4" /> Print / Export PDF Report
                        </Button>
                    </div>
                </div>

                {/* Filter Controls (Hidden during print) */}
                <Card className="border-purple-100 bg-purple-50/20 print:hidden">
                    <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                            <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 text-xs bg-white dark:bg-slate-950"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9 text-xs bg-white dark:bg-slate-950"
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <Button onClick={handleApplyFilters} className="h-9 text-xs bg-purple-700 hover:bg-purple-800 flex-1 font-bold">
                                <Filter className="h-3.5 w-3.5 mr-1" /> Generate Report
                            </Button>
                            <Button onClick={handleResetFilters} variant="outline" className="h-9 text-xs">
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Printable Report Header */}
                <div className="hidden print:block border-b pb-4 mb-4">
                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold uppercase tracking-wide">Kaldi's Coffee Training Management System</h2>
                        <h3 className="text-base font-extrabold text-purple-900">Consolidated Master Training Report</h3>
                        <p className="text-xs text-muted-foreground">Generated on {new Date().toLocaleDateString()} | Training Intelligence Summary</p>
                    </div>
                </div>

                {/* SECTION 1: ATTENDANCE METRICS & SUMMARY */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <UserCheck className="h-5 w-5 text-blue-600" /> 1. Attendance Summary (Branch Managers & Trainers)
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Branch Managers On Time</div>
                                <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">{attendanceStats.branch_managers.on_time}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs font-bold text-amber-800 dark:text-amber-300">Branch Managers Late / Absent</div>
                                <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">{attendanceStats.branch_managers.late + attendanceStats.branch_managers.absent}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs font-bold text-purple-800 dark:text-purple-300">Trainers On Time</div>
                                <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">{attendanceStats.trainers.on_time}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs font-bold text-red-800 dark:text-red-300">Trainers Late / Absent</div>
                                <div className="text-2xl font-black text-red-900 dark:text-red-100 mt-1">{attendanceStats.trainers.late + attendanceStats.trainers.absent}</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* SECTION 2: DEPARTMENT TRAINING AGENDAS */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <FileText className="h-5 w-5 text-purple-600" /> 2. Department Training Agendas Summary ({agendas.length})
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-800 text-white">
                                    <TableRow>
                                        <TableHead className="font-bold text-white">Department</TableHead>
                                        <TableHead className="font-bold text-white">Topic Title</TableHead>
                                        <TableHead className="font-bold text-white">Proposed Date</TableHead>
                                        <TableHead className="font-bold text-white">Duration</TableHead>
                                        <TableHead className="font-bold text-white">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agendas.slice(0, 10).map((ag) => (
                                        <TableRow key={ag.id}>
                                            <TableCell className="font-bold">{ag.department?.name ?? '-'}</TableCell>
                                            <TableCell className="font-semibold">{ag.title}</TableCell>
                                            <TableCell className="font-mono text-xs">{ag.proposed_date}</TableCell>
                                            <TableCell className="font-mono">{ag.allocated_minutes} min</TableCell>
                                            <TableCell><Badge variant="outline">{ag.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                    {agendas.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No agendas recorded.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* SECTION 3: 11 AMHARIC FEEDBACK QUESTIONNAIRES */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> 3. 11 Amharic Participant Feedback Questionnaires Summary
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="bg-white dark:bg-slate-900 border">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs text-muted-foreground font-semibold">Q1 Topic Relevance</div>
                                <div className="text-xl font-bold text-amber-600 mt-1">{feedbackSummary.avg_relevance} / 5</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-900 border">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs text-muted-foreground font-semibold">Q3 Response Quality</div>
                                <div className="text-xl font-bold text-amber-600 mt-1">{feedbackSummary.avg_response_quality} / 5</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-900 border">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs text-muted-foreground font-semibold">Q4 Participatory</div>
                                <div className="text-xl font-bold text-amber-600 mt-1">{feedbackSummary.avg_participatory} / 5</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-900 border">
                            <CardContent className="p-3 text-center">
                                <div className="text-xs text-muted-foreground font-semibold">Q6 Gained Knowledge</div>
                                <div className="text-xl font-bold text-emerald-600 mt-1">{feedbackSummary.gained_knowledge_yes} Yes</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* SECTION 4: MASTER SCHEDULES & TIMETABLES */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Calendar className="h-5 w-5 text-blue-600" /> 4. Master Training Schedules & Venues ({schedules.length})
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-800 text-white">
                                    <TableRow>
                                        <TableHead className="font-bold text-white">Schedule Title</TableHead>
                                        <TableHead className="font-bold text-white">Date & Venue</TableHead>
                                        <TableHead className="font-bold text-white">Status</TableHead>
                                        <TableHead className="font-bold text-white">Sessions / Items</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schedules.map((sc) => (
                                        <TableRow key={sc.id}>
                                            <TableCell className="font-bold">{sc.title}</TableCell>
                                            <TableCell className="text-xs">
                                                <div>📅 {sc.schedule_date}</div>
                                                <div className="text-muted-foreground">📍 {sc.venue || 'HQ'}</div>
                                            </TableCell>
                                            <TableCell><Badge className={sc.status === 'published' ? 'bg-emerald-600' : 'bg-slate-500'}>{sc.status}</Badge></TableCell>
                                            <TableCell className="font-mono text-xs">{sc.items?.length || 0} topic sessions</TableCell>
                                        </TableRow>
                                    ))}
                                    {schedules.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No master schedules recorded.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
