import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, ArrowLeft } from 'lucide-react';
import React from 'react';

export default function Index({ form, allVersions, currentVersionId }: { form: any, allVersions: any[], currentVersionId: number }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/forms' },
        { title: 'All Forms', href: '/forms' },
        { title: `Version History`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Versions - ${form.title}`} />
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-amber-900">Version History</h2>
                        <p className="text-muted-foreground">Manage and export historical schemas for <strong>{form.title}</strong></p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/forms">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forms
                        </Link>
                    </Button>
                </div>

                <Card className="border-amber-900/10 shadow-sm">
                    <CardHeader className="bg-amber-50/30">
                        <CardTitle>Recorded Versions</CardTitle>
                        <CardDescription>All previously active structures for this file</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6 w-1/4">Version Log</TableHead>
                                    <TableHead>Created Date</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allVersions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No versions recorded yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    allVersions.map((v: any) => (
                                        <TableRow key={v.id} className="hover:bg-amber-50/50">
                                            <TableCell className="pl-6 font-semibold text-amber-900">
                                                v{v.version_number}.0
                                                {v.id === currentVersionId && <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">Currently Active</span>}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {new Date(v.created_at).toLocaleDateString()} at {new Date(v.created_at).toLocaleTimeString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <a href={`/forms/${form.id}/export?version_id=${v.id}`} download>
                                                    <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50 border-gray-200">
                                                        <Download className="w-4 h-4 mr-2" /> Download JSON
                                                    </Button>
                                                </a>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
