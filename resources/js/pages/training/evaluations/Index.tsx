import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Award, Building, Calendar, Star, ThumbsUp, UserCheck } from 'lucide-react';
import React from 'react';

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
};

export default function EvaluationsIndex({ evaluations = [] }: PageProps) {
    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
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

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-500" /> Submitted Trainer Department Ratings & Feedback
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-700 dark:bg-slate-800">
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
                                            No trainer department evaluations submitted yet.
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
