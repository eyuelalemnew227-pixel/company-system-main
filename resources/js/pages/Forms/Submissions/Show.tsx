import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Clock, ShieldCheck, Star } from 'lucide-react';
import React from 'react';

export default function Show({ form, submission, branches, departments, employees }: { form: any, submission: any, branches?: any[], departments?: any[], employees?: any[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/forms' },
        { title: 'All Submissions', href: '/submissions' },
        { title: `${form.title} Records`, href: `/submissions/form/${form.id}` },
        { title: `Submission #${submission.id}`, href: `/submissions/${submission.id}` },
    ];

    // Helper to safely get the mapped answer 
    const getAnswerForQuestion = (qId: number) => {
        const matchingAns = submission.answers?.find((a: any) => a.form_question_id === qId);

        if (!matchingAns || (matchingAns.value_text === '' && matchingAns.value_boolean === null)) {
            return <span className="text-gray-400 italic">No answer provided</span>;
        }

        if (matchingAns.value_boolean !== null) {
            return (
                <span className={`px-2 py-1 rounded inline-block text-sm font-bold ${matchingAns.value_boolean ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {matchingAns.value_boolean ? 'Yes' : 'No'}
                </span>
            );
        }

        let val = matchingAns.value_text || matchingAns.value_boolean?.toString() || 'No answer provided';

        const inputTypeResolver = matchingAns.question?.input_type || matchingAns.question?.inputType;
        const qType = inputTypeResolver?.type_identifier;
        if (qType === 'branch_lookup') {
            val = branches?.find(b => String(b.id) === String(val))?.name || val;
        } else if (qType === 'department_lookup') {
            val = departments?.find(d => String(d.id) === String(val))?.name || val;
        } else if (qType === 'employee_lookup') {
            val = employees?.find(e => String(e.id) === String(val))?.name || val;
        }

        const isBase64Image = typeof val === 'string' && val.startsWith('data:image/png;base64,');

        if (isBase64Image) {
            return (
                <div className="border border-gray-200 rounded-md inline-block bg-gray-50 overflow-hidden shadow-sm mt-2">
                    <img src={val} alt="Signature Response" className="h-28 object-contain" />
                </div>
            );
        }

        if (qType === 'rating_stars') {
            const currentStar = parseInt(val) || 0;
            return (
                <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((starIdx) => (
                        <Star
                            key={starIdx}
                            className={`h-6 w-6 ${currentStar >= starIdx ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`}
                        />
                    ))}
                </div>
            );
        }

        if (qType === 'rating_slider') {
            const sliderVal = parseInt(val) || 0;
            return (
                <div className="flex bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-md items-center justify-center">
                    <span className="text-indigo-700 font-bold tracking-wide">{sliderVal} / 10</span>
                </div>
            );
        }

        return <span className="text-gray-900 font-medium">{val || '-'}</span>;
    };

    const formVersion = submission.form_version || submission.formVersion;
    if (!formVersion) return <div>Data sync error.</div>;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Submission #${submission.id} - ${form.title || 'Unknown Form'}`} />

            <div className="max-w-4xl mx-auto space-y-6 pb-12">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold tracking-tight text-amber-900">Submission Report</h2>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${submission.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                            submission.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                                submission.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                    'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                            {submission.status || 'pending'}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3">
                        {(submission.status !== 'pending') && (
                            <Button
                                variant="outline"
                                className="text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 shadow-sm"
                                onClick={() => router.patch(`/submissions/${submission.id}/status`, { status: 'pending' })}
                                disabled={submission.status === 'pending'}
                            >
                                Reset to Pending
                            </Button>
                        )}
                        {(submission.status !== 'approved') && (
                            <Button
                                variant="outline"
                                className="text-green-700 bg-green-50 border-green-200 hover:bg-green-100 shadow-sm"
                                onClick={() => router.patch(`/submissions/${submission.id}/status`, { status: 'approved' })}
                                disabled={submission.status === 'approved'}
                            >
                                <ShieldCheck className="mr-2 h-4 w-4" /> Approve
                            </Button>
                        )}
                        {(submission.status !== 'rejected') && (
                            <Button
                                variant="outline"
                                className="text-red-700 bg-red-50 border-red-200 hover:bg-red-100 shadow-sm"
                                onClick={() => router.patch(`/submissions/${submission.id}/status`, { status: 'rejected' })}
                                disabled={submission.status === 'rejected'}
                            >
                                Reject
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={`/submissions/form/${form.id}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Records
                            </Link>
                        </Button>
                    </div>
                </div>

                {(() => {
                    const allQuestionsMap = React.useMemo(() => {
                        const map: Record<string, any> = {};
                        formVersion?.sections?.forEach((s: any) => {
                            s.questions?.forEach((q: any) => {
                                if (q.local_id) {
                                    map[q.local_id] = q;
                                }
                            });
                        });
                        return map;
                    }, [formVersion]);

                    const isQuestionVisible = (question: any) => {
                        if (!question.visibility_logic || !question.visibility_logic.target_local_id) return true;

                        const targetQ = allQuestionsMap[question.visibility_logic.target_local_id];
                        if (!targetQ) return true;

                        const matchingTargetAns = submission.answers?.find((a: any) => a.form_question_id === targetQ.id);
                        const givenAnswer = matchingTargetAns ? (matchingTargetAns.value_boolean !== null ? matchingTargetAns.value_boolean : matchingTargetAns.value_text) : '';
                        const requiredValue = question.visibility_logic.value;

                        if (question.visibility_logic.operator === 'equals') {
                            // Loose equality ensures '0', 0, 'false', boolean false works.
                            return givenAnswer == requiredValue;
                        } else if (question.visibility_logic.operator === 'not_equals') {
                            return givenAnswer != requiredValue;
                        }
                        return true;
                    };

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="col-span-1 md:col-span-3 border-l-4 border-l-amber-600 shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Form Template</p>
                                            <h3 className="text-xl font-bold">{form.title || 'Unknown Form'}</h3>
                                            <p className="text-sm bg-blue-100 text-blue-800 w-fit px-2 py-0.5 rounded-full font-medium">Version {formVersion.version_number}.0</p>
                                        </div>
                                        <div className="space-y-3 pt-2 md:pt-0">
                                            <div className="flex items-center space-x-2 text-gray-700">
                                                <User className="h-5 w-5 text-gray-400" />
                                                <span className="font-semibold">{submission.user?.name || 'Unknown User'}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-gray-700">
                                                <Clock className="h-5 w-5 text-gray-400" />
                                                <span className="text-sm">Submitted on {new Date(submission.created_at).toLocaleDateString()} at {new Date(submission.created_at).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="col-span-1 md:col-span-3 space-y-6">
                                {formVersion.sections && formVersion.sections.map((section: any, sIdx: number) => (
                                    <Card key={section.id} className="shadow-sm border-amber-900/10">
                                        <CardHeader className="bg-amber-900/5 py-4 border-b border-amber-900/10">
                                            <CardTitle className="text-lg text-amber-900 flex items-center">
                                                <ShieldCheck className="h-5 w-5 mr-2 opacity-80" />
                                                {sIdx + 1}. {section.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0 bg-white">
                                            <div className="divide-y divide-gray-100">
                                                {(section.questions || []).filter(isQuestionVisible).map((question: any, qIdx: number) => (
                                                    <div key={question.id} className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                                        <div className="md:w-7/12">
                                                            <p className="text-sm text-gray-500 mb-1 font-semibold uppercase tracking-wider text-[11px]">Question {sIdx + 1}.{qIdx + 1}</p>
                                                            <p className="font-medium text-gray-900 text-base">{question.label}</p>
                                                        </div>
                                                        <div className="md:w-5/12 bg-white border rounded-lg p-3 shadow-sm flex items-center justify-center min-h-[50px] text-center max-w-full overflow-hidden">
                                                            {getAnswerForQuestion(question.id)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </AppLayout>
    );
}
