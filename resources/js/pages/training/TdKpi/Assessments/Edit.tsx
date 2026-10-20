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
import { useMemo, useState } from 'react';

type Option = { id: number; name: string };

type AssessmentForm = {
	id: number;
	assessment_name: string;
	training_module_id: number;
	randomization_questions_number: number;
	status: string;
	questions_count: number;
};

export default function AssessmentEdit({
	assessment,
	trainingModules = [],
}: {
	assessment: AssessmentForm;
	trainingModules: Option[];
}) {
	const breadcrumbs: BreadcrumbItem[] = [
		{ title: 'TD KPI', href: '/training/td-kpi/assessments' },
		{ title: 'Assessments', href: '/training/td-kpi/assessments' },
		{ title: 'Edit', href: `/training/td-kpi/assessments/${assessment.id}/edit` },
	];

	const sortedModules = useMemo(
		() => [...trainingModules].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
		[trainingModules],
	);

	const questionsCount = assessment.questions_count ?? 0;
	const [clientError, setClientError] = useState('');

	const { data, setData, put, processing, errors } = useForm({
		assessment_name: assessment.assessment_name,
		training_module_id: String(assessment.training_module_id),
		randomization_questions_number: String(assessment.randomization_questions_number),
		status: assessment.status,
	});

	function validateRandomCount(value: string): string {
		const number = Number(value);
		if (!value || Number.isNaN(number) || number < 1) {
			return 'Randomization questions number must be at least 1.';
		}
		if (number > questionsCount) {
			return `Randomization questions number cannot exceed the number of active questions for this assessment (${questionsCount}).`;
		}
		return '';
	}

	function onRandomCountChange(value: string) {
		setData('randomization_questions_number', value);
		setClientError(validateRandomCount(value));
	}

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const message = validateRandomCount(data.randomization_questions_number);
		if (message) {
			setClientError(message);
			return;
		}
		put(`/training/td-kpi/assessments/${assessment.id}`);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Edit Assessment" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Edit Assessment</CardTitle>
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
									max={Math.max(questionsCount, 1)}
									value={data.randomization_questions_number}
									onChange={(e) => onRandomCountChange(e.target.value)}
								/>
								<p className="mt-1 text-xs text-muted-foreground">
									Active questions for this assessment: {questionsCount}
								</p>
								<InputError message={clientError || errors.randomization_questions_number} />
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
								<Button type="submit" disabled={processing || !!clientError}>
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
