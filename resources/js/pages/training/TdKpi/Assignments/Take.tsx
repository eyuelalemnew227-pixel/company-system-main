import InputError from '@/components/input-error';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePopup } from '@/hooks/use-popup';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Choice = { label: string; value: string };

type TakeQuestion = {
	id: number;
	question_id: number | null;
	label: string | null;
	type_identifier: string;
	choices: Choice[];
	response: string | string[] | null;
	is_correct?: boolean | null;
};

type AssignmentMeta = {
	id: number;
	submitted: boolean;
	submitted_at: string | null;
	post_assessment_score: number | null;
	employee_name: string;
	employee_code: string | null;
	branch: string | null;
	department: string | null;
	training_type: string | null;
	assigned_training_content: string | null;
	proposed_training_date: string | null;
	is_training_held: boolean;
	attendance: boolean;
	assessment_name: string | null;
	fiscal_year_name: string | null;
	fiscal_month_name: string | null;
};

type PageProps = {
	assignment: AssignmentMeta;
	questions: TakeQuestion[];
};

function yesNo(value: boolean) {
	return value ? 'Yes' : 'No';
}

function isMultiType(type: string) {
	return type === 'select_multiple' || type === 'checkbox';
}

function MetaItem({ label, value }: { label: string; value: string | number | null | undefined | JSX.Element }) {
	return (
		<div>
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-sm font-medium">{value || '—'}</p>
		</div>
	);
}

