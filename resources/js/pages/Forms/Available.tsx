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
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Available Forms</h2>
                    <p className="text-muted-foreground">Select a form or checklist to fill out.</p>
                </div>

                {forms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="mx-auto rounded-full bg-amber-50 p-4 w-fit mb-3">
                            <FileText className="h-8 w-8 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-gray-900">No forms available</p>
                            <p className="text-sm text-gray-500 mt-1">There are currently no active forms to fill out.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {forms.map((form: any) => (
                            <Link href={`/fill-forms/${form.id}`} key={form.id} className="group block h-full">
                                <Card className="hover:shadow-md transition-all group-hover:-translate-y-1 group border-amber-900/10 h-full flex flex-col overflow-hidden bg-white">
                                    <CardHeader className="pb-3 flex-none border-b border-gray-100 bg-gradient-to-br from-white to-amber-50/20">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-200 text-amber-700 group-hover:scale-105 transition-transform group-hover:bg-amber-200/50">
                                                <ClipboardCheck className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-0.5">Start Checklist</span>
                                                <CardTitle className="text-xl line-clamp-1 group-hover:text-amber-700 transition-colors">
                                                    {form.title}
                                                </CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow pt-4 pb-4">
                                        <CardDescription className="line-clamp-2 text-sm text-gray-500 min-h-[40px]">
                                            {form.description || 'Click anywhere on this card to begin filling out the checklist.'}
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
