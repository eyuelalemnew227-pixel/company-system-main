import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type TdKpiInputTypeOption, type TdKpiRoleOption } from '@/types/td-kpi-question';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import { QuestionFormFields } from './QuestionFormFields';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/questions' },
	{ title: 'Questions', href: '/training/td-kpi/questions' },
	{ title: 'Create Question', href: '/training/td-kpi/questions/create' },
];

export default function CreateTdKpiQuestion({
	kpiRoles,
	formInputTypes,
}: {
	kpiRoles: TdKpiRoleOption[];
	formInputTypes: TdKpiInputTypeOption[];
}) {
	const { data, setData, post, errors, processing } = useForm({
		label: '',
		kpi_role_id: '',
		form_input_type_id: '',
		status: 'active',
		choices: [] as Array<{ label: string; value: string }>,
	});

	function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		post('/training/td-kpi/questions');
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Create TD KPI Question" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Create TD KPI Question</CardTitle>
						<CardAction>
							<Link href="/training/td-kpi/questions">
								<Button variant="default">Go Back</Button>
							</Link>
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent>
						<form onSubmit={submit}>
							<QuestionFormFields
								data={data}
								setData={setData}
								errors={errors}
								kpiRoles={kpiRoles}
								formInputTypes={formInputTypes}
							/>
							<div className="flex justify-end">
								<Button size="lg" type="submit" disabled={processing}>
									Create
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}
