import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Coffee,
    FileSpreadsheet,
    Loader2,
    Plus,
    Send,
    Trash2,
} from 'lucide-react';
import React, { useState } from 'react';

type Department = { id: number; name: string };
type SubmittedAgenda = {
    id: number;
    title: string;
    allocated_minutes: number;
    department_id?: number;
    department?: Department | null;
    content_outline?: string[];
};

type ScheduleGridRow = {
    training_agenda_id?: number | string;
    department_id?: number | string;
    department_name: string;
    topic_title: string;
    allocated_minutes: number;
    start_time: string;
    end_time: string;
    is_break: boolean;
};

type PageProps = {
    departments: Department[];
    agendas: SubmittedAgenda[];
};

export default function MasterScheduleBuilder({ departments = [], agendas = [] }: PageProps) {
    const [rows, setRows] = useState<ScheduleGridRow[]>([
        {
            department_name: 'Supply Chain',
            topic_title: '1. SIV በግዥ የተጠየቁ እቃዎችን እንዴት በፍጥነት እንደምናስገባ',
            allocated_minutes: 40,
            start_time: '03:00',
            end_time: '03:40',
            is_break: false,
        },
        {
            department_name: 'Finance',
            topic_title: '1. Cash flow አሞላል & 2. Adjustment አሰራር',
            allocated_minutes: 35,
            start_time: '03:40',
            end_time: '04:15',
            is_break: false,
        },
    ]);

    const { data, setData, post, processing, errors } = useForm({
        title: 'የሰኔ ወር የስራ አስኪያጆች እና የዲፓርትመንት ሀላፊዎች የስልጠና መርሃግብር',
        schedule_date: new Date().toISOString().split('T')[0],
        venue: 'HQ Training Hall & Telegram Conference',
        notes: '',
        items: [] as ScheduleGridRow[],
    });

    const calculateEndTime = (startStr: string, minutes: number): string => {
        try {
            const parts = startStr.split(':');
            let h = parseInt(parts[0]) || 3;
            let m = parseInt(parts[1]) || 0;

            m += minutes;
            h += Math.floor(m / 60);
            m = m % 60;

            const hStr = h < 10 ? `0${h}` : `${h}`;
            const mStr = m < 10 ? `0${m}` : `${m}`;
            return `${hStr}:${mStr}`;
        } catch (e) {
            return startStr;
        }
    };

    const recalculateAllRowTimes = (updatedRows: ScheduleGridRow[]): ScheduleGridRow[] => {
        if (updatedRows.length === 0) return updatedRows;
        
        let currentStart = updatedRows[0].start_time || '03:00';
        return updatedRows.map((r, i) => {
            if (i === 0) {
                const endTime = calculateEndTime(currentStart, r.allocated_minutes || 30);
                return { ...r, start_time: currentStart, end_time: endTime };
            }
            const prevEnd = updatedRows[i - 1]?.end_time || currentStart;
            const newStart = prevEnd;
            const newEnd = calculateEndTime(newStart, r.allocated_minutes || 30);
            return { ...r, start_time: newStart, end_time: newEnd };
        });
    };

    const handleAddSubmittedAgenda = (agendaIdStr: string) => {
        const agId = parseInt(agendaIdStr);
        const selectedAgenda = agendas.find((a) => a.id === agId);
        if (!selectedAgenda) return;

        const deptName = selectedAgenda.department ? selectedAgenda.department.name : 'General';
        const duration = selectedAgenda.allocated_minutes || 35;

        let topicsText = selectedAgenda.title;
        if (selectedAgenda.content_outline && selectedAgenda.content_outline.length > 0) {
            topicsText += ' (' + selectedAgenda.content_outline.join(', ') + ')';
        }

        const newRow: ScheduleGridRow = {
            training_agenda_id: selectedAgenda.id,
            department_id: selectedAgenda.department?.id,
            department_name: deptName,
            topic_title: topicsText,
            allocated_minutes: duration,
            start_time: '03:00',
            end_time: '03:35',
            is_break: false,
        };

        const updated = [...rows, newRow];
        setRows(recalculateAllRowTimes(updated));
    };

    const handleAddTeaBreak = () => {
        const newRow: ScheduleGridRow = {
            department_name: 'የሻይ እረፍት',
            topic_title: 'የሻይ እረፍት (Tea Break)',
            allocated_minutes: 20,
            start_time: '05:00',
            end_time: '05:20',
            is_break: true,
        };

        const updated = [...rows, newRow];
        setRows(recalculateAllRowTimes(updated));
    };

    const handleAddLunchBreak = () => {
        const newRow: ScheduleGridRow = {
            department_name: 'የምሳ እረፍት',
            topic_title: 'የምሳ እረፍት (Lunch Break)',
            allocated_minutes: 60,
            start_time: '06:00',
            end_time: '07:00',
            is_break: true,
        };

        const updated = [...rows, newRow];
        setRows(recalculateAllRowTimes(updated));
    };

    const handleAddCustomRow = () => {
        const newRow: ScheduleGridRow = {
            department_id: departments[0]?.id || '',
            department_name: departments[0]?.name || 'Department',
            topic_title: '',
            allocated_minutes: 30,
            start_time: '03:00',
            end_time: '03:30',
            is_break: false,
        };

        const updated = [...rows, newRow];
        setRows(recalculateAllRowTimes(updated));
    };

    const handleMoveRow = (index: number, direction: 'up' | 'down') => {
        const targetIdx = direction === 'up' ? index - 1 : index + 1;
        if (targetIdx < 0 || targetIdx >= rows.length) return;
        const updated = [...rows];
        const temp = updated[index];
        updated[index] = updated[targetIdx];
        updated[targetIdx] = temp;
        setRows(recalculateAllRowTimes(updated));
    };

    const handleRemoveRow = (index: number) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(recalculateAllRowTimes(updated));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/training/schedules', {
            title: data.title,
            schedule_date: data.schedule_date,
            venue: data.venue,
            notes: data.notes,
            items: rows,
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Schedules', href: '/training/schedules' },
                { title: 'Master Schedule Builder', href: '#' },
            ]}
        >
            <Head title="Set Department Training Schedule" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/training/schedules">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Set Master Training Schedule</h1>
                            <p className="text-xs text-muted-foreground">
                                Select agenda topics directly from submitted Department Training Forms & set timetable slots
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="border-2 border-slate-300 dark:border-slate-800 shadow-md">
                    <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b p-4 text-center rounded-t-xl">
                        <div className="font-extrabold text-xl tracking-wider text-slate-800 dark:text-slate-100">
                            KALDIS COFFEE
                        </div>
                        <div className="text-sm font-bold text-purple-700 dark:text-purple-400 mt-1">
                            የዲፓርትመንት ሀላፊዎች እና የክፍል መሪዎች የስልጠና መርሃግብር
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="p-6 space-y-6">
                            {/* Schedule Header Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="title" className="font-bold text-sm">
                                        Schedule Title (የስልጠና መርሃግብር ርዕስ) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="mt-1 font-semibold"
                                        required
                                    />
                                    <InputError message={errors.title} />
                                </div>

                                <div>
                                    <Label htmlFor="schedule_date" className="font-bold text-sm">
                                        ቀን (Schedule Date) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        id="schedule_date"
                                        type="date"
                                        value={data.schedule_date}
                                        onChange={(e) => setData('schedule_date', e.target.value)}
                                        className="mt-1 font-mono font-bold"
                                        required
                                    />
                                    <InputError message={errors.schedule_date} />
                                </div>
                            </div>

                            {/* Quick Select from Submitted Department Agendas */}
                            {agendas.length > 0 && (
                                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                        <FileSpreadsheet className="h-4 w-4" /> Pick Submitted Department Training Form Topic:
                                    </div>
                                    <div className="min-w-[320px]">
                                        <SearchableSelect
                                            options={agendas.map((ag) => ({
                                                id: ag.id,
                                                name: `[${ag.department?.name ?? 'Dept'}] ${ag.title} (${ag.allocated_minutes}m)`,
                                            }))}
                                            value=""
                                            onValueChange={(val) => {
                                                if (val) {
                                                    handleAddSubmittedAgenda(val);
                                                }
                                            }}
                                            placeholder="Select Agenda Topic..."
                                            searchPlaceholder="Search submitted topics..."
                                            className="w-full text-xs font-semibold border-purple-300"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Master Timetable Table */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="font-bold text-base flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-purple-600" /> የስልጠና መርሃግብር ሰሌዳ (Master Timetable)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddTeaBreak} className="gap-1 text-xs border-amber-500 text-amber-700 dark:text-amber-400 font-bold">
                                            <Coffee className="h-3.5 w-3.5" /> ☕ 20-min Tea Break
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddLunchBreak} className="gap-1 text-xs border-amber-600 text-amber-800 dark:text-amber-300 font-bold">
                                            🍽️ 1-hr Lunch Break
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddCustomRow} className="gap-1.5 text-xs font-bold">
                                            <Plus className="h-3.5 w-3.5" /> Add Custom Session
                                        </Button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border-2 border-slate-400 rounded-lg">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-200 dark:bg-slate-800 border-b-2 border-slate-400 text-slate-900 dark:text-slate-100 font-extrabold uppercase">
                                            <tr>
                                                <th className="p-2.5 border-r border-slate-400 text-center w-12">ተ.ቁ</th>
                                                <th className="p-2.5 border-r border-slate-400 w-44">ክፍል (Department)</th>
                                                <th className="p-2.5 border-r border-slate-400">የስልጠና ርዕስ (አጀንዳ - Form Topic)</th>
                                                <th className="p-2.5 border-r border-slate-400 w-32 text-center">የተፈቀደ ሰዓት</th>
                                                <th className="p-2.5 border-r border-slate-400 w-40 text-center">የጊዜ ሰሌዳ (Time Slot)</th>
                                                <th className="p-2.5 text-center w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                                            {rows.map((r, idx) => {
                                                // Filter agendas for this department
                                                const deptAgendas = agendas.filter(
                                                    (ag) => r.department_id && String(ag.department_id) === String(r.department_id)
                                                );

                                                return (
                                                    <tr
                                                        key={idx}
                                                        className={
                                                            r.is_break
                                                                ? 'bg-amber-50/70 dark:bg-amber-950/30 font-bold'
                                                                : 'odd:bg-white even:bg-slate-50 dark:odd:bg-slate-950 dark:even:bg-slate-900'
                                                        }
                                                    >
                                                        <td className="p-2 border-r text-center font-bold text-sm">{idx + 1}</td>
                                                        <td className="p-2 border-r font-semibold">
                                                            {r.is_break ? (
                                                                <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1 font-bold">
                                                                    <Coffee className="h-3.5 w-3.5" /> {r.department_name}
                                                                </span>
                                                            ) : (
                                                                <select
                                                                    value={r.department_id || ''}
                                                                    onChange={(e) => {
                                                                        const dept = departments.find((d) => String(d.id) === e.target.value);
                                                                        const updated = [...rows];
                                                                        updated[idx].department_id = e.target.value;
                                                                        updated[idx].department_name = dept ? dept.name : 'Department';
                                                                        setRows(updated);
                                                                    }}
                                                                    className="w-full text-xs rounded border border-input p-1 bg-white dark:bg-slate-900 font-semibold"
                                                                >
                                                                    <option value="">Select Dept...</option>
                                                                    {departments.map((d) => (
                                                                        <option key={d.id} value={d.id}>
                                                                            {d.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td className="p-2 border-r font-medium space-y-1">
                                                            {!r.is_break && deptAgendas.length > 0 && (
                                                                <select
                                                                    onChange={(e) => {
                                                                        const selectedAg = deptAgendas.find((a) => String(a.id) === e.target.value);
                                                                        if (selectedAg) {
                                                                            let topicStr = selectedAg.title;
                                                                            if (selectedAg.content_outline && selectedAg.content_outline.length > 0) {
                                                                                topicStr += ' (' + selectedAg.content_outline.join(', ') + ')';
                                                                            }
                                                                            const updated = [...rows];
                                                                            updated[idx].training_agenda_id = selectedAg.id;
                                                                            updated[idx].topic_title = topicStr;
                                                                            updated[idx].allocated_minutes = selectedAg.allocated_minutes || 35;
                                                                            updated[idx].end_time = calculateEndTime(updated[idx].start_time, updated[idx].allocated_minutes);
                                                                            setRows(updated);
                                                                        }
                                                                    }}
                                                                    className="w-full text-[11px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950 p-1 rounded border border-purple-200"
                                                                >
                                                                    <option value="">-- Load Topic from Submitted Dept Agenda Form --</option>
                                                                    {deptAgendas.map((ag) => (
                                                                        <option key={ag.id} value={ag.id}>
                                                                            Form Topic: {ag.title} ({ag.allocated_minutes}m)
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                            <Input
                                                                placeholder="Training Agenda item / topic title..."
                                                                value={r.topic_title}
                                                                onChange={(e) => {
                                                                    const updated = [...rows];
                                                                    updated[idx].topic_title = e.target.value;
                                                                    setRows(updated);
                                                                }}
                                                                className="h-8 text-xs font-semibold"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-r text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    min={5}
                                                                    max={180}
                                                                    value={r.allocated_minutes}
                                                                    onChange={(e) => {
                                                                        const dur = parseInt(e.target.value) || 20;
                                                                        const updated = [...rows];
                                                                        updated[idx].allocated_minutes = dur;
                                                                        updated[idx].end_time = calculateEndTime(updated[idx].start_time, dur);
                                                                        setRows(updated);
                                                                    }}
                                                                    className="h-8 text-xs font-mono font-bold w-16 text-center"
                                                                />
                                                                <span className="text-[10px] text-muted-foreground">ደቂቃ</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-2 border-r text-center">
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <Input
                                                                    value={r.start_time}
                                                                    onChange={(e) => {
                                                                        const updated = [...rows];
                                                                        updated[idx].start_time = e.target.value;
                                                                        updated[idx].end_time = calculateEndTime(e.target.value, updated[idx].allocated_minutes);
                                                                        setRows(updated);
                                                                    }}
                                                                    className="h-8 text-xs font-mono w-16 text-center"
                                                                />
                                                                <span>-</span>
                                                                <Input
                                                                    value={r.end_time}
                                                                    onChange={(e) => {
                                                                        const updated = [...rows];
                                                                        updated[idx].end_time = e.target.value;
                                                                        setRows(updated);
                                                                    }}
                                                                    className="h-8 text-xs font-mono w-16 text-center"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-rose-500"
                                                                onClick={() => handleRemoveRow(idx)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {rows.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-6 text-muted-foreground">
                                                        No schedule items added. Click "Pick Submitted Department Training Form Topic" or "Add Custom Row".
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex items-center justify-end gap-3 border-t">
                                <Link href="/training/schedules">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="gap-2 bg-purple-700 hover:bg-purple-800">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span>Save Master Schedule & Notify Department Heads via Telegram</span>
                                </Button>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
