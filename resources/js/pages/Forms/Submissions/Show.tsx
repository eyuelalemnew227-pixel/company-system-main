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

        if (qTypeBase === 'employee_attendance_roster') {
            let presentIds: string[] = [];
            try {
                if (matchingAns?.value_text) {
                    const parsed = JSON.parse(matchingAns.value_text);
                    if (Array.isArray(parsed)) presentIds = parsed.map(String);
                }
            } catch (e) {}

            if (presentIds.length === 0) {
                return <span className="text-gray-400 italic">No employees checked in</span>;
            }

            return (
                <div className="flex flex-wrap gap-2 py-1">
                    {presentIds.map((id) => {
                        const emp = employees?.find(e => String(e.id) === id);
                        return (
                            <span key={id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
                                {emp ? emp.name : `Employee #${id}`}
                            </span>
                        );
                    })}
                </div>
            );
        }

        if (qTypeBase === 'employee_evaluation_grid') {
            if (matchingAnswers.length === 0) {
                return <span className="text-gray-400 italic">No evaluated employees</span>;
            }

            const hasSubQs = q.visibility_logic?.has_sub_questions;
            const hasRemarkField = q.visibility_logic?.has_remark_field ?? true;
            const subQs = q.visibility_logic?.sub_questions || [];
            const choices = q.choices || [];

            const getChoiceLabel = (tgtVal: any) => {
                if (tgtVal === null || tgtVal === undefined || tgtVal === '') return '-';
                const matchedChoice = choices.find((c: any) => 
                    String(c.value) === String(tgtVal) || 
                    String(c.label).toLowerCase() === String(tgtVal).toLowerCase()
                );
                return matchedChoice ? matchedChoice.label : tgtVal;
            };

            // Reconstruct the virtual gridData object from answers
            const virtualGridData: Record<string, any> = {};

            // 1. Fallback: check if any answer contains a JSON object in value_text
            matchingAnswers.forEach((ans: any) => {
                if (ans.value_text && typeof ans.value_text === 'string' && ans.value_text.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(ans.value_text);
                        if (typeof parsed === 'object' && parsed !== null) {
                            Object.entries(parsed).forEach(([empKey, empVal]: [string, any]) => {
                                if (typeof empVal === 'object' && empVal !== null) {
                                    if (!virtualGridData[empKey]) virtualGridData[empKey] = {};
                                    Object.assign(virtualGridData[empKey], empVal);
                                }
                            });
                        }
                    } catch (e) {}
                }
            });

            // 2. Group decomposed answers by targeted employee
            const answersByEmp: Record<string, any[]> = {};
            matchingAnswers.forEach((ans: any) => {
                let targets: any[] = [];
                try {
                    targets = (typeof ans.targeted_employees === 'string' ? JSON.parse(ans.targeted_employees) : ans.targeted_employees) || [];
                } catch (e) {
                    targets = [];
                }
                if (!Array.isArray(targets) || targets.length === 0) {
                    if (ans.targeted_employees) targets = [ans.targeted_employees];
                }

                targets.forEach((empStr: any) => {
                    const empId = String(empStr);
                    if (!answersByEmp[empId]) answersByEmp[empId] = [];
                    answersByEmp[empId].push(ans);
                });
            });

            // 3. For each employee, map their answers to sub-questions
            Object.entries(answersByEmp).forEach(([empId, empAnswers]) => {
                if (!virtualGridData[empId]) virtualGridData[empId] = {};

                empAnswers.forEach((ans: any, ansIdx: number) => {
                    const subId = ans.sub_question_identifier;
                    const val = ans.value_text;

                    if (subId) {
                        virtualGridData[empId][subId] = val;
                        // Cross-index with matching sub-question ID and label
                        const matchedSubQ = subQs.find((sq: any) => 
                            (sq.id && String(sq.id) === String(subId)) || 
                            (sq.label && String(sq.label) === String(subId))
                        );
                        if (matchedSubQ) {
                            if (matchedSubQ.id) virtualGridData[empId][matchedSubQ.id] = val;
                            if (matchedSubQ.label) virtualGridData[empId][matchedSubQ.label] = val;
                        }
                    } else if (hasSubQs && subQs.length > 0 && ansIdx < subQs.length) {
                        // Fallback for submissions where sub_question_identifier was null (saved in sequential order)
                        const targetSubQ = subQs[ansIdx];
                        if (targetSubQ) {
                            if (targetSubQ.id) virtualGridData[empId][targetSubQ.id] = val;
                            if (targetSubQ.label) virtualGridData[empId][targetSubQ.label] = val;
                        }
                        virtualGridData[empId][ansIdx] = val;
                    } else {
                        virtualGridData[empId]['single'] = val;
                    }
                });
            });

            return (
                <div className="mt-2 overflow-x-auto rounded-md border border-amber-200 shadow-sm w-full">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-[#1c2c4c] text-white border-b uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 font-semibold sticky left-0 z-10 border-r bg-[#1c2c4c]">Employee Name</th>
                                {hasSubQs && subQs.length > 0 ? (
                                    subQs.map((sq: any, sqIdx: number) => (
                                        <th key={sq.id || sq.label || sqIdx} className="px-4 py-3 font-semibold text-center border-l border-[#2c3e60] leading-snug">{sq.label}</th>
                                    ))
                                ) : (
                                    <th className="px-4 py-3 font-semibold text-center border-l border-[#2c3e60] leading-snug">Evaluation</th>
                                )}
                                {hasRemarkField && <th className="px-4 py-3 font-semibold border-l border-[#2c3e60]">Remark / Note</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {Object.entries(virtualGridData).map(([empId, evals]: [string, any], idx) => {
                                const empInfo = employees?.find(e => String(e.id) === String(empId));
                                const employeeName = empInfo ? empInfo.name : `Employee #${empId}`;

                                return (
                                    <tr key={empId} className="hover:bg-amber-50/20 transition-colors">
                                        <td className="px-4 py-3 font-medium border-r border-gray-200 bg-white sticky left-0 z-10 text-gray-900 shadow-[1px_0_0_0_#e5e7eb]">{employeeName}</td>
                                        {hasSubQs && subQs.length > 0 ? (
                                            subQs.map((sq: any, sqIdx: number) => {
                                                const val = evals[sq.id] ?? evals[sq.label] ?? evals[sq.id || sq.label] ?? evals[sqIdx];
                                                return (
                                                    <td key={sq.id || sq.label || sqIdx} className="px-4 py-3 text-center border-l border-gray-100 text-gray-800 font-medium">
                                                        <span className="inline-block px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-semibold">
                                                            {getChoiceLabel(val)}
                                                        </span>
                                                    </td>
                                                );
                                            })
                                        ) : (
                                            <td className="px-4 py-3 text-center border-l border-gray-100 text-gray-800 font-medium">
                                                <span className="inline-block px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-semibold">
                                                    {getChoiceLabel(evals['single'])}
                                                </span>
                                            </td>
                                        )}
                                        {hasRemarkField && (
                                            <td className="px-4 py-3 text-gray-600 italic border-l border-gray-100 text-xs">
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
                                if (q.id) {
                                    map[String(q.id)] = q;
                                }
                                if (q._id) {
                                    map[q._id] = q;
                                }
                            });
                        });
                        return map;
                    }, [formVersion]);

                    const getTargetAnswer = (targetQ: any) => {
                        if (!targetQ) return '';
                        const matchingTargetAns = submission.answers?.find((a: any) => a.form_question_id === targetQ.id);
                        if (!matchingTargetAns) return '';
                        if (matchingTargetAns.value_boolean !== null && matchingTargetAns.value_boolean !== undefined) {
                            return matchingTargetAns.value_boolean;
                        }
                        return matchingTargetAns.value_text ?? '';
                    };

                    const evaluateVisibilityLogic = (logic: any, givenAnswer: any) => {
                        if (!logic || !logic.target_local_id) return true;

                        const operator = logic.operator || 'equals';
                        const requiredValue = logic.value;

                        if (givenAnswer === undefined || givenAnswer === null || givenAnswer === '') {
                            return operator === 'not_equals';
                        }

                        const normalizeBool = (val: any) => {
                            if (val === true || val === 1 || val === '1' || val === 'true' || val === 'yes') return true;
                            if (val === false || val === 0 || val === '0' || val === 'false' || val === 'no') return false;
                            return null;
                        };

                        const boolAnswer = normalizeBool(givenAnswer);
                        const boolReq = normalizeBool(requiredValue);

                        let isMatch = false;
                        if (boolAnswer !== null && boolReq !== null) {
                            isMatch = (boolAnswer === boolReq);
                        } else if (Array.isArray(givenAnswer)) {
                            isMatch = givenAnswer.map(v => String(v).trim().toLowerCase()).includes(String(requiredValue ?? '').trim().toLowerCase());
                        } else {
                            let parsedArray: any = null;
                            if (typeof givenAnswer === 'string' && givenAnswer.startsWith('[') && givenAnswer.endsWith(']')) {
                                try {
                                    parsedArray = JSON.parse(givenAnswer);
                                } catch {
                                    parsedArray = null;
                                }
                            }

                            if (Array.isArray(parsedArray)) {
                                isMatch = parsedArray.map(v => String(v).trim().toLowerCase()).includes(String(requiredValue ?? '').trim().toLowerCase());
                            } else {
                                const strGiven = String(givenAnswer ?? '').trim().toLowerCase();
                                const strReq = String(requiredValue ?? '').trim().toLowerCase();
                                isMatch = (strGiven === strReq);
                            }
                        }

                        return operator === 'not_equals' ? !isMatch : isMatch;
                    };

                    const isSectionVisible = (section: any) => {
                        if (!section.visibility_logic || !section.visibility_logic.target_local_id) return true;
                        const targetQ = allQuestionsMap[section.visibility_logic.target_local_id];
                        if (!targetQ) return true;
                        const givenAnswer = getTargetAnswer(targetQ);
                        return evaluateVisibilityLogic(section.visibility_logic, givenAnswer);
                    };

                    const isQuestionVisible = (question: any) => {
                        if (!question.visibility_logic || !question.visibility_logic.target_local_id) return true;
                        const targetQ = allQuestionsMap[question.visibility_logic.target_local_id];
                        if (!targetQ) return true;
                        const givenAnswer = getTargetAnswer(targetQ);
                        return evaluateVisibilityLogic(question.visibility_logic, givenAnswer);
                    };

                    const visibleSections = (formVersion.sections || []).filter(isSectionVisible);

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
                                {visibleSections.length === 0 ? (
                                    <Card className="p-8 text-center bg-gray-50 border">
                                        <p className="text-gray-500 font-medium">No sections or questions were applicable for this submission.</p>
                                    </Card>
                                ) : (
                                    visibleSections.map((section: any, sIdx: number) => (
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

                                                        const qTypeBase = inputTypeResolver?.type_identifier || '';
                                                        const isFullWidth = qTypeBase === 'employee_evaluation_grid' || qTypeBase === 'employee_attendance_roster';

                                                        if (isFullWidth) {
                                                            return (
                                                                <div key={question.id} className="p-5 flex flex-col gap-3 hover:bg-gray-50/50 transition-colors">
                                                                    <div>
                                                                        <p className="text-sm text-gray-500 mb-1 font-semibold uppercase tracking-wider text-[11px]">Question {sIdx + 1}.{qCounter}</p>
                                                                        <p className="font-semibold text-gray-900 text-base">{question.label}</p>
                                                                    </div>
                                                                    <div className="w-full">
                                                                        {getAnswerForQuestion(question)}
                                                                    </div>
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
                                )))}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </AppLayout>
    );
}
