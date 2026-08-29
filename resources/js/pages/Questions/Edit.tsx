import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type EvaluationType } from '@/types/evaluation-types.d';
import { type Question } from '@/types/question.d';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Questions',
        href: '/questions',
    },
    {
        title: 'Edit Question',
        href: '/questions/edit',
    },
];

interface QuestionEditForm {
    question_text: string;
    evaluation_type_id: string;
    status: 'active' | 'inactive';
}

export default function EditQuestion({
    question,
    evaluationTypes,
}: {
    question: Question;
    evaluationTypes: EvaluationType[];
}) {
    const { data, setData, put, errors, processing } = useForm({
        question_text: question.question_text || '',
        evaluation_type_id: question.evaluation_type_id?.toString() || '',
        status: (question.status as 'active' | 'inactive') || 'active',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(`/questions/${question.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Question" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Edit Question</CardTitle>
                        <CardAction>
                            <Link href={'/questions'}>
                                <Button variant={'default'}>Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <form onSubmit={submit}>
                            <div className="mb-4">
                                <Label htmlFor="question_text">Question Text</Label>
                                <Textarea
                                    id="question_text"
                                    value={data.question_text}
                                    onChange={(e) => setData('question_text', e.target.value)}
                                    aria-invalid={!!errors.question_text}
                                    placeholder="Enter question text"
                                    rows={4}
                                />
                                <InputError message={errors.question_text} />
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="evaluation_type_id">Evaluation Type</Label>
                                <Select
                                    value={data.evaluation_type_id.toString()}
                                    onValueChange={(value) => setData('evaluation_type_id', value)}
                                >
                                    <SelectTrigger>
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
                            <div className="mb-4">
                                <Label htmlFor="status">Status</Label>
                                <Select value={data.status} onValueChange={(value) => setData('status', value as 'active' | 'inactive')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>
                            <div className="flex justify-end">
                                <Button size={'lg'} type="submit" disabled={processing}>
                                    Update
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

