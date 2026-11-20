import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { FileSpreadsheet, Plus, Trash2, ArrowLeft, Pencil } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Internal Memorandum', href: '/memos' },
    { title: 'Memo Templates', href: '/memo-templates' },
];

interface TemplateItem {
    id: number;
    template_id: string;
    template_name: string;
    title?: string;
    content?: string;
    created_at: string;
}

interface Props {
    templates: TemplateItem[];
}

export default function MemoTemplatesIndex({ templates }: Props) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        template_name: '',
        title: '',
        content: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        template_name: '',
        title: '',
        content: '',
    });

    const handleCreateTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/memo-templates', {
            onSuccess: () => {
                toast.success('Memo template saved successfully!');
                reset();
                setCreateDialogOpen(false);
            },
            onError: () => toast.error('Failed to save memo template.'),
        });
    };

    const openEditDialog = (tpl: TemplateItem) => {
        setEditingTemplate(tpl);
        setEditData({
            template_name: tpl.template_name || '',
            title: tpl.title || '',
            content: tpl.content || '',
        });
    };

    const closeEditDialog = () => {
        setEditingTemplate(null);
        resetEdit();
    };

    const handleUpdateTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        put(`/memo-templates/${editingTemplate.id}`, {
            onSuccess: () => {
                toast.success('Memo template updated successfully!');
                closeEditDialog();
            },
            onError: () => toast.error('Failed to update memo template.'),
        });
    };

    const handleDeleteTemplate = (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete template "${name}"?`)) {
            router.delete(`/memo-templates/${id}`, {
                onSuccess: () => toast.success('Template deleted successfully.'),
                onError: () => toast.error('Failed to delete template.'),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Memo Templates" />

            <div className="mx-auto max-w-5xl space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            <FileSpreadsheet className="h-7 w-7 text-amber-700 dark:text-amber-500" />
                            Memo Templates
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Create and manage reusable memorandum content templates.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.history.back()}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>

                        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700">
                                    <Plus className="h-4 w-4" />
                                    New Template
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>Create Memo Template</DialogTitle>
                                    <DialogDescription>
                                        Save pre-written memo text for quick reuse.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleCreateTemplate} className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="template_name">
                                            Template Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="template_name"
                                            placeholder="e.g. Monthly Operations Report Memo"
                                            value={data.template_name}
                                            onChange={(e) => setData('template_name', e.target.value)}
                                            required
                                        />
                                        {errors.template_name && (
                                            <p className="text-xs text-red-500">{errors.template_name}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">Default Subject / Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g. Monthly Operational & Finance Update"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="content">
                                            Body Content <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="content"
                                            rows={6}
                                            placeholder="Enter standard template body content..."
                                            value={data.content}
                                            onChange={(e) => setData('content', e.target.value)}
                                            required
                                        />
                                        {errors.content && (
                                            <p className="text-xs text-red-500">{errors.content}</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCreateDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                                        >
                                            {processing ? 'Saving...' : 'Save Template'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && closeEditDialog()}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Edit Memo Template</DialogTitle>
                            <DialogDescription>
                                Update the template name, subject, and body content.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUpdateTemplate} className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit_template_name">
                                    Template Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit_template_name"
                                    value={editData.template_name}
                                    onChange={(e) => setEditData('template_name', e.target.value)}
                                    required
                                />
                                {editErrors.template_name && (
                                    <p className="text-xs text-red-500">{editErrors.template_name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_title">Default Subject / Title</Label>
                                <Input
                                    id="edit_title"
                                    value={editData.title}
                                    onChange={(e) => setEditData('title', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_content">
                                    Body Content <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="edit_content"
                                    rows={8}
                                    value={editData.content}
                                    onChange={(e) => setEditData('content', e.target.value)}
                                    required
                                />
                                {editErrors.content && (
                                    <p className="text-xs text-red-500">{editErrors.content}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={closeEditDialog}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editProcessing}
                                    className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                                >
                                    {editProcessing ? 'Updating...' : 'Update Template'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.length === 0 ? (
                        <Card className="col-span-full border border-dashed py-12 text-center text-muted-foreground">
                            <CardContent>
                                <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
                                <p className="font-medium">No saved memo templates yet.</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Click "New Template" above to save standard memorandum text formats.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        templates.map((tpl) => (
                            <Card key={tpl.id} className="border border-slate-200 shadow-sm dark:border-slate-800 flex flex-col justify-between">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                            {tpl.template_name}
                                        </CardTitle>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-slate-600 hover:text-amber-700"
                                                onClick={() => openEditDialog(tpl)}
                                                title="Edit template"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                                onClick={() => handleDeleteTemplate(tpl.id, tpl.template_name)}
                                                title="Delete template"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {tpl.title && (
                                        <CardDescription className="line-clamp-1 font-medium text-amber-900 dark:text-amber-400">
                                            Subject: {tpl.title}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-2 space-y-4">
                                    <p className="line-clamp-3 text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                                        {tpl.content}
                                    </p>
                                    <div className="text-[11px] text-muted-foreground border-t pt-2">
                                        Ref: {tpl.template_id}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
