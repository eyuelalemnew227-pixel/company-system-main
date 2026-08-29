import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type EvaluationType } from '@/types/evaluation-types.d';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Evaluation Types',
        href: '/evaluation-types',
    },
    {
        title: 'Edit Evaluation Type',
        href: null,
    },
];

interface EvaluationTypeForm {
    name: string;
    evaluation_type: 'person' | 'department' | 'branch' | 'other';
}

export default function EditEvaluationType({ evaluationType }: { evaluationType: EvaluationType }) {
    const { data, setData, put, errors, processing } = useForm({
        name: evaluationType.name,
        evaluation_type: evaluationType.evaluation_type,
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(`/evaluation-types/${evaluationType.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Evaluation Type" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Edit Evaluation Type</CardTitle>
                        <CardAction>
                            <Link href={'/evaluation-types'}>
                                <Button variant={'default'}>Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <form onSubmit={submit}>
                            <div className="mb-4">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    aria-invalid={!!errors.name}
                                    placeholder="Enter evaluation type name"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="evaluation_type">Type</Label>
                                <Select
                                    value={data.evaluation_type}
                                    onValueChange={(value: 'person' | 'department' | 'branch' | 'other') => setData('evaluation_type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="person">Person</SelectItem>
                                        <SelectItem value="department">Department</SelectItem>
                                        <SelectItem value="branch">Branch</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.evaluation_type} />
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