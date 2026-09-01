import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, ClipboardList, Edit, Upload, Download, MoreHorizontal, History, Trash2, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React, { useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Form Builder', href: '/forms' },
    { title: 'All Forms', href: '/forms' },
];

export default function Index({ forms }: { forms: any[] }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceFileInputRef = useRef<HTMLInputElement>(null);
    const [replaceFormId, setReplaceFormId] = React.useState<number | null>(null);
    const [formToDelete, setFormToDelete] = React.useState<number | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            router.post('/forms/import', { schema: e.target.files[0] }, {
                preserveScroll: true,
                forceFormData: true,
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerReplace = (id: number) => {
        setReplaceFormId(id);
        setTimeout(() => replaceFileInputRef.current?.click(), 10);
    };

    const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && replaceFormId) {
            router.post(`/forms/${replaceFormId}/import`, { schema: e.target.files[0] }, {
                preserveScroll: true,
                forceFormData: true,
            });
            if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Forms" />
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Form Builder</h2>
                        <p className="text-muted-foreground">Create and manage dynamic forms and checklists.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <input type="file" className="hidden" ref={fileInputRef} accept=".json" onChange={handleFileChange} />
                        <input type="file" className="hidden" ref={replaceFileInputRef} accept=".json" onChange={handleReplaceFileChange} />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="bg-white">
                            <Download className="mr-2 h-4 w-4" /> Import JSON
                        </Button>
                        <Button asChild>
                            <Link href="/forms/create">
                                <Plus className="mr-2 h-4 w-4" /> Create Form
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    {forms.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-gray-300">
                            <div className="mx-auto rounded-full bg-amber-50 p-4 w-fit mb-3">
                                <FileText className="h-8 w-8 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No forms created yet</h3>
                            <p className="text-gray-500 mt-1">Click "Create Form" to get started building your checklists.</p>
                        </div>
                    ) : (
                        forms.map((form: any) => (
                            <Card key={form.id} className="hover:shadow-md transition-shadow group border-amber-900/10 h-full flex flex-col overflow-hidden bg-white">
                                <CardHeader className="pb-3 flex-none border-b border-gray-100 bg-gradient-to-br from-white to-amber-50/20">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-200 text-amber-700 group-hover:scale-105 transition-transform">
                                            <ClipboardList className="w-5 h-5" />
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center border ${form.status === 'active'
                                            ? 'bg-green-100 text-green-800 border-green-200'
                                            : form.status === 'archived'
                                                ? 'bg-red-100 text-red-800 border-red-200'
                                                : 'bg-gray-100 text-gray-800 border-gray-200'
                                            }`}>
                                            {form.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>}
                                            {form.status ? form.status.charAt(0).toUpperCase() + form.status.slice(1) : 'Unknown'}
                                        </span>
                                    </div>
                                    <CardTitle className="text-xl mt-4 line-clamp-1 group-hover:text-amber-700 transition-colors">
                                        {form.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="flex-grow pt-4 pb-2">
                                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                                        {form.description || 'No description provided for this template.'}
                                    </p>

                                    <div className="mt-4 flex items-center gap-3 bg-gray-50/80 rounded-md p-3 border border-gray-100">
                                        <div className="bg-white p-1.5 rounded-md shadow-sm border border-gray-100">
                                            <ClipboardList className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Template ID</span>
                                            <span className="text-sm font-semibold text-gray-700">#{form.id}</span>
                                        </div>
                                    </div>
                                </CardContent>

                                <div className="p-4 border-t mt-auto flex items-center justify-between bg-gray-50/50">
                                    <div className="flex gap-2 w-full">
                                        {form.can_edit_schema ? (
                                            <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 shadow-sm">
                                                <Link href={`/forms/${form.id}/edit`}>
                                                    <Edit className="w-4 h-4 mr-2" /> Edit Schema
                                                </Link>
                                            </Button>
                                        ) : (
                                            <div className="flex-1"></div>
                                        )}
                                        <div className="flex gap-1.5 ml-auto">
                                            {form.can_edit_schema && (
                                                <Button asChild variant="outline" size="sm" className="h-9 w-9 p-0 text-gray-600 bg-white" title="Version History">
                                                    <Link href={`/forms/${form.id}/versions`}>
                                                        <History className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-gray-500 bg-white hover:text-amber-700 hover:border-amber-300">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[160px]">
                                                    <DropdownMenuItem onClick={() => triggerReplace(form.id)} className="cursor-pointer text-gray-700">
                                                        <Download className="mr-2 h-4 w-4" /> Import Schema
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {form.can_manage_access && (
                                                        <DropdownMenuItem asChild className="cursor-pointer text-indigo-700">
                                                            <Link href={`/forms/${form.id}/permissions`}>
                                                                <ShieldAlert className="mr-2 h-4 w-4" /> Manage Access
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setTimeout(() => setFormToDelete(form.id), 50)} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Form
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            <AlertDialog open={formToDelete !== null} onOpenChange={(open: boolean) => !open && setFormToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the Form and completely obliterate all associated versions, checklists, and historical user submissions across the entire ecosystem.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (formToDelete) {
                                    router.delete(`/forms/${formToDelete}`);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Confirm Deletion
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
