import CategorizedPermissionSelector from '@/components/CategorizedPermissionSelector';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { GroupedPermissions } from '@/types/role_permission';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Create Role',
		href: '/roles/create',
	},
];

export default function CreateRoles({
	permissions,
	groupedPermissions,
}: {
	permissions: string[];
	groupedPermissions?: GroupedPermissions;
}) {
	const { data, setData, post, errors, processing } = useForm({
		name: '',
		permissions: [] as string[],
	});

	function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		post('/roles');
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Create Role" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<div>
							<CardTitle>Create New Role</CardTitle>
							<p className="mt-1 text-xs text-muted-foreground">
								Define a new role and grant categorized access permissions to application modules.
							</p>
						</div>
						<CardAction>
							<Link href={'/roles'}>
								<Button variant={'outline'}>Go Back</Button>
							</Link>
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent className="pt-4">
						<form onSubmit={submit} className="space-y-6">
							<div className="max-w-md">
								<Label htmlFor="name" className="font-semibold">
									Role Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="name"
									type="text"
									value={data.name}
									onChange={(e) => setData('name', e.target.value)}
									placeholder="e.g. Finance Manager, Support Lead, Inventory Auditor"
									aria-invalid={!!errors.name}
									className="mt-1.5"
								/>
								<InputError message={errors.name} />
							</div>

							<div className="space-y-2">
								<Label className="text-base font-semibold">Assign Categorized Module Permissions</Label>
								<CategorizedPermissionSelector
									allPermissions={permissions}
									groupedPermissions={groupedPermissions}
									selectedPermissions={data.permissions}
									onChange={(newPermissions) => setData('permissions', newPermissions)}
								/>
								<InputError message={errors.permissions} />
							</div>

							<div className="flex justify-end pt-4">
								<Button size={'lg'} type="submit" disabled={processing}>
									Create Role
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}
