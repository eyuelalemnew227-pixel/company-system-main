import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileText, ChevronRight, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React from 'react';

export default function Index({ forms }: { forms: any[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/forms' },
        { title: 'All Submissions', href: '/submissions' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Forms Directory" />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-amber-900">Submissions Directory</h2>
                        <p className="text-muted-foreground">Select a form to view its submitted records and analytics.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {forms.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-gray-300">
                            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No forms available</h3>
                            <p className="text-gray-500 mt-1">Create a form in the template builder to begin collecting data.</p>
                        </div>
                    ) : (
                        forms.map((form) => (
                            <Card key={form.id} className="hover:shadow-md transition-shadow group border-amber-900/10 h-full flex flex-col">
                                <CardHeader className="pb-3 flex-none">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-200">
                                            <FileText className="w-6 h-6 text-amber-700" />
                                        </div>
                                        {form.status === 'active' ? (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border-green-200">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border-gray-200">
                                                {form.status}
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl mt-3 line-clamp-1 group-hover:text-amber-700 transition-colors">
                                        {form.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="flex-grow">
                                    <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                                        {form.description || 'No description provided for this form.'}
                                    </p>

                                    <div className="mt-5 flex items-center gap-2 bg-gray-50 rounded-md p-3 border border-gray-100">
                                        <BarChart2 className="w-5 h-5 text-gray-400" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Submissions</span>
                                            <span className="text-lg font-bold text-amber-900">{form.submissions_count}</span>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col gap-2 pt-4 border-t mt-auto">
                                    <Button asChild className="w-full justify-between" variant="outline">
                                        <Link href={`/submissions/form/${form.id}`}>
                                            View Data <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
