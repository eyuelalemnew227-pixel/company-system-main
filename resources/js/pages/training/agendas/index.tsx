import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Calendar, Eye, FileText, Plus, Send } from 'lucide-react';
import React from 'react';

type TrainingAgenda = {
    id: number;
    title: string;
    proposed_date: string;
    allocated_minutes: number;
    delivery_method: string;
    status: string;
    department?: { id: number; name: string } | null;
    submitted_by?: { id: number; name: string } | null;
};

type PageProps = {
    agendas: TrainingAgenda[];
    userDepartment?: { id: number; name: string } | null;
};

export default function AgendasIndex({ agendas = [], userDepartment }: PageProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'submitted':
                return <Badge className="bg-blue-600">Agenda Submitted</Badge>;
            case 'scheduled':
                return <Badge className="bg-amber-600">Schedule Proposed</Badge>;
            case 'approved':
                return <Badge className="bg-emerald-600">Approved & Finalized</Badge>;
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
                            Submit and manage departmental training proposals
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/training/agendas/create">
                            <Button className="gap-2 bg-purple-700 hover:bg-purple-800">
                                <Plus className="h-4 w-4" /> Submit Structured Agenda
                            </Button>
                        </Link>
                        <Link href="/training/schedules">
                            <Button variant="outline" className="gap-2">
                                <Calendar className="h-4 w-4" /> Master Schedule Builder
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-600" /> Submitted Department Training Proposals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-700 dark:bg-slate-800">
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
                                        <TableCell className="font-bold">{agenda.department?.name ?? '-'}</TableCell>
                                        <TableCell className="font-semibold">{agenda.title}</TableCell>
                                        <TableCell className="font-mono text-xs">{agenda.proposed_date}</TableCell>
                                        <TableCell className="font-mono font-medium">{agenda.allocated_minutes} min</TableCell>
                                        <TableCell className="text-xs">{agenda.delivery_method}</TableCell>
                                        <TableCell>{getStatusBadge(agenda.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/training/agendas/${agenda.id}`}>
                                                <Button variant="ghost" size="sm" className="gap-1">
                                                    <Eye className="h-4 w-4" /> View Format
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {agendas.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No training agendas submitted yet. Click "Submit Structured Agenda" to create one.
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
