import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SignatureCanvas from 'react-signature-canvas';
import { SearchableSelect } from '@/components/ui/searchable-select';
import React from 'react';

const SignaturePad = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const sigPad = React.useRef<any>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const onChangeRef = React.useRef(onChange);

    React.useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    React.useEffect(() => {
        if (sigPad.current && containerRef.current) {
            const canvas = sigPad.current.getCanvas();
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = containerRef.current.offsetWidth * ratio;
            canvas.height = containerRef.current.offsetHeight * ratio;
            canvas.getContext('2d').scale(ratio, ratio);
            sigPad.current.clear();
            if (value) sigPad.current.fromDataURL(value);
        }
    }, []);

    React.useEffect(() => {
        if (!value && sigPad.current && !sigPad.current.isEmpty()) {
            sigPad.current.clear();
        }
    }, [value]);

    const captureData = () => {
        if (sigPad.current && !sigPad.current.isEmpty()) {
            onChangeRef.current(sigPad.current.toDataURL('image/png'));
        }
    };

    return (
        <div
            ref={containerRef}
            className="border border-gray-300 rounded-md bg-white flex flex-col items-center relative h-48 w-full max-w-lg overflow-hidden shrink-0 group touch-none"
            onPointerUp={captureData}
            onPointerOut={captureData}
        >
            {!value && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-200 font-medium text-lg">
                    Sign Here
                </div>
            )}
            <SignatureCanvas
                penColor="black"
                canvasProps={{ className: 'w-full h-full cursor-crosshair relative z-10 touch-none', style: { width: '100%', height: '100%' } }}
                ref={sigPad}
                onEnd={captureData}
            />
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-7 text-xs bg-white shadow-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                    if (sigPad.current) sigPad.current.clear();
                    onChangeRef.current('');
                }}
            >
                Clear
            </Button>
        </div>
    );
};