export default function TakeAssessment({ assignment, questions }: PageProps) {
	const { flash, errors } = usePage<{
		flash: { message?: string; error?: string };
		errors: Record<string, string>;
	}>().props;
	const { triggerPopup, PopupComponent } = usePopup();
	const readOnly = assignment.submitted;
	const [confirmOpen, setConfirmOpen] = useState(false);

	const initialResponses = questions.map((q) => ({
		id: q.id,
		value: isMultiType(q.type_identifier)
			? Array.isArray(q.response)
				? q.response
				: []
			: typeof q.response === 'string'
				? q.response
				: '',
	}));

	const { data, setData, post, processing } = useForm<{
		responses: Array<{ id: number; value: string | string[] }>;
	}>({
		responses: initialResponses,
	});

	const breadcrumbs: BreadcrumbItem[] = [
		{ title: 'TD KPI', href: '/training/td-kpi/assignments' },
		{ title: 'Assignments', href: '/training/td-kpi/assignments' },
		{ title: assignment.assessment_name || 'Take Assessment', href: `/training/td-kpi/assignments/${assignment.id}/take` },
	];

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (flash?.error) triggerPopup('Error', flash.error, 'error');
	}, [flash, triggerPopup]);

	function getResponse(questionId: number) {
		return data.responses.find((r) => r.id === questionId);
	}

	function setResponseValue(questionId: number, value: string | string[]) {
		setData(
			'responses',
			data.responses.map((r) => (r.id === questionId ? { ...r, value } : r)),
		);
	}

	function toggleMultiValue(questionId: number, choiceValue: string, checked: boolean) {
		const current = getResponse(questionId);
		const existing = Array.isArray(current?.value) ? [...current.value] : [];
		const next = checked ? [...existing.filter((v) => v !== choiceValue), choiceValue] : existing.filter((v) => v !== choiceValue);
		setResponseValue(questionId, next);
	}

	function submitAssessment() {
		post(`/training/td-kpi/assignments/${assignment.id}/submit`, {
			preserveScroll: true,
			onFinish: () => setConfirmOpen(false),
		});
	}

	function renderQuestionInput(question: TakeQuestion) {
		const type = question.type_identifier;
		const response = getResponse(question.id);
		const disabled = readOnly;

		if (type === 'select_one' || type === 'radio') {
			const value = typeof response?.value === 'string' ? response.value : '';
			return (
				<Select
					value={value || undefined}
					onValueChange={(v) => setResponseValue(question.id, v)}
					disabled={disabled}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select an answer" />
					</SelectTrigger>
					<SelectContent>
						{question.choices.map((choice) => (
							<SelectItem key={choice.value} value={choice.value}>
								{choice.label || choice.value}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		}

		if (type === 'select_multiple' || type === 'checkbox') {
			const selected = Array.isArray(response?.value) ? response.value : [];
			return (
				<div className="space-y-2">
					{question.choices.map((choice) => {
						const checked = selected.includes(choice.value);
						return (
							<label key={choice.value} className="flex items-center gap-2 text-sm">
								<Checkbox
									checked={checked}
									disabled={disabled}
									onCheckedChange={(state) => toggleMultiValue(question.id, choice.value, state === true)}
								/>
								<span>{choice.label || choice.value}</span>
							</label>
						);
					})}
				</div>
			);
		}

		if (type === 'textarea' || type === 'long_text') {
			return (
				<Textarea
					value={typeof response?.value === 'string' ? response.value : ''}
					onChange={(e) => setResponseValue(question.id, e.target.value)}
					disabled={disabled}
					rows={4}
				/>
			);
		}

		if (type === 'number') {
			return (
				<Input
					type="number"
					value={typeof response?.value === 'string' ? response.value : ''}
					onChange={(e) => setResponseValue(question.id, e.target.value)}
					disabled={disabled}
				/>
			);
		}

		return (
			<Input
				type="text"
				value={typeof response?.value === 'string' ? response.value : ''}
				onChange={(e) => setResponseValue(question.id, e.target.value)}
				disabled={disabled}
			/>
		);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title={assignment.assessment_name || 'Take Assessment'} />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-xl font-semibold">{assignment.assessment_name || 'Assessment'}</h1>
						<p className="text-sm text-muted-foreground">
							{readOnly ? 'Submitted assessment (read-only)' : 'Complete and submit this assessment'}
						</p>
					</div>
					<Button variant="outline" asChild>
						<Link href="/training/td-kpi/assignments">Back to Assignments</Link>
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Assignment details</CardTitle>
					</CardHeader>
					<hr />
					<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<MetaItem
							label="Employee"
							value={
								<>
									{assignment.employee_name || '—'}
									{assignment.employee_code ? (
										<span className="block text-xs font-normal text-muted-foreground">{assignment.employee_code}</span>
									) : null}
								</>
							}
						/>
						<MetaItem label="Branch" value={assignment.branch} />
						<MetaItem label="Department" value={assignment.department} />
						<MetaItem label="Training Type" value={assignment.training_type} />
						<MetaItem label="Assigned Training Content" value={assignment.assigned_training_content} />
						<MetaItem label="Proposed Training Date" value={assignment.proposed_training_date} />
						<MetaItem label="Is Training Held" value={yesNo(assignment.is_training_held)} />
						<MetaItem label="Attendance" value={yesNo(assignment.attendance)} />
						<MetaItem label="Assessment" value={assignment.assessment_name} />
						<MetaItem
							label="Fiscal Period"
							value={[assignment.fiscal_year_name, assignment.fiscal_month_name].filter(Boolean).join(' / ') || null}
						/>
						{readOnly && (
							<>
								<MetaItem
									label="Post Assessment Score"
									value={
										assignment.post_assessment_score !== null && assignment.post_assessment_score !== undefined
											? `${Number(assignment.post_assessment_score).toFixed(1)}%`
											: '—'
									}
								/>
								<MetaItem label="Submitted At" value={assignment.submitted_at} />
							</>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Questions</CardTitle>
					</CardHeader>
					<hr />
					<CardContent className="space-y-6">
						{questions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No active questions available for this assessment. Add questions under TD KPI → Questions.
							</p>
						) : (
							questions.map((question, index) => (
								<div key={question.id} className="space-y-2 rounded-md border p-4">
									<div className="flex flex-wrap items-start justify-between gap-2">
										<Label className="text-base font-medium">
											{index + 1}. {question.label || 'Untitled question'}
										</Label>
										{readOnly && question.is_correct !== null && question.is_correct !== undefined && (
											<span
												className={`text-xs font-medium ${question.is_correct ? 'text-green-600' : 'text-red-600'}`}
											>
												{question.is_correct ? 'Correct' : 'Incorrect'}
											</span>
										)}
									</div>
									{renderQuestionInput(question)}
								</div>
							))
						)}

						<InputError message={errors.submit || errors.responses} />

						<div className="flex flex-wrap gap-2">
							{!readOnly && questions.length > 0 && (
								<Button type="button" onClick={() => setConfirmOpen(true)} disabled={processing}>
									Submit
								</Button>
							)}
							<Button variant="outline" asChild>
								<Link href="/training/td-kpi/assignments">Cancel</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Submit this assessment?</AlertDialogTitle>
						<AlertDialogDescription>
							You cannot change answers after submitting. Please confirm you are ready to submit.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								submitAssessment();
							}}
							disabled={processing}
						>
							{processing ? 'Submitting…' : 'Confirm & Submit'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<PopupComponent />
		</AppLayout>
	);
}
