import AppLayout from '@/layouts/app-layout';
import { SignaturePad } from '@/components/signature-pad';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    FileText,
    Send,
    ArrowLeft,
    Eye,
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading,
    CheckCircle2,
    Edit3,
} from 'lucide-react';
import React, { useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Internal Memorandum', href: '/memos' },
    { title: 'New Memorandum', href: '/memos/create' },
];

interface SelectableEntity {
    id: number;
    name: string;
}

interface TemplateItem {
    id: number;
    template_id: string;
    template_name: string;
    title?: string;
    content?: string;
}

interface Props {
    departments: SelectableEntity[];
    branches: SelectableEntity[];
    userBranch?: string;
    templates: TemplateItem[];
    suggestedMemoId: string;
    userDefaultSignature: {
        signature_type: 'typed' | 'drawn';
        signature_data: string;
        sender_name: string;
        sender_position: string;
    };
}

interface MemoCreateForm {
    memo_id: string;
    title: string;
    memo_date: string;
    sender_name: string;
    sender_position: string;
    target_department: string;
    recipient_name: string;
    content: string;
    priority: string;
    departments: string[];
    signature_type: 'typed' | 'drawn';
    signature_data: string;
    send_telegram: boolean;
}

export default function MemoCreate({
    departments,
    branches,
    templates,
    suggestedMemoId,
    userDefaultSignature,
}: Props) {
    const hasSavedSignature = Boolean(userDefaultSignature && userDefaultSignature.signature_data);

    const { data, setData, post, processing, errors } = useForm({
        memo_id: suggestedMemoId,
        title: '',
        memo_date: new Date().toISOString().split('T')[0],
        sender_name: userDefaultSignature.sender_name || '',
        sender_position: '',
        target_department: '',
        recipient_name: '',
        content: '',
        priority: 'normal',
        departments: [] as string[],
        signature_type: userDefaultSignature.signature_type || 'typed',
        signature_data: userDefaultSignature.signature_data || '',
        send_telegram: true as boolean,
    });

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [previewOpen, setPreviewOpen] = useState<boolean>(false);
    const [changeSignature, setChangeSignature] = useState<boolean>(!hasSavedSignature);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Target Options
    const branchOptions = useMemo(() => {
        return (branches || []).map((b) => ({
            id: `branch_${b.id}`,
            name: b.name,
            rawName: b.name,
        }));
    }, [branches]);

    const departmentOptions = useMemo(() => {
        return (departments || []).map((d) => ({
            id: `dept_${d.id}`,
            name: d.name,
            rawName: d.name,
        }));
    }, [departments]);

    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [isHeadOffice, setIsHeadOffice] = useState<boolean>(false);

    const handleApplyTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tpl = templates.find((t) => t.template_id === templateId || String(t.id) === templateId);
        if (tpl) {
            if (tpl.title) setData('title', tpl.title);
            if (tpl.content) setData('content', tpl.content);
            toast.success(`Template "${tpl.template_name}" loaded.`);
        }
    };

    const handleBranchChange = (branchOptionId: string) => {
        const match = branchOptions.find((opt) => String(opt.id) === branchOptionId || opt.rawName === branchOptionId);
        const branchName = match ? match.rawName : branchOptionId;
        const normalized = branchName.toLowerCase().replace(/[\s\-_]/g, '');
        const isHO = normalized.includes('headoffice') || branchName.toLowerCase().includes('head office');

        setSelectedBranchId(branchOptionId);
        setIsHeadOffice(isHO);
        setSelectedDepartmentId('');

        if (isHO) {
            setData((prev) => ({
                ...prev,
                target_department: branchOptionId,
                recipient_name: '',
                departments: [],
            }));
            toast.info('Head Office selected. Please select target department.');
        } else {
            setData((prev) => ({
                ...prev,
                target_department: branchOptionId,
                recipient_name: branchName,
                departments: [branchName],
            }));
        }
    };

    const handleDepartmentChange = (deptOptionId: string) => {
        const match = departmentOptions.find((opt) => String(opt.id) === deptOptionId || opt.rawName === deptOptionId);
        const deptName = match ? match.rawName : deptOptionId;

        setSelectedDepartmentId(deptOptionId);
        setData((prev) => ({
            ...prev,
            recipient_name: deptName,
            departments: [deptName],
        }));
    };

    const insertFormatting = (prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = data.content.substring(start, end);
        const replacement = prefix + selectedText + suffix;

        const newContent =
            data.content.substring(0, start) + replacement + data.content.substring(end);

        setData('content', newContent);

        setTimeout(() => {
            textarea.focus();
            if (selectedText.length > 0) {
                textarea.setSelectionRange(
                    start + prefix.length,
                    start + prefix.length + selectedText.length
                );
            } else {
                const cursorPosition = start + prefix.length;
                textarea.setSelectionRange(cursorPosition, cursorPosition);
            }
        }, 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isHeadOffice && !data.recipient_name) {
            toast.error('Please select a target Department for Head Office.');
            return;
        }
        post('/memos', {
            onSuccess: () => toast.success('Internal Memorandum published successfully! Signature saved.'),
            onError: () => toast.error('Please fix the errors in the form.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Internal Memorandum" />

            <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            <FileText className="h-6 w-6 text-amber-700 dark:text-amber-500" />
                            Internal Memorandum
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {templates.length > 0 && (
                            <div className="w-56">
                                <Select value={selectedTemplateId} onValueChange={handleApplyTemplate}>
                                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Load Template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((tpl) => (
                                            <SelectItem key={tpl.id} value={tpl.template_id} className="text-xs">
                                                {tpl.template_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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
                </div>

                {/* COMPACT UNIFIED SINGLE CARD LAYOUT */}
                <Card className="border border-slate-200 shadow-lg dark:border-slate-800 bg-white dark:bg-slate-950">
                    <CardContent className="p-5 space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Row 1: Ref ID, Date, From (Sender & Position), Target Branch */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Ref ID
                                    </Label>
                                    <Input
                                        value={data.memo_id}
                                        onChange={(e) => setData('memo_id', e.target.value)}
                                        className="h-9 font-mono text-xs font-bold bg-slate-100 dark:bg-slate-900"
                                        required
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
                                        From (Sender Name)
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
                                        To (Target Branch) <span className="text-red-500">*</span>
                                    </Label>
                                    <SearchableSelect
                                        options={branchOptions}
                                        value={selectedBranchId}
                                        onValueChange={handleBranchChange}
                                        placeholder="Select Branch..."
                                        searchPlaceholder="Search Branch..."
                                    />
                                </div>
                            </div>

                            {/* Head Office Department Selector & Sender Position Row */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Sender Position
                                    </Label>
                                    <Input
                                        placeholder="e.g. IT Manager, Operations Supervisor"
                                        value={data.sender_position}
                                        onChange={(e) => setData('sender_position', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {isHeadOffice && (
                                    <div className="space-y-1 bg-amber-50 p-2.5 rounded-lg border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                                        <Label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                            Head Office Department <span className="text-red-500">*</span>
                                        </Label>
                                        <SearchableSelect
                                            options={departmentOptions}
                                            value={selectedDepartmentId}
                                            onValueChange={handleDepartmentChange}
                                            placeholder="Select Head Office Department..."
                                            searchPlaceholder="Search Department..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Row 2: Subject Title */}
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Subject / Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="Enter memorandum subject..."
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="h-9 font-semibold text-sm"
                                    required
                                />
                                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                            </div>

                            {/* Row 3: Body Content + Toolbar */}
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
                                            onClick={() => insertFormatting('<b>', '</b>')}
                                            title="Bold"
                                        >
                                            <Bold className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 italic text-xs"
                                            onClick={() => insertFormatting('<i>', '</i>')}
                                            title="Italic"
                                        >
                                            <Italic className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 text-xs"
                                            onClick={() => insertFormatting('<h3>', '</h3>')}
                                            title="Heading"
                                        >
                                            <Heading className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 text-xs"
                                            onClick={() => insertFormatting('\n• ')}
                                            title="Bullet List"
                                        >
                                            <List className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 text-xs"
                                            onClick={() => insertFormatting('\n1. ')}
                                            title="Numbered List"
                                        >
                                            <ListOrdered className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <Textarea
                                    ref={textareaRef}
                                    rows={5}
                                    placeholder="Type memorandum message body..."
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    className="font-sans text-sm p-3 leading-relaxed"
                                    required
                                />
                                {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
                            </div>

                            {/* Row 4: Digital Signature Pad / Saved Signature Auto-Use */}
                            {hasSavedSignature && !changeSignature ? (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                                Using your saved digital signature
                                            </div>
                                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                                Captured from profile. No drawing needed.
                                            </div>
                                        </div>
                                        {data.signature_type === 'drawn' && data.signature_data ? (
                                            <img
                                                src={data.signature_data}
                                                alt="Saved Signature"
                                                className="h-8 max-w-[120px] object-contain border rounded bg-white p-0.5"
                                            />
                                        ) : (
                                            <span className="font-serif italic font-semibold text-emerald-900 dark:text-emerald-200">
                                                "{data.signature_data || data.sender_name}"
                                            </span>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                        onClick={() => setChangeSignature(true)}
                                    >
                                        <Edit3 className="h-3.5 w-3.5" />
                                        Change Signature
                                    </Button>
                                </div>
                            ) : (
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
                            )}

                            {/* Row 5: Telegram Option & Action Buttons */}
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="send_telegram"
                                        checked={data.send_telegram}
                                        onCheckedChange={(checked) => setData('send_telegram', checked === true)}
                                    />
                                    <label htmlFor="send_telegram" className="text-xs font-medium cursor-pointer">
                                        Send Telegram alert to target department/branch
                                    </label>
                                </div>

                                <div className="flex gap-2">
                                    {/* Preview Modal */}
                                    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
                                                <Eye className="h-3.5 w-3.5" />
                                                Preview
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Memorandum Preview</DialogTitle>
                                                <DialogDescription>Document preview before publishing.</DialogDescription>
                                            </DialogHeader>

                                            <div className="rounded-lg border bg-white p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 space-y-4">
                                                <div className="border-b-2 border-amber-900 pb-2 text-center">
                                                    <img
                                                        src="/images/logo.png"
                                                        alt="Kaldi's Coffee Logo"
                                                        className="mx-auto mb-2 h-14 w-14 rounded-full border border-amber-900 object-cover p-0.5 shadow-sm bg-white"
                                                    />
                                                    <h2 className="font-bold text-base uppercase tracking-wider text-amber-950 dark:text-amber-300">
                                                        KALDI'S COFFEE P.L.C.
                                                    </h2>
                                                    <h3 className="font-bold text-xs tracking-widest text-slate-700 dark:text-slate-300 uppercase">
                                                        INTERNAL MEMORANDUM
                                                    </h3>
                                                </div>

                                                <div className="rounded border-l-4 border-amber-800 bg-amber-50/60 p-3 text-xs space-y-1 dark:bg-amber-950/30">
                                                    <div><strong>REF:</strong> {data.memo_id}</div>
                                                    <div><strong>DATE:</strong> {data.memo_date}</div>
                                                    <div><strong>TO:</strong> {data.recipient_name || 'Target Department/Branch'}</div>
                                                    <div><strong>FROM:</strong> {data.sender_name}</div>
                                                    <div><strong>SUBJECT:</strong> {data.title}</div>
                                                </div>

                                                <div className="whitespace-pre-wrap leading-relaxed text-sm py-2">
                                                    {data.content || 'No content typed.'}
                                                </div>

                                                <div className="pt-4 text-right">
                                                    {data.signature_type === 'drawn' && data.signature_data ? (
                                                        <img src={data.signature_data} alt="Signature" className="ml-auto h-14 object-contain" />
                                                    ) : (
                                                        <div className="font-serif italic text-lg text-amber-900 dark:text-amber-200">
                                                            {data.signature_data || data.sender_name}
                                                        </div>
                                                    )}
                                                    <div className="font-bold text-xs mt-1">{data.sender_name}</div>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        size="sm"
                                        className="gap-1.5 h-9 text-xs bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        {processing ? 'Publishing...' : 'Publish Memorandum'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