export default function Fill({ form, formVersion, submission, parsedAnswers, branches, departments, employees }: { form: any, formVersion: any, submission?: any, parsedAnswers?: any, branches?: any[], departments?: any[], employees?: any[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Available Forms', href: '/available-forms' },
        { title: form.title, href: `/fill-forms/${form.id}` },
    ];

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
    // Automatically map defaults if starting a fresh form
    const initialAnswers = { ...parsedAnswers };
    if (!submission && formVersion?.sections) {
        formVersion.sections.forEach((s: any) => {
            s.questions?.forEach((q: any) => {
                if (q.default_value && initialAnswers[q.id] === undefined) {
                    initialAnswers[q.id] = String(q.default_value);
                }
            });
        });
    }

    const { data, setData, post, put, processing, errors } = useForm({
        answers: initialAnswers as Record<number, any>
    });

    const getAnswerForType = (typeIdentifier: string) => {
        for (const s of formVersion?.sections || []) {
            for (const q of s.questions || []) {
                if (q.input_type?.type_identifier === typeIdentifier) {
                    return data.answers[q.id];
                }
            }
        }
        return null;
    };

    const selectedBranch = getAnswerForType('branch_lookup');
    const selectedDepartment = getAnswerForType('department_lookup');

    const filteredDepartments = React.useMemo(() => {
        return departments || [];
    }, [departments]);

    const filteredEmployees = React.useMemo(() => {
        if (!employees) return [];
        let filtered = employees;
        if (selectedBranch) {
            filtered = filtered.filter(e => String(e.branch_id) === String(selectedBranch));
        }
        if (selectedDepartment) {
            filtered = filtered.filter(e => String(e.department_id) === String(selectedDepartment));
        }
        return filtered;
    }, [employees, selectedBranch, selectedDepartment]);

    const handleAnswerChange = (questionId: number, value: any) => {
        setData(current => ({
            ...current,
            answers: {
                ...current.answers,
                [questionId]: value
            }
        }));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (submission) {
            put(`/submissions/${submission.id}`);
        } else {
            post(`/fill-forms/${form.id}`);
        }
    };

    const isQuestionVisible = (question: any) => {
        if (!question.visibility_logic || !question.visibility_logic.target_local_id) return true;

        const targetQ = allQuestionsMap[question.visibility_logic.target_local_id];
        if (!targetQ) return true; // Fail open if target is deleted

        const givenAnswer = data.answers[targetQ.id];
        const requiredValue = question.visibility_logic.value;

        if (question.visibility_logic.operator === 'equals') {
            return givenAnswer == requiredValue;
        } else if (question.visibility_logic.operator === 'not_equals') {
            return givenAnswer != requiredValue;
        }

        return true;
    };

    const renderInput = (question: any) => {
        const inputTypeResolver = question.input_type || question.inputType;
        const typeId = inputTypeResolver?.type_identifier || 'text'; // Fallback to text to prevent crash
        const answer = data.answers[question.id] !== undefined ? data.answers[question.id] : '';

        switch (typeId) {
            case 'textarea':
                return (
                    <Textarea
                        value={answer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        required={question.is_required}
                        placeholder="Your answer..."
                        className="bg-white"
                    />
                );
            case 'boolean':
                return (
                    <div className="flex space-x-6">
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                            <input
                                type="radio"
                                name={`q-${question.id}`}
                                value="yes"
                                checked={answer === true}
                                onChange={() => handleAnswerChange(question.id, true)}
                                required={question.is_required}
                                className="w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 focus:ring-amber-500"
                            />
                            <span className="text-base font-medium leading-none">Yes</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                            <input
                                type="radio"
                                name={`q-${question.id}`}
                                value="no"
                                checked={answer === false}
                                onChange={() => handleAnswerChange(question.id, false)}
                                required={question.is_required}
                                className="w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 focus:ring-amber-500"
                            />
                            <span className="text-base font-medium leading-none">No</span>
                        </label>
                    </div>
                );
            case 'branch_lookup':
                return (
                    <SearchableSelect
                        options={branches || []}
                        value={answer}
                        onValueChange={(val) => handleAnswerChange(question.id, val)}
                        placeholder="Search branches..."
                        disabled={!!question.default_value}
                    />
                );
            case 'department_lookup':
                return (
                    <SearchableSelect
                        options={filteredDepartments}
                        value={answer}
                        onValueChange={(val) => handleAnswerChange(question.id, val)}
                        placeholder="Search departments..."
                        emptyText="No departments found"
                        disabled={!!question.default_value}
                    />
                );
            case 'employee_lookup':
                return (
                    <SearchableSelect
                        options={filteredEmployees}
                        value={answer}
                        onValueChange={(val) => handleAnswerChange(question.id, val)}
                        placeholder="Search employees..."
                        emptyText="No employees found for the selected criteria"
                    />
                );
            case 'select_one':
                // Optional chaining fallback array for safety
                const choices = question.choices || [];

                if (choices.length <= 4 && choices.length > 0) {
                    return (
                        <div className="flex flex-col space-y-3">
                            {choices.map((choice: any) => (
                                <label key={choice.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors w-fit">
                                    <input
                                        type="radio"
                                        name={`q-${question.id}`}
                                        value={choice.value}
                                        checked={answer === choice.value}
                                        onChange={() => handleAnswerChange(question.id, choice.value)}
                                        required={question.is_required}
                                        className="w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 focus:ring-amber-500"
                                    />
                                    <span className="text-base font-medium leading-none">{choice.label}</span>
                                </label>
                            ))}
                        </div>
                    );
                } else if (choices.length > 0) {
                    return (
                        <Select value={answer} onValueChange={(v: string) => handleAnswerChange(question.id, v)} required={question.is_required}>
                            <SelectTrigger className="w-[300px] bg-white">
                                <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                                {choices.map((choice: any) => (
                                    <SelectItem key={choice.id} value={choice.value}>{choice.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    );
                } else {
                    return <p className="text-sm text-red-500 italic">No options defined for this question.</p>;
                }
            case 'number':
                return <Input type="number" value={answer} onChange={(e) => handleAnswerChange(question.id, e.target.value)} required={question.is_required} className="max-w-xl bg-white" />;
            case 'date':
                return <Input type="date" value={answer} onChange={(e) => handleAnswerChange(question.id, e.target.value)} required={question.is_required} className="max-w-xl bg-white" />;
            case 'time':
                return <Input type="time" value={answer} onChange={(e) => handleAnswerChange(question.id, e.target.value)} required={question.is_required} className="w-fit bg-white" />;
            case 'signature':
                return <SignaturePad value={answer} onChange={(val) => handleAnswerChange(question.id, val)} />;
            case 'multiple_choice':
                const currentArr = Array.isArray(answer) ? answer : [];
                return (
                    <div className="flex flex-col space-y-3">
                        {question.choices?.map((choice: any) => (
                            <label key={choice.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors w-fit">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500"
                                    value={choice.value}
                                    checked={currentArr.includes(choice.value)}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        const newArr = checked
                                            ? [...currentArr, choice.value]
                                            : currentArr.filter((v: any) => v !== choice.value);
                                        handleAnswerChange(question.id, newArr);
                                    }}
                                />
                                <span className="text-base font-medium leading-none">{choice.label}</span>
                            </label>
                        ))}
                    </div>
                );
            default:
                return <Input type="text" value={answer} onChange={(e) => handleAnswerChange(question.id, e.target.value)} required={question.is_required} className="max-w-xl bg-white" placeholder="Type your answer..." />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={form.title} />

            <div className="max-w-4xl mx-auto space-y-8 pb-16">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <h1 className="text-4xl font-bold tracking-tight text-amber-900">{form.title}</h1>
                    {form.description && <p className="text-lg text-gray-600 mt-3 font-medium">{form.description}</p>}
                </div>

                <form onSubmit={submit} className="space-y-10">
                    {!formVersion.sections || formVersion.sections.length === 0 ? (
                        <div className="p-12 text-center bg-gray-50 border rounded-xl">
                            <p className="text-lg text-gray-500 font-medium">This form has no content to fill in yet.</p>
                        </div>
                    ) : (
                        formVersion.sections.map((section: any, idx: number) => (
                            <Card key={section.id} className="shadow-md border-amber-900/10 overflow-hidden">
                                <div className="bg-amber-900/5 px-6 py-4 border-b border-amber-900/10">
                                    <h3 className="text-xl font-bold text-amber-900">{idx + 1}. {section.title}</h3>
                                </div>
                                <CardContent className="p-8 space-y-10 bg-white">
                                    {!section.questions || section.questions.length === 0 ? (
                                        <p className="text-muted-foreground italic">No questions in this section.</p>
                                    ) : (
                                        section.questions.filter(isQuestionVisible).map((question: any, qIdx: number) => (
                                            <div key={question.id} className="space-y-4 pb-8 border-b border-gray-100 last:border-0 last:pb-0">
                                                <Label className="text-lg font-semibold text-gray-900">
                                                    {qIdx + 1}. {question.label}
                                                    {Boolean(question.is_required) && <span className="text-red-500 ml-1" title="Required field">*</span>}
                                                </Label>
                                                <div className="pl-4 pt-2">
                                                    {renderInput(question)}
                                                    {(errors as any)[`answers.${question.id}`] && (
                                                        <p className="text-red-500 text-sm mt-2 flex items-center">
                                                            <span className="font-bold mr-1">Error:</span> {(errors as any)[`answers.${question.id}`]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}

                    {Object.keys(errors).length > 0 && (
                        <div className="bg-red-50 text-red-700 p-6 rounded-lg border-l-4 border-red-500 shadow-sm flex flex-col justify-center">
                            <p className="font-bold text-lg mb-1">Submission Failed</p>
                            <p>Please double-check all required fields marked with an asterisk (*).</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-6 border-t space-x-4">
                        <Button type="button" variant="outline" size="lg" asChild className="px-8 text-base shadow-sm">
                            <Link href="/available-forms">Cancel</Link>
                        </Button>
                        <Button type="submit" size="lg" disabled={processing} className="px-10 text-base font-bold shadow-md bg-amber-700 hover:bg-amber-800 text-white transition-all transform hover:scale-105 active:scale-95">
                            {processing ? 'Submitting Responses...' : 'Submit Form'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
