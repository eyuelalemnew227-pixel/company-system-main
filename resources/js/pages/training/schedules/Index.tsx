import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Coffee,
    FileSpreadsheet,
    Plus,
    Send,
    Star,
    Users,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

type ScheduleItem = {
    id: number;
    topic_title: string;
    allocated_minutes: number;
    start_time: string;
    end_time: string;
    is_break: boolean;
    department_approved: boolean;
    department?: { id: number; name: string } | null;
    evaluations?: any[];
};

type TrainingSchedule = {
    id: number;
    title: string;
    schedule_date: string;
    venue?: string | null;
    status: string;
    created_by?: { id: number; name: string } | null;
    items: ScheduleItem[];
};

type SubmittedAgenda = {
    id: number;
    title: string;
    allocated_minutes: number;
    department?: { id: number; name: string } | null;
};

type PageProps = {
    schedules: TrainingSchedule[];
    submittedAgendas: SubmittedAgenda[];
};

export default function SchedulesIndex({ schedules = [], submittedAgendas = [] }: PageProps) {
    const handlePublish = (scheduleId: number, title: string) => {
        if (!confirm(`Publish and announce "${title}" to all Departments and Branch Managers via Telegram?`)) return;

        router.post(
            `/training/schedules/${scheduleId}/publish`,
            {},
            {
                onSuccess: () => toast.success('Master Schedule published and Telegram notifications sent!'),
                onError: () => toast.error('Failed to publish schedule'),
            }
        );
    };

    const handleApproveItem = (itemId: number) => {
        router.post(
            `/training/schedules/items/${itemId}/approve`,
            {},
            {
                onSuccess: () => toast.success('Department schedule slot approved!'),
            }
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Master Schedules', href: '/training/schedules' },
            ]}
        >
            <Head title="Training Schedules & Timetables" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Master Training Schedules</h1>
                        <p className="text-sm text-muted-foreground">
                            Training Department timetable builder, department approvals & Telegram announcements
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/training/agendas">
                            <Button variant="outline" className="gap-2">
                                <FileSpreadsheet className="h-4 w-4" /> View Department Agendas ({submittedAgendas.length})
                            </Button>
                        </Link>
                        <Link href="/training/schedules/create">
                            <Button className="gap-2 bg-purple-700 hover:bg-purple-800">
                                <Plus className="h-4 w-4" /> Build Master Schedule
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="space-y-6">
                    {schedules.map((sched) => (
                        <Card key={sched.id} className="border-2 border-slate-300 dark:border-slate-800 shadow-sm">
                            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={
                                                sched.status === 'published'
                                                    ? 'bg-emerald-600'
                                                    : 'bg-amber-600'
                                            }
                                        >
                                            {sched.status.toUpperCase()}
                                        </Badge>
                                        <span className="text-xs font-mono font-bold text-muted-foreground">
                                            {sched.schedule_date}
                                        </span>
                                    </div>
                                    <CardTitle className="text-xl font-extrabold mt-1 text-slate-900 dark:text-slate-100">
                                        {sched.title}
                                    </CardTitle>
                                    {sched.venue && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            📍 Venue: {sched.venue}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {sched.status !== 'published' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handlePublish(sched.id, sched.title)}
                                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            <Send className="h-4 w-4" /> Announce All via Telegram
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-200 dark:bg-slate-800">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 w-12 text-center">#</TableHead>
                                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 w-44">ክፍል (Department)</TableHead>
                                            <TableHead className="font-bold text-slate-900 dark:text-slate-100">የስልጠና ርዕስ (አጀንዳ)</TableHead>
                                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center w-28">የተፈቀደ ሰዓት</TableHead>
                                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center w-36">የጊዜ ሰሌዳ</TableHead>
                                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center">Approval</TableHead>
                                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right">Branch Feedback</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sched.items.map((item, idx) => (
                                            <TableRow
                                                key={item.id}
                                                className={
                                                    item.is_break
                                                        ? 'bg-amber-50/80 dark:bg-amber-950/30'
                                                        : 'odd:bg-white even:bg-slate-50 dark:odd:bg-slate-950 dark:even:bg-slate-900'
                                                }
                                            >
                                                <TableCell className="text-center font-bold">{idx + 1}</TableCell>
                                                <TableCell className="font-bold">
                                                    {item.is_break ? (
                                                        <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                            <Coffee className="h-4 w-4" /> {item.topic_title}
                                                        </span>
                                                    ) : (
                                                        item.department?.name ?? 'General'
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-semibold">{item.topic_title}</TableCell>
                                                <TableCell className="text-center font-mono font-medium">{item.allocated_minutes} min</TableCell>
                                                <TableCell className="text-center font-mono font-bold text-purple-700 dark:text-purple-400">
                                                    {item.start_time} - {item.end_time}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {!item.is_break && (
                                                        item.department_approved ? (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                                                                ✓ Dept Approved
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs"
                                                                onClick={() => handleApproveItem(item.id)}
                                                            >
                                                                Approve Slot
                                                            </Button>
                                                        )
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {!item.is_break && (
                                                        <Link href={`/training/evaluations/create/${item.id}`}>
                                                            <Button size="sm" variant="secondary" className="gap-1 text-xs">
                                                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Evaluate Trainer ({item.evaluations?.length || 0})
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}

                    {schedules.length === 0 && (
                        <Card className="p-8 text-center text-muted-foreground">
                            No master training schedules built yet. Click "Build Master Schedule" to create one.
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
