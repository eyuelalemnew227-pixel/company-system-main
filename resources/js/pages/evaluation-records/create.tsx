import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
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
import type { EvaluationPeriod } from '@/types/evaluation-period';
import type { EvaluationType } from '@/types/evaluation-type';
import type { Question } from '@/types/question';
import type { User } from '@/types/users';
import type { PageProps } from '@/types';

type Props = PageProps & {
    evaluationPeriods: EvaluationPeriod[];
    evaluationTypes: EvaluationType[];
    users: User[];
    questions: Question[];
};

interface QuestionResponse {
    question_id: string;
    score: string;
}

export default function Create({ evaluationPeriods, evaluationTypes, users, questions }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        evaluator_id: '',
        evaluate_id: '',
        evaluation_period_id: '',
        evaluation_type_id: '',
        comment: '',
        question_responses: [] as QuestionResponse[],
    });

    const [selectedEvaluationType, setSelectedEvaluationType] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('evaluation-responses.store'), {
            onSuccess: () => {
                reset();
            },
        });
    };

    const handleEvaluationTypeChange = (value: string) => {
        setSelectedEvaluationType(value);
        setData('evaluation_type_id', value);
        // Filter questions based on evaluation type
        const filteredQuestions = questions.filter(q => q.evaluation_type_id === parseInt(value));
        // Reset question responses
        setData('question_responses', []);
    };

    const addQuestionResponse = () => {
        setData('question_responses', [
            ...data.question_responses,
            { question_id: '', score: '' }
        ]);
    };

    const removeQuestionResponse = (index: number) => {
        const newResponses = data.question_responses.filter((_, i) => i !== index);
        setData('question_responses', newResponses);
    };

    const updateQuestionResponse = (index: number, field: keyof QuestionResponse, value: string) => {
        const newResponses = [...data.question_responses];
        newResponses[index] = { ...newResponses[index], [field]: value };
        setData('question_responses', newResponses);
    };

    // Filter questions based on selected evaluation type
    const filteredQuestions = selectedEvaluationType
        ? questions.filter(q => q.evaluation_type_id === parseInt(selectedEvaluationType))
        : questions;

    return (
        <AppLayout>
            <Head title="" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('evaluation-responses.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Create Evaluation Response</h1>
                </div>

                <Card className="max-w-4xl">
                    <CardHeader>
                        <CardTitle>Evaluation Response Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="evaluator_id">Evaluator</Label>
                                    <Select value={data.evaluator_id} onValueChange={(value) => setData('evaluator_id', value)}>
                                        <SelectTrigger className={errors.evaluator_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select evaluator" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.evaluator_id} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="evaluate_id">Evaluatee</Label>
                                    <Select value={data.evaluate_id} onValueChange={(value) => setData('evaluate_id', value)}>
                                        <SelectTrigger className={errors.evaluate_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select evaluatee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.evaluate_id} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="evaluation_period_id">Evaluation Period</Label>
                                    <Select value={data.evaluation_period_id} onValueChange={(value) => setData('evaluation_period_id', value)}>
                                        <SelectTrigger className={errors.evaluation_period_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select evaluation period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {evaluationPeriods.map((period) => (
                                                <SelectItem key={period.id} value={period.id.toString()}>
                                                    {period.evaluation_period_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.evaluation_period_id} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="evaluation_type_id">Evaluation Type</Label>
                                    <Select value={data.evaluation_type_id} onValueChange={handleEvaluationTypeChange}>
                                        <SelectTrigger className={errors.evaluation_type_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select evaluation type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {evaluationTypes.map((type) => (
                                                <SelectItem key={type.id} value={type.id.toString()}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.evaluation_type_id} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="comment">Comment</Label>
                                <Textarea
                                    id="comment"
                                    value={data.comment}
                                    onChange={(e) => setData('comment', e.target.value)}
                                    placeholder="Enter your comment"
                                    className={errors.comment ? 'border-red-500' : ''}
                                />
                                <InputError message={errors.comment} />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Question Responses</Label>
                                    <Button type="button" onClick={addQuestionResponse} disabled={!selectedEvaluationType}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Question
                                    </Button>
                                </div>

                                {data.question_responses.map((response, index) => (
                                    <div key={index} className="flex gap-4 items-end">
                                        <div className="flex-1 space-y-2">
                                            <Label>Question</Label>
                                            <Select 
                                                value={response.question_id} 
                                                onValueChange={(value) => updateQuestionResponse(index, 'question_id', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select question" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredQuestions.map((question) => (
                                                        <SelectItem key={question.id} value={question.id.toString()}>
                                                            {question.question_text}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-32 space-y-2">
                                            <Label>Score</Label>
                                            <Select 
                                                value={response.score} 
                                                onValueChange={(value) => updateQuestionResponse(index, 'score', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Score" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1 - Poor</SelectItem>
                                                    <SelectItem value="2">2 - Fair</SelectItem>
                                                    <SelectItem value="3">3 - Good</SelectItem>
                                                    <SelectItem value="4">4 - Very Good</SelectItem>
                                                    <SelectItem value="5">5 - Excellent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={() => removeQuestionResponse(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                <InputError message={errors.question_responses} />
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Evaluation Response
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('evaluation-responses.index')}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
