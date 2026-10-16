import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/assessments' },
	{ title: 'Assessments', href: '/training/td-kpi/assessments' },
	{ title: 'Create', href: '/training/td-kpi/assessments/create' },
];

type Option = { id: number; name: string };

export default function AssessmentCreate({ trainingModules = [] }: { trainingModules: Option[] }) {
	const sortedModules = useMemo(
		() => [...trainingModules].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
		[trainingModules],
	);

	const { data, setData, post, processing, errors } = useForm({
		assessment_name: '',
		training_module_id: '',
		randomization_questions_number: '1',
		status: 'active',
	});

	function submit(e: React.FormEvent) {
		e.preventDefault();
		post('/training/td-kpi/assessments');
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Create Assessment" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Create Assessment</CardTitle>
						<CardAction>
							<Link href="/training/td-kpi/assessments">
								<Button variant="outline">Go Back</Button>
							</Link>
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent className="pt-6">
						<form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
							<div>
								<Label htmlFor="assessment_name">Assessment Name</Label>
								<Input
									id="assessment_name"
									value={data.assessment_name}
									onChange={(e) => setData('assessment_name', e.target.value)}
								/>
								<InputError message={errors.assessment_name} />
							</div>
							<div>
								<Label>Training Module</Label>
								<SearchableSelect
									options={sortedModules}
									value={data.training_module_id}
									onValueChange={(value) => setData('training_module_id', value)}
									placeholder="Select training module"
									searchPlaceholder="Search modules..."
									emptyText="No modules found."
								/>
								<InputError message={errors.training_module_id} />
							</div>
							<div>
								<Label htmlFor="randomization_questions_number">Randomization Questions Number</Label>
								<Input
									id="randomization_questions_number"
									type="number"
									min={1}
									value={data.randomization_questions_number}
									onChange={(e) => setData('randomization_questions_number', e.target.value)}
								/>
								<InputError message={errors.randomization_questions_number} />
							</div>
							<div>
								<Label htmlFor="status">Status</Label>
								<Select value={data.status} onValueChange={(value) => setData('status', value)}>
									<SelectTrigger id="status">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
									</SelectContent>
								</Select>
								<InputError message={errors.status} />
							</div>
							<div className="flex justify-end gap-2">
								<Link href="/training/td-kpi/assessments">
									<Button type="button" variant="outline">
										Cancel
									</Button>
								</Link>
								<Button type="submit" disabled={processing}>
									Save
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}
