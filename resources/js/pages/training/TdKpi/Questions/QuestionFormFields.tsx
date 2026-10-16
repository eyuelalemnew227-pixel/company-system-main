import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	type TdKpiAssessmentOption,
	type TdKpiInputTypeOption,
	type TdKpiQuestionChoice,
} from '@/types/td-kpi-question';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

export function inputTypeNeedsChoices(typeIdentifier?: string | null): boolean {
	if (!typeIdentifier) return false;
	return (
		typeIdentifier.includes('select') ||
		typeIdentifier === 'radio' ||
		typeIdentifier === 'checkbox' ||
		typeIdentifier === 'employee_evaluation_grid'
	);
}

export function inputTypeRequiresAnswer(typeIdentifier?: string | null): boolean {
	if (!typeIdentifier) return false;
	return (
		typeIdentifier === 'select_one' ||
		typeIdentifier === 'select_multiple' ||
		typeIdentifier === 'radio' ||
		typeIdentifier === 'checkbox'
	);
}

type QuestionFormData = {
	label: string;
	assessment_id: string;
	form_input_type_id: string;
	answer: string;
	status: string;
	choices: TdKpiQuestionChoice[];
};

type QuestionFormFieldsProps = {
	data: QuestionFormData;
	setData: <K extends keyof QuestionFormData>(key: K, value: QuestionFormData[K]) => void;
	errors: Partial<Record<string, string>>;
	assessments: TdKpiAssessmentOption[];
	formInputTypes: TdKpiInputTypeOption[];
};

export function QuestionFormFields({
	data,
	setData,
	errors,
	assessments,
	formInputTypes,
}: QuestionFormFieldsProps) {
	const selectedType = formInputTypes.find((type) => String(type.id) === data.form_input_type_id);
	const showChoices = inputTypeNeedsChoices(selectedType?.type_identifier);
	const answerRequired = inputTypeRequiresAnswer(selectedType?.type_identifier);

	const sortedAssessments = useMemo(
		() => [...assessments].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
		[assessments],
	);

	function handleInputTypeChange(value: string) {
		const nextType = formInputTypes.find((type) => String(type.id) === value);
		setData('form_input_type_id', value);

		if (inputTypeNeedsChoices(nextType?.type_identifier)) {
			if (!data.choices.length) {
				setData('choices', [{ label: 'Option 1', value: 'option_1' }]);
			}
		} else {
			setData('choices', []);
		}
	}

	function updateChoice(index: number, field: 'label' | 'value', value: string) {
		const next = data.choices.map((choice, choiceIndex) =>
			choiceIndex === index ? { ...choice, [field]: value } : choice,
		);
		setData('choices', next);
	}

	function addChoice() {
		const nextIndex = data.choices.length + 1;
		setData('choices', [...data.choices, { label: `Option ${nextIndex}`, value: `option_${nextIndex}` }]);
	}

	function removeChoice(index: number) {
		setData(
			'choices',
			data.choices.filter((_, choiceIndex) => choiceIndex !== index),
		);
	}

	return (
		<>
			<div className="mb-4">
				<Label htmlFor="label">Question Label</Label>
				<Textarea
					id="label"
					value={data.label}
					onChange={(e) => setData('label', e.target.value)}
					aria-invalid={!!errors.label}
					placeholder="Enter question label"
					rows={4}
				/>
				<InputError message={errors.label} />
			</div>

			<div className="mb-4">
				<Label>Assessment</Label>
				<SearchableSelect
					options={sortedAssessments}
					value={data.assessment_id}
					onValueChange={(value) => setData('assessment_id', value)}
					placeholder="Select assessment"
					searchPlaceholder="Search assessments..."
					emptyText="No assessments found."
				/>
				<InputError message={errors.assessment_id} />
			</div>

			<div className="mb-4">
				<Label htmlFor="form_input_type_id">Input Type</Label>
				<Select value={data.form_input_type_id} onValueChange={handleInputTypeChange}>
					<SelectTrigger id="form_input_type_id">
						<SelectValue placeholder="Select input type" />
					</SelectTrigger>
					<SelectContent>
						{formInputTypes.map((type) => (
							<SelectItem key={type.id} value={String(type.id)}>
								{type.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<InputError message={errors.form_input_type_id} />
			</div>

			{showChoices && (
				<div className="mb-4 space-y-3 rounded-lg border p-4">
					<div className="flex items-center justify-between">
						<Label>Choices</Label>
						<Button type="button" variant="outline" size="sm" onClick={addChoice}>
							<Plus className="mr-1 size-4" /> Add Choice
						</Button>
					</div>
					{data.choices.map((choice, index) => (
						<div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
							<Input
								value={choice.label}
								onChange={(e) => updateChoice(index, 'label', e.target.value)}
								placeholder="Choice label"
							/>
							<Input
								value={choice.value}
								onChange={(e) => updateChoice(index, 'value', e.target.value)}
								placeholder="Choice value"
							/>
							<Button type="button" variant="ghost" size="icon" onClick={() => removeChoice(index)}>
								<Trash2 className="size-4 text-red-600" />
							</Button>
						</div>
					))}
					<InputError message={errors.choices} />
				</div>
			)}

			<div className="mb-4">
				<Label htmlFor="answer">
					Answer {answerRequired ? <span className="text-red-600">*</span> : <span className="text-muted-foreground">(optional)</span>}
				</Label>
				{showChoices && data.choices.some((c) => c.value) ? (
					selectedType?.type_identifier === 'select_multiple' || selectedType?.type_identifier === 'checkbox' ? (
						<>
							<Input
								id="answer"
								value={data.answer}
								onChange={(e) => setData('answer', e.target.value)}
								placeholder="Enter correct choice value(s), comma-separated for multiple"
							/>
							<p className="mt-1 text-xs text-muted-foreground">
								For multiple answers, enter choice values separated by commas.
							</p>
						</>
					) : (
						<Select value={data.answer || undefined} onValueChange={(value) => setData('answer', value)}>
							<SelectTrigger id="answer">
								<SelectValue placeholder="Select correct answer" />
							</SelectTrigger>
							<SelectContent>
								{data.choices
									.filter((choice) => choice.value)
									.map((choice, index) => (
										<SelectItem key={`${choice.value}-${index}`} value={choice.value}>
											{choice.label || choice.value}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					)
				) : (
					<Input
						id="answer"
						value={data.answer}
						onChange={(e) => setData('answer', e.target.value)}
						placeholder={answerRequired ? 'Enter the correct answer' : 'Optional answer'}
					/>
				)}
				<InputError message={errors.answer} />
			</div>

			<div className="mb-4">
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
		</>
	);
}
