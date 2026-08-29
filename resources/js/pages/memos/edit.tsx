import AppLayout from '@/layouts/app-layout';
import { SignaturePad } from '@/components/signature-pad';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FileText, Save, ArrowLeft, Bold, Italic, List, ListOrdered, Heading } from 'lucide-react';
import React, { useRef, useMemo } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Internal Memorandum', href: '/memos' },
    { title: 'Edit Memorandum', href: '#' },
];

interface SelectableEntity {
    id: number;
    name: string;
}

interface MemoItem {
    id: number;
    memo_id: string;
    title: string;
    memo_date: string;
    sender_name: string;
    sender_position?: string;
    recipient_name: string;
    content: string;
    priority: string;
    departments?: string[];
    signature_type: 'typed' | 'drawn';
    signature_data?: string;
}

interface Props {
    memo: MemoItem;
    departments: SelectableEntity[];
    branches: SelectableEntity[];
}

export default function MemoEdit({ memo, departments, branches }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        title: memo.title || '',
        memo_date: memo.memo_date || '',
        sender_name: memo.sender_name || '',
        sender_position: '',
        target_department: (memo.departments && memo.departments[0]) || memo.recipient_name || '',
        recipient_name: memo.recipient_name || '',
        content: memo.content || '',
        priority: 'normal',
        departments: memo.departments || [],
        signature_type: memo.signature_type || 'typed',
        signature_data: memo.signature_data || '',
    });

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const targetOptions = useMemo(() => {
        const deptOpts = (departments || []).map((d) => ({
            id: `dept_${d.id}`,
            name: `🏢 Dept: ${d.name}`,
            rawName: d.name,
        }));
        const branchOpts = (branches || []).map((b) => ({
            id: `branch_${b.id}`,
            name: `📍 Branch: ${b.name}`,
            rawName: b.name,
        }));
        return [...deptOpts, ...branchOpts];
    }, [departments, branches]);

    const handleTargetChange = (optionId: string) => {
        const match = targetOptions.find((opt) => String(opt.id) === optionId || opt.rawName === optionId);
        const targetName = match ? match.rawName : optionId;

        setData((prev) => ({
            ...prev,
            target_department: optionId,
            recipient_name: targetName,
            departments: [targetName],
        }));
    };

    const insertFormatting = (prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = data.content.substring(start, end);
        const replacement = prefix + (selectedText || 'Text') + suffix;

        const newContent =
            data.content.substring(0, start) + replacement + data.content.substring(end);

        setData('content', newContent);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + prefix.length,
                start + prefix.length + (selectedText ? selectedText.length : 4)
            );
        }, 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/memos/${memo.id}`, {
            onSuccess: () => toast.success('Internal Memorandum updated successfully!'),
            onError: () => toast.error('Failed to update memorandum.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Memo - ${memo.memo_id}`} />

            <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            <FileText className="h-6 w-6 text-amber-700 dark:text-amber-500" />
                            Edit Memorandum ({memo.memo_id})
                        </h1>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.history.back()}
                        className="gap-1.5 h-9 text-xs"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                    </Button>
                </div>

                <Card className="border border-slate-200 shadow-lg dark:border-slate-800 bg-white dark:bg-slate-950">
                    <CardContent className="p-5 space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Ref ID
                                    </Label>
                                    <Input
                                        value={memo.memo_id}
                                        disabled
                                        className="h-9 font-mono text-xs font-bold bg-slate-100 dark:bg-slate-900"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={data.memo_date}
                                        onChange={(e) => setData('memo_date', e.target.value)}
                                        className="h-9 text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        From (Sender & Branch)
                                    </Label>
                                    <Input
                                        value={data.sender_name}
                                        onChange={(e) => setData('sender_name', e.target.value)}
                                        className="h-9 text-xs font-medium"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        To (Target Department / Branch)
                                    </Label>
                                    <SearchableSelect
                                        options={targetOptions}
                                        value={data.target_department}
                                        onValueChange={handleTargetChange}
                                        placeholder="Select Department or Branch..."
                                        searchPlaceholder="Search Dept / Branch..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Subject / Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="h-9 font-semibold text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Memorandum Content Body
                                    </Label>
                                    <div className="flex items-center gap-1 rounded bg-slate-100 p-0.5 dark:bg-slate-900">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 font-bold text-xs"
                                            onClick={() => insertFormatting('**', '**')}
                                        >
                                            <Bold className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 italic text-xs"
                                            onClick={() => insertFormatting('*', '*')}
                                        >
                                            <Italic className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 text-xs"
                                            onClick={() => insertFormatting('### ')}
                                        >
                                            <Heading className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 text-xs"
                                            onClick={() => insertFormatting('\n- ')}
                                        >
                                            <List className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 text-xs"
                                            onClick={() => insertFormatting('\n1. ')}
                                        >
                                            <ListOrdered className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <Textarea
                                    ref={textareaRef}
                                    rows={6}
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    className="font-sans text-sm p-3 leading-relaxed"
                                    required
                                />
                            </div>

                            <SignaturePad
                                valueType={data.signature_type}
                                valueData={data.signature_data}
                                onChange={(type, sigData) => {
                                    setData((prev) => ({
                                        ...prev,
                                        signature_type: type,
                                        signature_data: sigData,
                                    }));
                                }}
                                defaultName={data.sender_name}
                            />

                            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    size="sm"
                                    className="gap-1.5 h-9 text-xs bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
