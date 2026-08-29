import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Branch } from '@/types/branches';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branches',
        href: '/branches',
    },
    {
        title: 'Edit Branch',
        href: null,
    },
];

export default function EditBranch({ branch, departments }: { branch: Branch; departments: string[] }) {
    const departmentList = branch.departments;
    const { data, setData, put, errors, processing } = useForm({
        branch_code: branch.branch_code,
        name: branch.name,
        location: branch.location || '',
        contact_email: branch.contact_email || '',
        contact_phone: branch.contact_phone || '',
        description: branch.description || '',
        is_sales_generating: branch.is_sales_generating || false,
        is_pre_order_branch: (branch as any).is_pre_order_branch ?? true,
        departments: departmentList,
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(`/branches/${branch.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Branch" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Edit Branch</CardTitle>
                        <CardAction>
                            <Link href="/branches">
                                <Button variant="default">Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <form onSubmit={submit}>
                            <div className="mb-4">
                                <Label htmlFor="branch_code">Branch Code</Label>
                                <Input
                                    id="branch_code"
                                    type="text"
                                    value={data.branch_code}
                                    onChange={(e) => setData('branch_code', e.target.value)}
                                    aria-invalid={!!errors.branch_code}
                                    placeholder="Enter branch code"
                                />
                                <InputError message={errors.branch_code} />
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    aria-invalid={!!errors.name}
                                    placeholder="Enter branch name"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    type="text"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    aria-invalid={!!errors.location}
                                    placeholder="Enter location (optional)"
                                />
                                <InputError message={errors.location} />
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="contact_email">Contact Email</Label>
                                <Input
                                    id="contact_email"
                                    type="email"
                                    value={data.contact_email}
                                    onChange={(e) => setData('contact_email', e.target.value)}
                                    aria-invalid={!!errors.contact_email}
                                    placeholder="Enter contact email (optional)"
                                />
                                <InputError message={errors.contact_email} />
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="contact_phone">Contact Phone</Label>
                                <Input
                                    id="contact_phone"
                                    type="text"
                                    value={data.contact_phone}
                                    onChange={(e) => setData('contact_phone', e.target.value)}
                                    aria-invalid={!!errors.contact_phone}
                                    placeholder="Enter contact phone (optional)"
                                />
                                <InputError message={errors.contact_phone} />
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
                            <div className="mb-4 flex items-center gap-3">
                                <Checkbox
                                    id="is_sales_generating"
                                    checked={data.is_sales_generating}
                                    onCheckedChange={(checked) => setData('is_sales_generating', checked === true)}
                                />
                                <Label htmlFor="is_sales_generating">Is Sales Generating</Label>
                            </div>
                            <div className="mb-6 flex items-center gap-3 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                                <Checkbox
                                    id="is_pre_order_branch"
                                    checked={data.is_pre_order_branch}
                                    onCheckedChange={(checked) => setData('is_pre_order_branch', checked === true)}
                                />
                                <div>
                                    <Label htmlFor="is_pre_order_branch" className="font-semibold cursor-pointer">
                                        Pre-Order Branch
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Tick this box if this branch handles pre-order pickups and collection.
                                    </p>
                                </div>
                            </div>
                            <Label>Select Departments</Label>
                            <div className="my-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                    {departments.map((department) => (
                                        <div key={department} className="flex items-center gap-3">
                                            <Checkbox
                                                id={department}
                                                checked={data.departments.includes(department)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setData('departments', [...data.departments, department]);
                                                    } else {
                                                        setData(
                                                            'departments',
                                                            data.departments.filter((d) => d !== department),
                                                        );
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={department}>{department}</Label>
                                        </div>
                                    ))}
                                </div>
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