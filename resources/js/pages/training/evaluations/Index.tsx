import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Award, Calendar, Filter, RotateCcw, Search, Star } from 'lucide-react';
import React, { useState } from 'react';

type Department = { id: number; name: string };
type Evaluation = {
    id: number;
    content_clarity_rating: number;
    preparation_rating: number;
    time_management_rating: number;
    applicability_rating: number;
    overall_rating: number;
    strengths?: string | null;
    areas_for_improvement?: string | null;
    feedback_notes?: string | null;
    attendance_confirmed: boolean;
    created_at: string;
    evaluatorUser?: { id: number; name: string } | null;
    evaluatorBranch?: { id: number; name: string } | null;
    trainerDepartment?: { id: number; name: string } | null;
    scheduleItem?: {
        id: number;
        topic_title: string;
        schedule?: { title: string; schedule_date: string } | null;
    } | null;
};

type PageProps = {
    evaluations: Evaluation[];
    departments?: Department[];
    filters?: {
        search: string;
        trainer_department_id: string;
        rating: string;
        start_date: string;
        end_date: string;
    };
};

export default function EvaluationsIndex({ evaluations = [], departments = [], filters = { search: '', trainer_department_id: 'all', rating: 'all', start_date: '', end_date: '' } }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [deptFilter, setDeptFilter] = useState(filters.trainer_department_id || 'all');
    const [ratingFilter, setRatingFilter] = useState(filters.rating || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const handleApplyFilters = () => {
        router.get('/training/evaluations', {
            search,
            trainer_department_id: deptFilter,
            rating: ratingFilter,
            start_date: startDate,
            end_date: endDate,
        }, { preserveState: true, replace: true });
    };

    const handleResetFilters = () => {
        setSearch('');
        setDeptFilter('all');
        setRatingFilter('all');
        setStartDate('');
        setEndDate('');
        router.get('/training/evaluations', {}, { preserveState: true, replace: true });
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1 justify-center">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-mono font-bold text-sm">{rating.toFixed(1)}</span>
            </div>
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Trainer Evaluations', href: '/training/evaluations' },
            ]}
        >
            <Head title="Branch Manager Trainer Evaluations" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Branch Manager Trainer Evaluations</h1>
                        <p className="text-sm text-muted-foreground">
                            Feedback and performance ratings submitted by Branch Managers for Trainer Departments
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/training/evaluations/create">
                            <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                                <Star className="h-4 w-4 fill-white" /> Evaluate Trainer Dept
                            </Button>
                        </Link>
                        <Link href="/training/schedules">
                            <Button variant="outline" className="gap-2">
                                <Calendar className="h-4 w-4" /> View Master Timetables
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters Card */}
                <Card className="border-amber-100 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-amber-100 dark:border-amber-900">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                            <Filter className="h-4 w-4 text-amber-600" /> Filter Trainer Evaluations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Search Branch / Feedback</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search evaluation..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                    className="pl-8 text-xs h-9 bg-white dark:bg-slate-950"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Trainer Department</label>
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
                            <label className="text-xs font-semibold text-muted-foreground">Rating Score</label>
                            <Select value={ratingFilter} onValueChange={setRatingFilter}>
                                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="All Scores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Scores</SelectItem>
                                    <SelectItem value="5">5.0 Excellent</SelectItem>
                                    <SelectItem value="4">4.0 - 4.8 Very Good</SelectItem>
                                    <SelectItem value="3">3.0 - 3.9 Satisfactory</SelectItem>
                                    <SelectItem value="2">Below 3.0 Needs Improvement</SelectItem>
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
                            <Button onClick={handleApplyFilters} className="h-9 text-xs bg-amber-600 hover:bg-amber-700 flex-1 font-bold">
                                Filter
                            </Button>
                            <Button onClick={handleResetFilters} variant="outline" className="h-9 text-xs gap-1">
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-500" /> Submitted Trainer Department Ratings ({evaluations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-800 text-white">
                                <TableRow>
                                    <TableHead className="font-bold text-white">Trainer Dept</TableHead>
                                    <TableHead className="font-bold text-white">Training Session & Topic</TableHead>
                                    <TableHead className="font-bold text-white">Branch Evaluator</TableHead>
                                    <TableHead className="font-bold text-white text-center">Clarity</TableHead>
                                    <TableHead className="font-bold text-white text-center">Preparation</TableHead>
                                    <TableHead className="font-bold text-white text-center">Time Mgmt</TableHead>
                                    <TableHead className="font-bold text-white text-center">Overall Score</TableHead>
                                    <TableHead className="font-bold text-white">Strengths & Feedback</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluations.map((ev) => (
                                    <TableRow key={ev.id} className="odd:bg-muted/40">
                                        <TableCell className="font-bold text-purple-700 dark:text-purple-400">
                                            {ev.trainerDepartment?.name ?? 'Department'}
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            <div>{ev.scheduleItem?.topic_title || 'Session'}</div>
                                            {ev.scheduleItem?.schedule && (
                                                <div className="text-xs text-muted-foreground">
                                                    📅 {ev.scheduleItem.schedule.schedule_date}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{ev.evaluatorBranch?.name ?? 'Branch'}</div>
                                            <div className="text-xs text-muted-foreground">{ev.evaluatorUser?.name}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">{ev.content_clarity_rating}/5</TableCell>
                                        <TableCell className="text-center font-mono">{ev.preparation_rating}/5</TableCell>
                                        <TableCell className="text-center font-mono">{ev.time_management_rating}/5</TableCell>
                                        <TableCell className="text-center">{renderStars(ev.overall_rating)}</TableCell>
                                        <TableCell className="max-w-xs text-xs">
                                            {ev.strengths && (
                                                <div className="text-slate-800 dark:text-slate-200">
                                                    <span className="font-bold text-emerald-600">👍 Strength:</span> {ev.strengths}
                                                </div>
                                            )}
                                            {ev.areas_for_improvement && (
                                                <div className="text-slate-700 dark:text-slate-300 mt-1">
                                                    <span className="font-bold text-amber-600">💡 Suggestion:</span> {ev.areas_for_improvement}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {evaluations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No evaluations match the selected filter criteria.
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
