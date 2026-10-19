import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type TdKpiAssignmentRow, type TdKpiOption } from '@/types/td-kpi-assignment';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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

export default function AssignmentsIndex({
	rows,
	trainingTypes = [],
	trainingModules = [],
	request,
}: PageProps) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
	const { can } = usePermission();
	const [search, setSearch] = useState(request?.search ?? '');
	const [editRow, setEditRow] = useState<TdKpiAssignmentRow | null>(null);

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
		training_type_id: '',
		assigned_training_content_id: '',
		proposed_training_date: '',
		is_training_held: false as boolean,
		attendance: false as boolean,
	});

	const hasTrainingContent = Boolean(data.assigned_training_content_id);
	const contentLocked = Boolean(editRow?.content_locked);

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
	}, [flash?.message]);

	function handleSearch() {
		const params: Record<string, string> = {};
		if (search) params.search = search;
		router.get('/training/td-kpi/assignments', params, { preserveState: true, replace: true });
	}

	function openEdit(row: TdKpiAssignmentRow) {
		clearErrors();
		setEditRow(row);
		setData({
			evaluation_result_override_id: String(row.override_id),
			training_type_id: row.training_type_id ? String(row.training_type_id) : '',
			assigned_training_content_id: row.assigned_training_content_id
				? String(row.assigned_training_content_id)
				: '',
			proposed_training_date: row.proposed_training_date ?? '',
			is_training_held: row.is_training_held,
			attendance: row.attendance,
		});
	}

	function closeEdit() {
		setEditRow(null);
		reset();
		clearErrors();
	}

	function onTrainingContentChange(value: string) {
		if (contentLocked) return;
		const contentId = value === 'none' ? '' : value;
		if (!contentId) {
			setData({
				...data,
				assigned_training_content_id: '',
				proposed_training_date: '',
				is_training_held: false,
				attendance: false,
			});
			return;
		}
		setData('assigned_training_content_id', contentId);
	}

	function submitEdit(e: React.FormEvent) {
		e.preventDefault();
		put('/training/td-kpi/assignments/upsert', {
			preserveScroll: true,
			onSuccess: () => closeEdit(),
		});
	}

	const canEdit = can('training.td_kpi.assignments.create') || can('training.td_kpi.assignments.view');

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="TD KPI Assignments" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader>
						<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
							Employees flagged for training from Evaluation Results. Assign training content first, then
							mark held/attendance to generate assessments.
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
										<TableHead className="font-bold text-white">Proposed Training Date</TableHead>
										<TableHead className="font-bold text-white">Is Training Held</TableHead>
										<TableHead className="font-bold text-white">Attendance</TableHead>
										<TableHead className="font-bold text-white">Assessment Name</TableHead>
										<TableHead className="font-bold text-white">Post Assessment Score (%)</TableHead>
										<TableHead className="font-bold text-white">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.data.map((row) => (
										<TableRow
											key={row.assignment_id ?? `override-${row.override_id}`}
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
											<TableCell>{row.proposed_training_date || '—'}</TableCell>
											<TableCell>{yesNo(row.is_training_held)}</TableCell>
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
							No training overrides found. Set Next Action to Training on Evaluation Results first.
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
						<div>
							<Label htmlFor="proposed_training_date">Proposed Training Date (optional)</Label>
							<Input
								id="proposed_training_date"
								type="date"
								value={data.proposed_training_date}
								onChange={(e) => setData('proposed_training_date', e.target.value)}
								disabled={!hasTrainingContent}
							/>
							<InputError message={errors.proposed_training_date} />
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="is_training_held">Is Training Held</Label>
								<Select
									value={data.is_training_held ? 'yes' : 'no'}
									onValueChange={(value) => setData('is_training_held', value === 'yes')}
									disabled={!hasTrainingContent || contentLocked}
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
									disabled={!hasTrainingContent || contentLocked}
								>
									<SelectTrigger id="attendance">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="yes">Yes</SelectItem>
										<SelectItem value="no">No</SelectItem>
									</SelectContent>
								</Select>
								<InputError message={errors.attendance} />
							</div>
						</div>
						<div>
							<Label>Assessment</Label>
							<Input value={editRow?.assessment_name || '—'} disabled readOnly />
							<p className="mt-1 text-xs text-muted-foreground">
								Assessments are generated automatically after training is held and attendance is Yes.
							</p>
							<InputError message={errors.assessment_id} />
						</div>
						<div>
							<Label htmlFor="post_assessment_score">Post Assessment Score (%)</Label>
							<Input id="post_assessment_score" value="—" disabled readOnly />
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeEdit}>
								Cancel
							</Button>
							<Button type="submit" disabled={processing}>
								Save
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}
