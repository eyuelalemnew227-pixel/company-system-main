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
import React, { useState, useRef, useMemo } from 'react';
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
        sender_position: memo.sender_position || '',
        target_department: (memo.departments && memo.departments[0]) || memo.recipient_name || '',
        recipient_name: memo.recipient_name || '',
        content: memo.content || '',
        priority: 'normal',
        departments: memo.departments || [],
        signature_type: memo.signature_type || 'typed',
        signature_data: memo.signature_data || '',
    });

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

    // Pre-calculate initial branch / department matching
    const initialDeptOrBranch = (memo.departments && memo.departments[0]) || memo.recipient_name || '';
    const initialBranchMatch = branchOptions.find((b) => b.rawName === initialDeptOrBranch || b.id === initialDeptOrBranch);
    const initialDeptMatch = departmentOptions.find((d) => d.rawName === initialDeptOrBranch || d.id === initialDeptOrBranch);

    const initialIsHO = Boolean(
        initialDeptMatch ||
        (initialBranchMatch && (initialBranchMatch.rawName.toLowerCase().includes('head office') || initialBranchMatch.rawName.toLowerCase().replace(/[\s\-_]/g, '').includes('headoffice')))
    );

    const [selectedBranchId, setSelectedBranchId] = useState<string>(
        initialBranchMatch ? initialBranchMatch.id : (initialIsHO ? (branchOptions.find((b) => b.rawName.toLowerCase().includes('head office'))?.id || '') : '')
    );
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(initialDeptMatch ? initialDeptMatch.id : '');
    const [isHeadOffice, setIsHeadOffice] = useState<boolean>(initialIsHO);

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
        if (isHeadOffice && !data.recipient_name) {
            toast.error('Please select a target Department for Head Office.');
            return;
        }
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
