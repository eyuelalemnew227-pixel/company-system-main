import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Clock, FileText, Printer, Send } from 'lucide-react';
import React from 'react';

type RequiredMaterial = {
    item: string;
    specification: string;
    quantity: string;
    ratio: string;
};

type TrainingAgenda = {
    id: number;
    title: string;
    proposed_date: string;
    allocated_minutes: number;
    description?: string;
    objectives?: string[];
    content_outline?: string[];
    target_trainees?: string[];
    delivery_method: string;
    required_resources?: RequiredMaterial[];
    status: string;
    department?: { id: number; name: string } | null;
    submitted_by?: { id: number; name: string } | null;
    created_at: string;
};

type PageProps = {
    agenda: TrainingAgenda;
};

export default function StructuredAgendaShow({ agenda }: PageProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Training Agendas', href: '/training/agendas' },
                { title: 'Agenda Document', href: '#' },
            ]}
        >
            <Head title={`Structured Agenda - ${agenda.title}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between print:hidden">
                    <Link href="/training/agendas">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Back to Agendas
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                            <Printer className="h-4 w-4" /> Print / Export PDF
                        </Button>
                    </div>
                </div>

                {/* Printable Document (Image 1 Layout Format) */}
                <Card className="border-2 border-slate-400 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-950">
                    <CardHeader className="border-b-2 border-slate-400 dark:border-slate-800 p-6 text-center bg-slate-50 dark:bg-slate-900">
                        <div className="font-black text-2xl tracking-widest text-slate-900 dark:text-slate-100">
                            KALDIS COFFEE
                        </div>
                        <div className="mt-2 inline-block border-2 border-slate-700 dark:border-slate-300 px-6 py-1 font-bold text-base text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            STRUCTURED TRAINING FORMAT
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-4 text-sm divide-y divide-slate-300 dark:divide-slate-800">
                        {/* 1. Title & Dept */}
                        <div className="pt-2">
                            <div className="font-bold text-slate-600 dark:text-slate-400">የስልጠናው ርዕስ (Training Topic / Title):</div>
                            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                                {agenda.title}
                            </div>
                        </div>

                        <div className="pt-3 grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-bold text-slate-600 dark:text-slate-400">ዲፓርትመንት (Department):</span>
                                <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">{agenda.department?.name ?? 'N/A'}</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-600 dark:text-slate-400">ቀን (Proposed Date):</span>
                                <span className="ml-2 font-mono font-semibold">{agenda.proposed_date}</span>
                            </div>
                        </div>

                        <div className="pt-3 grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-bold text-slate-600 dark:text-slate-400">የሚወስደው ሰዓት (Duration):</span>
                                <span className="ml-2 font-mono font-bold text-purple-700 dark:text-purple-400">{agenda.allocated_minutes} ደቂቃ (Minutes)</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-600 dark:text-slate-400">ስልጠናው የሚሰጥበት መንገድ:</span>
                                <span className="ml-2 font-semibold">{agenda.delivery_method}</span>
                            </div>
                        </div>

                        {/* Short Overview */}
                        {agenda.description && (
                            <div className="pt-3">
                                <div className="font-bold text-slate-600 dark:text-slate-400 mb-1">የስልጠናው አጭር መግለጫ (Overview):</div>
                                <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">{agenda.description}</p>
                            </div>
                        )}

                        {/* Objectives */}
                        {agenda.objectives && agenda.objectives.length > 0 && (
                            <div className="pt-3">
                                <div className="font-bold text-slate-600 dark:text-slate-400 mb-2">የስልጠናው ዓላማ (Training Objectives):</div>
                                <p className="text-xs text-muted-foreground mb-2">
                                    ከዚህ ስልጠና በኋላ ሰልጣኞች (ሰራተኞች) የሚከተሉትን ሃሳቦች ማወቅ ይጠበቅባቸዋል፡
                                </p>
                                <ol className="list-decimal list-inside space-y-1 font-medium pl-2">
                                    {agenda.objectives.map((obj, idx) => (
                                        <li key={idx} className="text-slate-800 dark:text-slate-200">{obj}</li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Content Outline */}
                        {agenda.content_outline && agenda.content_outline.length > 0 && (
                            <div className="pt-3">
                                <div className="font-bold text-slate-600 dark:text-slate-400 mb-2">የስልጠናው ይዘት (Training Content):</div>
                                <ul className="list-disc list-inside space-y-1 font-medium pl-2">
                                    {agenda.content_outline.map((item, idx) => (
                                        <li key={idx} className="text-slate-800 dark:text-slate-200">{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Target Trainees */}
                        {agenda.target_trainees && agenda.target_trainees.length > 0 && (
                            <div className="pt-3">
                                <div className="font-bold text-slate-600 dark:text-slate-400 mb-2">የስልጠናው ተሳታፊዎች (Target Trainees):</div>
                                <div className="flex flex-wrap gap-2">
                                    {agenda.target_trainees.map((role, idx) => (
                                        <Badge key={idx} variant="outline" className="font-semibold text-slate-800 dark:text-slate-200">
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Required Resources Table (Image 1 Table) */}
                        {agenda.required_resources && agenda.required_resources.length > 0 && (
                            <div className="pt-3">
                                <div className="font-bold text-slate-600 dark:text-slate-400 mb-2">ለስልጠናው የሚያስፈልጉ ግብአቶች (Required Materials):</div>
                                <table className="w-full text-xs text-left border border-slate-300 dark:border-slate-800">
                                    <thead className="bg-slate-100 dark:bg-slate-900 border-b">
                                        <tr>
                                            <th className="p-2 border-r text-center w-10">ተ.ቁ</th>
                                            <th className="p-2 border-r">ግብአት (Item)</th>
                                            <th className="p-2 border-r">አይነት (Specification)</th>
                                            <th className="p-2 border-r text-center">ብዛት (Quantity)</th>
                                            <th className="p-2 text-center">መጠን (Ratio: Item/Trainee)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agenda.required_resources.map((m, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="p-2 border-r text-center font-bold">{idx + 1}</td>
                                                <td className="p-2 border-r font-medium">{m.item}</td>
                                                <td className="p-2 border-r text-muted-foreground">{m.specification || '-'}</td>
                                                <td className="p-2 border-r text-center font-mono">{m.quantity || '-'}</td>
                                                <td className="p-2 text-center">{m.ratio || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="pt-4 flex justify-between text-xs text-muted-foreground italic">
                            <div>Submitted By: {agenda.submitted_by?.name ?? 'Department Manager'}</div>
                            <div>Status: {agenda.status.toUpperCase()}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
