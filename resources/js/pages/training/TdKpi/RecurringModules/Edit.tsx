import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';

type Option = { id: number; name: string };

type ModuleForm = {
	id: number;
	training_name: string;
	description: string;
	conducting_department_id: number;
	trainer_employee_id: number;
	targeted_department_id: number | null;
};

function sortByName(options: Option[]) {
	return [...options].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export default function RecurringModuleEdit({
	module,
	departments = [],
	employees = [],
}: {
	module: ModuleForm;
	departments: Option[];
	employees: Option[];
}) {
	const breadcrumbs: BreadcrumbItem[] = [
		{ title: 'TD KPI', href: '/training/td-kpi/recurring-modules' },
		{ title: 'Recurring Modules', href: '/training/td-kpi/recurring-modules' },
		{ title: 'Edit', href: `/training/td-kpi/recurring-modules/${module.id}/edit` },
	];

	const sortedDepartments = useMemo(() => sortByName(departments), [departments]);
	const sortedEmployees = useMemo(() => sortByName(employees), [employees]);

	const { data, setData, put, processing, errors } = useForm({
		training_name: module.training_name,
		description: module.description ?? '',
		conducting_department_id: String(module.conducting_department_id),
		trainer_employee_id: String(module.trainer_employee_id),
		targeted_department_id: module.targeted_department_id ? String(module.targeted_department_id) : 'all',
	});

	function submit(e: React.FormEvent) {
		e.preventDefault();
		put(`/training/td-kpi/recurring-modules/${module.id}`);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Edit Recurring Training Module" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Edit Recurring Training Module</CardTitle>
						<CardAction>
							<Link href="/training/td-kpi/recurring-modules">
								<Button variant="outline">Go Back</Button>
							</Link>
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent className="pt-6">
						<form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
							<div>
								<Label htmlFor="training_name">Training Name</Label>
								<Input
									id="training_name"
									value={data.training_name}
									onChange={(e) => setData('training_name', e.target.value)}
								/>
								<InputError message={errors.training_name} />
							</div>
							<div>
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									value={data.description}
									onChange={(e) => setData('description', e.target.value)}
									rows={4}
								/>
								<InputError message={errors.description} />
							</div>
							<div>
								<Label>Conducting Department</Label>
								<SearchableSelect
									options={sortedDepartments}
									value={data.conducting_department_id}
									onValueChange={(value) => setData('conducting_department_id', value)}
									placeholder="Select department"
									searchPlaceholder="Search departments..."
									emptyText="No departments found."
								/>
								<InputError message={errors.conducting_department_id} />
							</div>
							<div>
								<Label>Trainer Employee</Label>
								<SearchableSelect
									options={sortedEmployees}
									value={data.trainer_employee_id}
									onValueChange={(value) => setData('trainer_employee_id', value)}
									placeholder="Select trainer"
									searchPlaceholder="Search employees..."
									emptyText="No employees found."
								/>
								<InputError message={errors.trainer_employee_id} />
							</div>
							<div>
								<Label>Targeted Department</Label>
								<SearchableSelect
									options={sortedDepartments}
									value={data.targeted_department_id}
									onValueChange={(value) => setData('targeted_department_id', value)}
									placeholder="All departments"
									searchPlaceholder="Search departments..."
									emptyText="No departments found."
									allowAll
									allLabel="All"
									allValue="all"
								/>
								<p className="mt-1 text-xs text-muted-foreground">Defaults to all departments.</p>
								<InputError message={errors.targeted_department_id} />
							</div>
							<div className="flex justify-end gap-2">
								<Link href="/training/td-kpi/recurring-modules">
									<Button type="button" variant="outline">
										Cancel
									</Button>
								</Link>
								<Button type="submit" disabled={processing}>
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
