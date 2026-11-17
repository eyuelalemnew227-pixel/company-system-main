import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePopup } from '@/hooks/use-popup';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type TdKpiAssignmentRow, type TdKpiOption } from '@/types/td-kpi-assignment';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { StickyNote } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/assignments' },
	{ title: 'Assignments', href: '/training/td-kpi/assignments' },
];

type PageProps = {
	rows: {
		data: TdKpiAssignmentRow[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
	trainingTypes: TdKpiOption[];
	trainingModules: TdKpiOption[];
	request?: {
		search?: string;
		training_type_id?: string;
	};
};

function yesNo(value: boolean) {
	return value ? 'Yes' : 'No';
}

function sameAsProposed(row: TdKpiAssignmentRow) {
	return Boolean(
		row.proposed_training_start_at_input &&
			row.proposed_training_end_at_input &&
			row.actual_training_start_at_input &&
			row.actual_training_end_at_input &&
			row.proposed_training_start_at_input === row.actual_training_start_at_input &&
			row.proposed_training_end_at_input === row.actual_training_end_at_input,
	);
}

function NoteCell({ row }: { row: TdKpiAssignmentRow }) {
	const [open, setOpen] = useState(false);
	const extra = row.note.extra_info?.trim() ? row.note.extra_info : '—';

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
					aria-label="View note"
					onMouseEnter={() => setOpen(true)}
					onClick={() => setOpen(true)}
				>
					<StickyNote className="h-4 w-4" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-72 space-y-2 text-sm"
				onMouseEnter={() => setOpen(true)}
				onMouseLeave={() => setOpen(false)}
			>
				<div>
					<div className="text-xs font-medium uppercase text-muted-foreground">From</div>
					<div>{row.note.from || '—'}</div>
				</div>
				<div>
					<div className="text-xs font-medium uppercase text-muted-foreground">Proposed date</div>
					<div>{row.note.proposed_date || '—'}</div>
				</div>
				<div>
					<div className="text-xs font-medium uppercase text-muted-foreground">Training module</div>
					<div>{row.note.module || '—'}</div>
				</div>
				<div>
					<div className="text-xs font-medium uppercase text-muted-foreground">Extra info</div>
					<div className="whitespace-pre-wrap">{extra}</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default function AssignmentsIndex({
	rows,
	trainingTypes = [],
	trainingModules = [],
	request,
}: PageProps) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;
	const { triggerPopup, PopupComponent } = usePopup();
	const { can } = usePermission();
	const [search, setSearch] = useState(request?.search ?? '');
	const [editRow, setEditRow] = useState<TdKpiAssignmentRow | null>(null);
	const [changeOpen, setChangeOpen] = useState(false);

	const sortedTypes = useMemo(
		() => [...trainingTypes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
		[trainingTypes],
	);
	const sortedModules = useMemo(
		() => [...trainingModules].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
		[trainingModules],
	);

	const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
		evaluation_result_override_id: '',
		training_request_id: '',
		training_type_id: '',
		assigned_training_content_id: '',
		proposed_training_start_at: '',
		proposed_training_end_at: '',
		is_training_held: false as boolean,
		attendance: false as boolean,
		actual_source: '' as '' | 'same' | 'different',
		actual_training_start_at: '',
		actual_training_end_at: '',
	});

	const hasTrainingContent = Boolean(data.assigned_training_content_id);
	const hasProposedDatetime = Boolean(data.proposed_training_start_at && data.proposed_training_end_at);
	const contentLocked = Boolean(editRow?.content_locked);
	const attendanceLocked = Boolean(editRow?.attendance_locked);
	const proposedLocked = Boolean(editRow?.proposed_training_start_at_input && editRow?.proposed_training_end_at_input);
	const heldEnabled = hasTrainingContent && hasProposedDatetime && !contentLocked;
	const attendanceEnabled = data.is_training_held && !attendanceLocked;

	const changeRequest = useForm({
		evaluation_result_override_id: '',
		training_request_id: '',
		requested_proposed_start_at: '',
		requested_proposed_end_at: '',
		reason: '',
	});

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (flash?.error) triggerPopup('Error', flash.error, 'error');
	}, [flash, triggerPopup]);

	function handleSearch() {
		const params: Record<string, string> = {};
		if (search) params.search = search;
		router.get('/training/td-kpi/assignments', params, { preserveState: true, replace: true });
	}

	function openEdit(row: TdKpiAssignmentRow) {
		clearErrors();
		setEditRow(row);
		setData({
			evaluation_result_override_id: row.override_id ? String(row.override_id) : '',
			training_request_id: row.training_request_id ? String(row.training_request_id) : '',
			training_type_id: row.training_type_id ? String(row.training_type_id) : '',
			assigned_training_content_id: row.assigned_training_content_id
				? String(row.assigned_training_content_id)
				: '',
			proposed_training_start_at: row.proposed_training_start_at_input ?? '',
			proposed_training_end_at: row.proposed_training_end_at_input ?? '',
			is_training_held: row.is_training_held,
			attendance: row.attendance,
			actual_source: row.is_training_held ? (sameAsProposed(row) ? 'same' : 'different') : '',
			actual_training_start_at: sameAsProposed(row) ? '' : (row.actual_training_start_at_input ?? ''),
			actual_training_end_at: sameAsProposed(row) ? '' : (row.actual_training_end_at_input ?? ''),
		});
	}

	function closeEdit() {
		setEditRow(null);
		setChangeOpen(false);
		reset();
		clearErrors();
		changeRequest.reset();
		changeRequest.clearErrors();
	}

	function openChangeRequest() {
		if (
			!editRow ||
			!proposedLocked ||
			data.is_training_held ||
			editRow.proposed_date_change_pending ||
			!editRow.proposed_date_change_open
		) {
			return;
		}
		changeRequest.clearErrors();
		changeRequest.setData({
			evaluation_result_override_id: editRow.override_id ? String(editRow.override_id) : '',
			training_request_id: editRow.training_request_id ? String(editRow.training_request_id) : '',
			requested_proposed_start_at: '',
			requested_proposed_end_at: '',
			reason: '',
		});
		setChangeOpen(true);
	}

	function submitChangeRequest(e: React.FormEvent) {
		e.preventDefault();
		changeRequest.post('/training/td-kpi/assignments/proposed-date-requests', {
			preserveScroll: true,
			onSuccess: () => {
				setChangeOpen(false);
				closeEdit();
			},
		});
	}

	function onTrainingContentChange(value: string) {
		if (contentLocked) return;
		const contentId = value === 'none' ? '' : value;
		if (!contentId) {
			setData({
				...data,
				assigned_training_content_id: '',
				is_training_held: false,
				attendance: false,
				actual_source: '',
				actual_training_start_at: '',
				actual_training_end_at: '',
			});
			return;
		}
		setData('assigned_training_content_id', contentId);
	}

	function onHeldChange(held: boolean) {
		if (!held) {
			setData({
				...data,
				is_training_held: false,
				actual_source: '',
				actual_training_start_at: '',
				actual_training_end_at: '',
			});
			return;
		}
		setData({
			...data,
			is_training_held: true,
			actual_source: data.actual_source || 'same',
		});
	}

	function submitEdit(e: React.FormEvent) {
		e.preventDefault();
		if (!data.proposed_training_start_at || !data.proposed_training_end_at) return;
		put('/training/td-kpi/assignments/upsert', {
			preserveScroll: true,
			onSuccess: () => closeEdit(),
		});
	}

	const canEdit = can('training.td_kpi.assignments.create') || can('training.td_kpi.assignments.view');

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="TD KPI Assignments" />
			<div className="flex h-full flex-1 flex-col overflow-x-auto rounded-xl p-4">
				<Card className="gap-2 py-3">
					<CardHeader className="gap-1">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<CardTitle>Assignments</CardTitle>
							<form
								className="flex gap-2"
								onSubmit={(e) => {
									e.preventDefault();
									handleSearch();
								}}
							>
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search employee..."
									className="max-w-xs"
								/>
								<Button type="submit" variant="outline">
									Search
								</Button>
							</form>
						</div>
						<p className="text-sm text-muted-foreground">
							Employees flagged for training from Evaluation Results or Training Requests. Set training
							start/end times and training content, then mark held/attendance to generate assessments.
						</p>
					</CardHeader>
					<hr />
					<CardContent>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader className="bg-slate-500 dark:bg-slate-700">
									<TableRow>
										<TableHead className="font-bold text-white">Name</TableHead>
										<TableHead className="font-bold text-white">Branch</TableHead>
										<TableHead className="font-bold text-white">Department</TableHead>
										<TableHead className="font-bold text-white">Training Type</TableHead>
										<TableHead className="font-bold text-white">Assigned Training Content</TableHead>
										<TableHead className="font-bold text-white">Proposed training date</TableHead>
										<TableHead className="font-bold text-white">Is Training Held</TableHead>
										<TableHead className="font-bold text-white">Attendance</TableHead>
										<TableHead className="font-bold text-white">Assessment Name</TableHead>
										<TableHead className="font-bold text-white">Score (%)</TableHead>
										<TableHead className="font-bold text-white">Note</TableHead>
										<TableHead className="font-bold text-white">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.data.map((row) => (
										<TableRow
											key={row.row_key}
											className="odd:bg-slate-100 dark:odd:bg-slate-800"
										>
											<TableCell>
												<div className="font-medium">{row.employee_name || '—'}</div>
												<div className="text-xs text-muted-foreground">{row.employee_code}</div>
											</TableCell>
											<TableCell>{row.branch || '—'}</TableCell>
											<TableCell>{row.department || '—'}</TableCell>
											<TableCell>{row.training_type || '—'}</TableCell>
											<TableCell>{row.assigned_training_content || '—'}</TableCell>
											<TableCell>
												<div className="whitespace-nowrap text-sm">
													<div>Start: {row.proposed_training_start_at || '—'}</div>
													<div>End: {row.proposed_training_end_at || '—'}</div>
												</div>
											</TableCell>
											<TableCell>
												<div>{yesNo(row.is_training_held)}</div>
												{row.is_training_held && (row.actual_training_start_at || row.actual_training_end_at) && (
													<div
														className={
															row.actual_date_differs
																? 'text-xs font-medium text-red-600 dark:text-red-400'
																: 'text-xs text-muted-foreground'
														}
													>
														<div>Start: {row.actual_training_start_at || '—'}</div>
														<div>End: {row.actual_training_end_at || '—'}</div>
													</div>
												)}
											</TableCell>
											<TableCell>{yesNo(row.attendance)}</TableCell>
											<TableCell>
												{row.assignment_id && row.assessment_id && row.assessment_name ? (
													<Link
														href={`/training/td-kpi/assignments/${row.assignment_id}/take`}
														className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
													>
														{row.assessment_name}
													</Link>
												) : (
													row.assessment_name || '—'
												)}
											</TableCell>
											<TableCell>
												{row.post_assessment_score !== null && row.post_assessment_score !== undefined
													? `${Number(row.post_assessment_score).toFixed(1)}%`
													: '—'}
											</TableCell>
											<TableCell>
												<NoteCell row={row} />
											</TableCell>
											<TableCell>
												{canEdit && (
													<Button variant="outline" size="sm" onClick={() => openEdit(row)}>
														Edit
													</Button>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
					{rows.data.length > 0 ? (
						<TablePagination total={rows.total} from={rows.from} to={rows.to} links={rows.links} />
					) : (
						<div className="flex h-full items-center justify-center p-8">
							No training assignments found. Set Next Action to Training on Evaluation Results, or submit a
							Training Request.
						</div>
					)}
				</Card>
			</div>

			<Dialog open={!!editRow} onOpenChange={(open) => !open && closeEdit()}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit Assignment</DialogTitle>
					</DialogHeader>
					<form onSubmit={submitEdit} className="space-y-4">
						<div>
							<p className="text-sm text-muted-foreground">Employee</p>
							<p className="font-medium">{editRow?.employee_name}</p>
						</div>
						<div>
							<Label>Training Type</Label>
							<Select
								value={data.training_type_id || 'none'}
								onValueChange={(value) => setData('training_type_id', value === 'none' ? '' : value)}
								disabled={contentLocked}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select training type" />
								</SelectTrigger>
								<SelectContent position="popper" className="z-[100]">
									<SelectItem value="none">None</SelectItem>
									{sortedTypes.map((type) => (
										<SelectItem key={type.id} value={String(type.id)}>
											{type.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<InputError message={errors.training_type_id} />
						</div>
						<div>
							<Label>Assigned Training Content</Label>
							<Select
								value={data.assigned_training_content_id || 'none'}
								onValueChange={onTrainingContentChange}
								disabled={contentLocked}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select training module" />
								</SelectTrigger>
								<SelectContent position="popper" className="z-[100]">
									<SelectItem value="none">None</SelectItem>
									{sortedModules.map((module) => (
										<SelectItem key={module.id} value={String(module.id)}>
											{module.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{contentLocked && (
								<p className="mt-1 text-xs text-muted-foreground">
									Training content is locked after training is held and attendance is Yes.
								</p>
							)}
							{sortedModules.length === 0 && (
								<p className="mt-1 text-xs text-muted-foreground">
									No recurring modules found. Add one under TD KPI → Recurring Modules.
								</p>
							)}
							<InputError message={errors.assigned_training_content_id} />
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="proposed_training_start_at">Training Start</Label>
								<Input
									id="proposed_training_start_at"
									className="mt-1"
									type="datetime-local"
									value={data.proposed_training_start_at}
									onChange={(e) => {
										if (proposedLocked) return;
										setData('proposed_training_start_at', e.target.value);
									}}
									readOnly={proposedLocked}
									disabled={proposedLocked}
									required
								/>
								<InputError message={errors.proposed_training_start_at} />
							</div>
							<div>
								<Label htmlFor="proposed_training_end_at">Training End</Label>
								<Input
									id="proposed_training_end_at"
									className="mt-1"
									type="datetime-local"
									value={data.proposed_training_end_at}
									onChange={(e) => {
										if (proposedLocked) return;
										setData('proposed_training_end_at', e.target.value);
									}}
									readOnly={proposedLocked}
									disabled={proposedLocked}
									required
								/>
								<InputError message={errors.proposed_training_end_at} />
							</div>
						</div>
						{proposedLocked && (
							<div className="flex flex-wrap items-center gap-3">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="shrink-0"
									onClick={openChangeRequest}
									disabled={
										data.is_training_held ||
										Boolean(editRow?.proposed_date_change_pending) ||
										!editRow?.proposed_date_change_open
									}
								>
									{editRow?.proposed_date_change_pending ? 'Change request pending' : 'Request a change'}
								</Button>
								<p className="text-xs text-muted-foreground">
									{data.is_training_held
										? 'Training times cannot be changed after training is held.'
										: editRow?.proposed_date_change_pending
											? 'A change request is waiting for review.'
											: editRow?.proposed_date_change_open
												? 'These times are locked after they are saved. Request a change to ask for new ones.'
												: 'A change can only be requested more than 24 hours before the training start time.'}
								</p>
							</div>
						)}
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="is_training_held">Is Training Held</Label>
								<Select
									value={data.is_training_held ? 'yes' : 'no'}
									onValueChange={(value) => onHeldChange(value === 'yes')}
									disabled={!heldEnabled}
								>
									<SelectTrigger id="is_training_held">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="yes">Yes</SelectItem>
										<SelectItem value="no">No</SelectItem>
									</SelectContent>
								</Select>
								<InputError message={errors.is_training_held} />
							</div>
							<div>
								<Label htmlFor="attendance">Attendance</Label>
								<Select
									value={data.attendance ? 'yes' : 'no'}
									onValueChange={(value) => setData('attendance', value === 'yes')}
									disabled={!attendanceEnabled}
								>
									<SelectTrigger id="attendance">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="yes">Yes</SelectItem>
										<SelectItem value="no">No</SelectItem>
									</SelectContent>
								</Select>
								{contentLocked && !attendanceLocked && (
									<p className="mt-1 text-xs text-muted-foreground">
										Shared training details are locked for this request group. Attendance is still
										set per employee.
									</p>
								)}
								<InputError message={errors.attendance} />
							</div>
						</div>
						{data.is_training_held && (
							<div className="space-y-3 rounded-md border p-3">
								<Label>Actual training times</Label>
								<Select
									value={data.actual_source || undefined}
									onValueChange={(value: 'same' | 'different') => {
										setData({
											...data,
											actual_source: value,
											actual_training_start_at: value === 'same' ? '' : data.actual_training_start_at,
											actual_training_end_at: value === 'same' ? '' : data.actual_training_end_at,
										});
									}}
									disabled={contentLocked}
								>
									<SelectTrigger>
										<SelectValue placeholder="Choose actual times" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="same">Same as proposed</SelectItem>
										<SelectItem value="different">Different times</SelectItem>
									</SelectContent>
								</Select>
								<InputError message={errors.actual_source} />
								{data.actual_source === 'different' && (
									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<Label htmlFor="actual_training_start_at">Actual training start</Label>
											<Input
												id="actual_training_start_at"
												type="datetime-local"
												value={data.actual_training_start_at}
												onChange={(e) => setData('actual_training_start_at', e.target.value)}
												required
												disabled={contentLocked}
											/>
											<InputError message={errors.actual_training_start_at} />
										</div>
										<div>
											<Label htmlFor="actual_training_end_at">Actual training end</Label>
											<Input
												id="actual_training_end_at"
												type="datetime-local"
												value={data.actual_training_end_at}
												onChange={(e) => setData('actual_training_end_at', e.target.value)}
												required
												disabled={contentLocked}
											/>
											<InputError message={errors.actual_training_end_at} />
										</div>
									</div>
								)}
							</div>
						)}
						<div>
							<Label>Assessment</Label>
							<Input value={editRow?.assessment_name || '—'} disabled readOnly />
							<p className="mt-1 text-xs text-muted-foreground">
								Assessments are generated automatically after training is held and attendance is Yes.
							</p>
							<InputError message={errors.assessment_id} />
						</div>
						<div>
							<Label htmlFor="post_assessment_score">Score (%)</Label>
							<Input id="post_assessment_score" value="—" disabled readOnly />
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeEdit}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={processing || !data.proposed_training_start_at || !data.proposed_training_end_at}
							>
								Save
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={changeOpen} onOpenChange={(open) => !open && setChangeOpen(false)}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Request a training time change</DialogTitle>
					</DialogHeader>
					<form onSubmit={submitChangeRequest} className="space-y-4">
						<div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-2">
							<div>
								<p className="text-xs font-medium uppercase text-muted-foreground">Name</p>
								<p className="font-medium">{editRow?.employee_name || '—'}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase text-muted-foreground">Branch</p>
								<p>{editRow?.branch || '—'}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase text-muted-foreground">Department</p>
								<p>{editRow?.department || '—'}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase text-muted-foreground">Training type</p>
								<p>{editRow?.training_type || '—'}</p>
							</div>
							<div className="sm:col-span-2">
								<p className="text-xs font-medium uppercase text-muted-foreground">Assigned training content</p>
								<p>{editRow?.assigned_training_content || '—'}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase text-muted-foreground">Current training start</p>
								<p>{editRow?.proposed_training_start_at || '—'}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase text-muted-foreground">Current training end</p>
								<p>{editRow?.proposed_training_end_at || '—'}</p>
							</div>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="requested_proposed_start_at">New training start</Label>
								<Input
									id="requested_proposed_start_at"
									type="datetime-local"
									value={changeRequest.data.requested_proposed_start_at}
									onChange={(e) => changeRequest.setData('requested_proposed_start_at', e.target.value)}
									required
								/>
								<InputError message={changeRequest.errors.requested_proposed_start_at} />
							</div>
							<div>
								<Label htmlFor="requested_proposed_end_at">New training end</Label>
								<Input
									id="requested_proposed_end_at"
									type="datetime-local"
									value={changeRequest.data.requested_proposed_end_at}
									onChange={(e) => changeRequest.setData('requested_proposed_end_at', e.target.value)}
									required
								/>
								<InputError message={changeRequest.errors.requested_proposed_end_at} />
							</div>
						</div>
						<div>
							<Label htmlFor="change_reason">Reason</Label>
							<Textarea
								id="change_reason"
								value={changeRequest.data.reason}
								onChange={(e) => changeRequest.setData('reason', e.target.value)}
								rows={4}
								required
							/>
							<InputError message={changeRequest.errors.reason} />
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setChangeOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={changeRequest.processing}>
								Submit request
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<PopupComponent />
		</AppLayout>
	);
}
