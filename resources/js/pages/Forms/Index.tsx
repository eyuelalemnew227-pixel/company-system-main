import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, ClipboardList, Edit, Upload, Download, MoreHorizontal, History, Trash2 } from 'lucide-react';
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
            <div className="space-y-6">
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

                <Card>
                    <CardHeader>
                        <CardTitle>All Forms</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {forms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
                                <div className="rounded-full bg-secondary p-3">
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-foreground">No forms created yet</p>
                                    <p className="text-sm text-muted-foreground">Click "Create Form" to get started.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 font-medium text-muted-foreground">ID</th>
                                            <th className="h-12 px-4 font-medium text-muted-foreground">Title</th>
                                            <th className="h-12 px-4 font-medium text-muted-foreground">Status</th>
                                            <th className="h-12 px-4 font-medium text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {forms.map((form: any) => (
                                            <tr key={form.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                <td className="p-4 align-middle">{form.id}</td>
                                                <td className="p-4 align-middle font-medium">{form.title}</td>
                                                <td className="p-4 align-middle">{form.status}</td>
                                                <td className="p-4 align-middle text-right flex justify-end">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[160px]">
                                                            <DropdownMenuLabel>Form Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem asChild className="cursor-pointer font-medium text-amber-700 focus:text-amber-800">
                                                                <Link href={`/forms/${form.id}/edit`}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Template
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild className="cursor-pointer">
                                                                <Link href={`/forms/${form.id}/versions`}>
                                                                    <History className="mr-2 h-4 w-4" /> Version History
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => triggerReplace(form.id)} className="cursor-pointer text-gray-700">
                                                                <Download className="mr-2 h-4 w-4" /> Replace Schema
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setTimeout(() => setFormToDelete(form.id), 50)} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Form
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
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
