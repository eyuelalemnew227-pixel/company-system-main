import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardCheck, FileText } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Form Builder', href: '/forms' },
    { title: 'Fill Forms', href: '/forms/available' },
];

export default function Available({ forms }: { forms: any[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fill Forms" />
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Available Forms</h2>
                    <p className="text-muted-foreground">Select a form or checklist to fill out.</p>
                </div>

                {forms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center bg-white rounded-lg border shadow-sm">
                        <div className="rounded-full bg-secondary p-3">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-foreground">No forms available</p>
                            <p className="text-sm text-muted-foreground">There are currently no active forms to fill out.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {forms.map((form: any) => (
                            <Link href={`/fill-forms/${form.id}`} key={form.id} className="group block">
                                <Card className="h-full transition-all hover:shadow-md hover:border-amber-500/50 group-hover:bg-amber-50/30">
                                    <CardHeader>
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                                                <ClipboardCheck className="h-5 w-5" />
                                            </div>
                                            <CardTitle className="text-lg group-hover:text-amber-700 transition-colors">{form.title}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="line-clamp-2">
                                            {form.description || 'Click to fill out this checklist.'}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
