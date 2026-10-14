import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
	type TdKpiInputTypeOption,
	type TdKpiQuestion,
	type TdKpiRoleOption,
} from '@/types/td-kpi-question';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import { QuestionFormFields } from './QuestionFormFields';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/questions' },
	{ title: 'Questions', href: '/training/td-kpi/questions' },
	{ title: 'Edit Question', href: '/training/td-kpi/questions' },
];

export default function EditTdKpiQuestion({
	question,
	kpiRoles,
	formInputTypes,
}: {
	question: TdKpiQuestion;
	kpiRoles: TdKpiRoleOption[];
	formInputTypes: TdKpiInputTypeOption[];
}) {
	const { data, setData, put, errors, processing } = useForm({
		label: question.label || '',
		kpi_role_id: question.kpi_role_id ? String(question.kpi_role_id) : '',
		form_input_type_id: question.form_input_type_id ? String(question.form_input_type_id) : '',
		status: question.status || 'active',
		choices: (question.choices ?? []).map((choice) => ({
			label: choice.label,
			value: choice.value,
		})),
	});

	function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		put(`/training/td-kpi/questions/${question.id}`);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Edit TD KPI Question" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Edit TD KPI Question</CardTitle>
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
