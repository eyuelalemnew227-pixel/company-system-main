import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import type { PageProps } from '@/types';

type Props = PageProps & {
    evaluationResponse: any;
    evaluateLabel: string;
    questions: any[];
};

export default function Edit({ evaluationResponse, evaluateLabel, questions }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        comment: evaluationResponse.comment || '',
        question_responses: evaluationResponse.question_responses?.map((qr: any) => ({
            question_id: qr.question_id,
            score: qr.score
        })) || [],
    });


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('evaluation-records.update', evaluationResponse.id));
    };

    const updateScore = (questionId: number, score: number) => {
        const index = data.question_responses.findIndex((qr: any) => qr.question_id === questionId);
        const newResponses = [...data.question_responses];
        
        if (index !== -1) {
            newResponses[index] = { ...newResponses[index], score };
        } else {
            newResponses.push({ question_id: questionId, score });
        }
        
        setData('question_responses', newResponses);
    };

    return (
        <AppLayout>
            <Head title="Edit Evaluation" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="h-9 w-9">
                        <Link href={route('evaluation-records.index')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Edit Evaluation Record</h1>
                        <p className="text-sm text-gray-500">
                            You are editing the evaluation for <span className="font-semibold text-indigo-600">{evaluateLabel}</span>
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader className="bg-gray-50/50">
                            <CardTitle className="text-lg">Evaluation Context</CardTitle>
                        </CardHeader>
                        <CardContent className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-gray-500">Evaluator</Label>
                                <div className="font-medium text-gray-900">{evaluationResponse.evaluator?.name || 'N/A'}</div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-gray-500">Evaluation Template</Label>
                                <div className="font-medium text-gray-900">{evaluationResponse.evaluation?.name || 'N/A'}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Question Scores</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {questions.map((question: any) => {
                                const response = data.question_responses.find((qr: any) => qr.question_id === question.id);
                                return (
                                    <div key={question.id} className="space-y-3 border-b pb-6 last:border-0 last:pb-0">
                                        <Label className="text-base font-medium text-gray-900">{question.question_text}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Button
                                                    key={s}
                                                    type="button"
                                                    variant={response?.score === s ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => updateScore(question.id, s)}
                                                    className="w-12 h-10"
                                                >
                                                    {s}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            <InputError message={errors.question_responses} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="comment">Admin Comments / Feedback</Label>
                                <Textarea
                                    id="comment"
                                    value={data.comment}
                                    onChange={(e) => setData('comment', e.target.value)}
                                    placeholder="Enter any administrative notes or context for this evaluation..."
                                    className="min-h-[100px]"
                                />
                                <InputError message={errors.comment} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" asChild>
                            <Link href={route('evaluation-records.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing} className="px-8">
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
