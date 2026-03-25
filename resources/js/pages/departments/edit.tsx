import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Department } from '@/types/departments';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Departments',
        href: '/departments',
    },
    {
        title: 'Edit Department',
        href: null,
    },
];

export default function EditDepartment({ department }: { department: Department }) {
    const { data, setData, put, errors, processing } = useForm({
        name: department.name,
        description: department.description || '',
        is_active: (department as any).is_active ?? true,
        is_active_on_ticketing: (department as any).is_active_on_ticketing ?? true,
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(`/departments/${department.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Department" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Edit Department</CardTitle>
                        <CardAction>
                            <Link href="/departments">
                                <Button variant="default">Go Back</Button>
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
                                    placeholder="Enter department name"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    type="text"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    aria-invalid={!!errors.description}
                                    placeholder="Enter description (optional)"
                                />
                                <InputError message={errors.description} />
                            </div>
                            <div className="mb-4 flex items-center gap-2">
                                <Label htmlFor="is_active">Active</Label>
                                <input
                                    id="is_active"
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                />
                                <InputError message={errors.is_active} />
                            </div>
                            <div className="mb-4 flex items-center gap-2">
                                <Label htmlFor="is_active_on_ticketing">Active for Ticketing</Label>
                                <input
                                    id="is_active_on_ticketing"
                                    type="checkbox"
                                    checked={data.is_active_on_ticketing}
                                    onChange={(e) => setData('is_active_on_ticketing', e.target.checked)}
                                />
                                <InputError message={(errors as any).is_active_on_ticketing} />
                            </div>
                            <div className="flex justify-end">
                                <Button size="lg" type="submit" disabled={processing}>
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
