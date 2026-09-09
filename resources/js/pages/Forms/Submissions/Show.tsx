import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Clock, ShieldCheck, Star, MapPin } from 'lucide-react';
import React from 'react';

export default function Show({ form, submission, branches, departments, employees }: { form: any, submission: any, branches?: any[], departments?: any[], employees?: any[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/forms' },
        { title: 'All Submissions', href: '/submissions' },
        { title: `${form.title} Records`, href: `/submissions/form/${form.id}` },
        { title: `Submission #${submission.id}`, href: `/submissions/${submission.id}` },
    ];

    // Helper to safely get the mapped answer 
    const getAnswerForQuestion = (q: any) => {
        const qId = q.id;
        const matchingAnswers = submission.answers?.filter((a: any) => a.form_question_id === qId) || [];
        const matchingAns = matchingAnswers[0];

        const qTypeBase = q.inputType?.type_identifier || q.input_type?.type_identifier;

        if (qTypeBase === 'employee_evaluation_grid') {
            if (matchingAnswers.length === 0) {
                return <span className="text-gray-400 italic">No evaluated employees</span>;
            }

            const hasSubQs = q.visibility_logic?.has_sub_questions;
            const hasRemarkField = q.visibility_logic?.has_remark_field ?? true;
            const subQs = q.visibility_logic?.sub_questions || [];
            const choices = q.choices || [];

            const getChoiceLabel = (tgtVal: any) => {
                if (tgtVal === null || tgtVal === undefined) return '-';
                const matchedChoice = choices.find((c: any) => String(c.value) === String(tgtVal));
                return matchedChoice ? matchedChoice.label : tgtVal;
            };

            // Reconstruct the virtual gridData object from multi-row answers matching targeted_employees!
            const virtualGridData: Record<string, any> = {};
            matchingAnswers.forEach((ans: any) => {
                const targets = (typeof ans.targeted_employees === 'string' ? JSON.parse(ans.targeted_employees) : ans.targeted_employees) || [];
                targets.forEach((empStr: string) => {
                    const empId = String(empStr);
                    if (!virtualGridData[empId]) virtualGridData[empId] = {};

                    if (ans.sub_question_identifier) {
                        virtualGridData[empId][ans.sub_question_identifier] = ans.value_text;
                    } else {
                        virtualGridData[empId]['single'] = ans.value_text;
                    }
                });
            });

            return (
                <div className="mt-3 overflow-x-auto rounded-md border border-amber-200 shadow-sm max-w-full">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-amber-50 text-amber-900 border-b border-amber-200">
                            <tr>
                                <th className="px-4 py-2 font-semibold">Employee</th>
                                {hasSubQs && subQs.length > 0 ? (
                                    subQs.map((sq: any) => (
                                        <th key={sq.id || sq.label} className="px-4 py-2 font-semibold">{sq.label}</th>
                                    ))
                                ) : (
                                    <th className="px-4 py-2 font-semibold">Evaluation</th>
                                )}
                                {hasRemarkField && <th className="px-4 py-2 font-semibold border-l border-amber-100">Remark / Note</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100 bg-white">
                            {Object.entries(virtualGridData).map(([empId, evals]: [string, any], idx) => {
                                const empInfo = employees?.find(e => String(e.id) === String(empId));
                                const employeeName = empInfo ? empInfo.name : `Employee Code/ID #${empId}`;

                                return (
                                    <tr key={empId} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="px-4 py-2 font-medium border-r border-amber-50">{employeeName}</td>
                                        {hasSubQs && subQs.length > 0 ? (
                                            subQs.map((sq: any) => (
                                                <td key={sq.id || sq.label} className="px-4 py-2 text-gray-700">
                                                    {getChoiceLabel(evals[sq.label] || evals[sq.id] || evals[sq.id || sq.label])}
                                                </td>
                                            ))
                                        ) : (
                                            <td className="px-4 py-2 text-gray-700 font-medium">
                                                {getChoiceLabel(evals['single'])}
                                            </td>
                                        )}
                                        {hasRemarkField && (
                                            <td className="px-4 py-2 text-gray-600 italic border-l border-amber-50">
                                                {evals['remark'] || '-'}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }

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

        if (qType === 'geolocation') {
            return (
                <div className="flex bg-blue-50/70 border border-blue-200 px-3 py-1.5 rounded-md items-center justify-center space-x-2 hover:bg-blue-100/60 transition-colors">
                    <MapPin className="text-blue-600 h-4 w-4" />
                    <a href={`https://maps.google.com/?q=${val}`} target="_blank" rel="noreferrer" className="text-blue-700 font-semibold text-sm hover:underline tracking-wide">
                        View on Map
                    </a>
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

        if (qType === 'employee_evaluation_grid') {
            try {
                const gridData = JSON.parse(val);
                if (typeof gridData !== 'object' || gridData === null) throw new Error("Invalid");

                const hasSubQs = matchingAns.question?.visibility_logic?.has_sub_questions;
                const subQs = matchingAns.question?.visibility_logic?.sub_questions || [];
                const choices = matchingAns.question?.choices || [];

                const getChoiceLabel = (tgtVal: any) => {
                    if (!tgtVal) return '-';
                    const matchedChoice = choices.find((c: any) => String(c.value) === String(tgtVal));
                    return matchedChoice ? matchedChoice.label : tgtVal;
                };

                return (
                    <div className="mt-3 overflow-x-auto rounded-md border border-amber-200 shadow-sm max-w-full">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-amber-50 text-amber-900 border-b border-amber-200">
                                <tr>
                                    <th className="px-4 py-2 font-semibold">Employee</th>
                                    {hasSubQs && subQs.length > 0 ? (
                                        subQs.map((sq: any) => (
                                            <th key={sq.id || sq.label} className="px-4 py-2 font-semibold">{sq.label}</th>
                                        ))
                                    ) : (
                                        <th className="px-4 py-2 font-semibold">Evaluation</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100 bg-white">
                                {Object.entries(gridData).map(([empId, evals]: [string, any], idx) => {
                                    const empInfo = employees?.find(e => String(e.id) === String(empId));
                                    const employeeName = empInfo ? empInfo.name : `Employee Code/ID #${empId}`;

                                    return (
                                        <tr key={empId} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="px-4 py-2 font-medium border-r border-amber-50">{employeeName}</td>
                                            {hasSubQs && subQs.length > 0 ? (
                                                subQs.map((sq: any) => (
                                                    <td key={sq.id || sq.label} className="px-4 py-2 text-gray-700">
                                                        {getChoiceLabel(evals[sq.label] || evals[sq.id])}
                                                    </td>
                                                ))
                                            ) : (
                                                <td className="px-4 py-2 text-gray-700 font-medium">
                                                    {getChoiceLabel(evals['single'])}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            } catch (e) {
                return <span className="text-red-500 italic">Invalid Grid Format</span>;
            }
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

                            {submission.employee_scores && submission.employee_scores.length > 0 && (
                                <div className="col-span-1 md:col-span-3 space-y-4 pt-2">
                                    <h3 className="text-xl font-bold tracking-tight text-amber-900 border-b pb-2">Employee Scorecards</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {submission.employee_scores.map((score: any) => {
                                            const dept = departments?.find((d) => String(d.id) === String(score.department_id));
                                            return (
                                                <div key={score.id} className="bg-white rounded-xl border border-amber-900/10 shadow-sm p-5 hover:shadow-md transition-shadow">
                                                    <div className="flex flex-col mb-3">
                                                        <span className="font-bold text-gray-900 truncate tracking-tight text-[16px]">{score.name}</span>
                                                        <span className="text-xs font-bold uppercase text-amber-600 mt-0.5">{dept?.name || 'Unassigned'}</span>
                                                    </div>
                                                    <div className="flex items-end justify-between mt-2 pt-3 border-t">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase font-bold text-gray-400">Achieved</span>
                                                            <span className="font-medium text-gray-700 text-sm">{score.earned_points} / {score.total_points} Pts</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            {score.percentage !== null ? (
                                                                <span className={`font-bold text-lg ${score.percentage >= 80 ? 'text-green-600' : score.percentage >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                                    {score.percentage}%
                                                                </span>
                                                            ) : (
                                                                <span className="font-bold text-sm text-gray-400 italic">N/A</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
                                                {(() => {
                                                    const visibleQuestions = (section.questions || []).filter(isQuestionVisible);
                                                    let qCounter = 0;
                                                    return visibleQuestions.map((question: any) => {
                                                        const inputTypeResolver = question.inputType || question.input_type;
                                                        const isTitle = (inputTypeResolver?.type_identifier || '') === 'title';
                                                        if (!isTitle) {
                                                            qCounter++;
                                                        }

                                                        if (isTitle) {
                                                            return (
                                                                <div key={question.id} className="px-5 py-3.5 bg-amber-50/70 border-l-4 border-amber-600">
                                                                    <p className="font-bold text-amber-950 text-base tracking-tight">{question.label}</p>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div key={question.id} className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                                                <div className="md:w-7/12">
                                                                    <p className="text-sm text-gray-500 mb-1 font-semibold uppercase tracking-wider text-[11px]">Question {sIdx + 1}.{qCounter}</p>
                                                                    <p className="font-medium text-gray-900 text-base">{question.label}</p>
                                                                </div>
                                                                <div className="md:w-5/12 bg-white border rounded-lg p-3 shadow-sm flex items-center justify-center min-h-[50px] text-center max-w-full overflow-hidden">
                                                                    {getAnswerForQuestion(question)}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
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
