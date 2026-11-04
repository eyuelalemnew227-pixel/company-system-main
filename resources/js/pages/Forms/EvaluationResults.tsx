import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '@/components/table-pagination';
import { usePopup } from '@/hooks/use-popup';
import { Download, FilterX, GraduationCap, Eye, Pencil } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

type LinkedForm = { id: number; title: string };
type FiscalOption = { id: number; name: string; fiscal_year_id?: number };
type TrainingTypeOption = { id: number; name: string };

type ResultRow = {
	employee_id: number;
	employee_name: string;
	department_name: string;
	branch_name: string;
	form_id: number;
	form_title: string;
	submission_id: number;
	fiscal_year_id: number | null;
	fiscal_year_name: string | null;
	fiscal_month_id: number | null;
	fiscal_month_name: string;
	score: number | null;
	status: 'pass' | 'fail' | 'not_scored';
	status_label: string;
	next_action: 'na' | 'warning' | 'training' | 'not_scored';
	next_action_label: string;
	training_type_id: number | null;
	training_type_name: string | null;
};

type Summary = {
	rows: number;
	employees: number;
	pass: number;
	fail: number;
	warning: number;
	training: number;
	not_scored: number;
};

type Filters = {
	search: string;
	form_id: string;
	status: string;
	next_action: string;
	fiscal_year_id: string;
	fiscal_month_id: string;
};

type PageState = 'ready' | 'missing_kpi' | 'no_forms';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Form', href: '/forms' },
	{ title: 'Evaluation Results', href: '/forms/evaluation-results' },
];

function statusBadgeClass(status: ResultRow['status']) {
	if (status === 'pass') {
		return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
	}
	if (status === 'fail') {
		return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
	}
	return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
}

function actionBadgeClass(action: ResultRow['next_action']) {
	if (action === 'na') {
		return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
	}
	if (action === 'warning') {
		return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
	}
	if (action === 'training') {
		return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
	}
	return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
}

export default function EvaluationResults({
	kpiName,
	pageState,
	linkedForms = [],
	rows,
	summary,
	trainingTypes = [],
	fiscalYears = [],
	fiscalMonths = [],
	filters,
}: {
	kpiName: string;
	pageState: PageState;
	linkedForms: LinkedForm[];
	rows: {
		data: ResultRow[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
	summary: Summary;
	trainingTypes: TrainingTypeOption[];
	fiscalYears: FiscalOption[];
	fiscalMonths: FiscalOption[];
	filters: Filters;
}) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;
	const { triggerPopup, PopupComponent } = usePopup();
	const [searchInput, setSearchInput] = useState(filters.search);
	const [editRow, setEditRow] = useState<ResultRow | null>(null);

	const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
		employee_id: '',
		form_id: '',
		fiscal_year_id: '',
		fiscal_month_id: '',
		next_action: 'na',
		training_type_id: '',
	});

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (flash?.error) triggerPopup('Error', flash.error, 'error');
	}, [flash, triggerPopup]);

	useEffect(() => {
		setSearchInput(filters.search);
	}, [filters.search]);

	const monthsForYear = useMemo(() => {
		if (filters.fiscal_year_id === 'all') return fiscalMonths;
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === filters.fiscal_year_id);
	}, [fiscalMonths, filters.fiscal_year_id]);

	function applyFilters(next: Partial<Filters>) {
		const params: Record<string, string> = {
			search: next.search ?? filters.search,
			form_id: next.form_id ?? filters.form_id,
			status: next.status ?? filters.status,
			next_action: next.next_action ?? filters.next_action,
			fiscal_year_id: next.fiscal_year_id ?? filters.fiscal_year_id,
			fiscal_month_id: next.fiscal_month_id ?? filters.fiscal_month_id,
		};

		router.get('/forms/evaluation-results', params, {
			preserveState: true,
			preserveScroll: true,
			replace: true,
		});
	}

	function resetFilters() {
		router.get(
			'/forms/evaluation-results',
			{
				search: '',
				form_id: 'all',
				status: 'all',
				next_action: 'all',
				fiscal_year_id: 'all',
				fiscal_month_id: 'all',
			},
			{ preserveState: true, preserveScroll: true, replace: true },
		);
	}

	function exportCsv() {
		const params = new URLSearchParams({
			search: filters.search,
			form_id: filters.form_id,
			status: filters.status,
			next_action: filters.next_action,
			fiscal_year_id: filters.fiscal_year_id,
			fiscal_month_id: filters.fiscal_month_id,
			export: 'csv',
		});
		window.location.href = `/forms/evaluation-results?${params.toString()}`;
	}

	function openEditDialog(row: ResultRow) {
		if (!row.fiscal_year_id || !row.fiscal_month_id) return;
		clearErrors();
		setEditRow(row);
		setData({
			employee_id: String(row.employee_id),
			form_id: String(row.form_id),
			fiscal_year_id: String(row.fiscal_year_id),
			fiscal_month_id: String(row.fiscal_month_id),
			next_action: row.next_action,
			training_type_id: row.training_type_id ? String(row.training_type_id) : '',
		});
	}

	function closeEditDialog() {
		setEditRow(null);
		reset();
		clearErrors();
	}

	function submitEdit(e: React.FormEvent) {
		e.preventDefault();
		put('/forms/evaluation-results/override', {
			preserveScroll: true,
			onSuccess: () => closeEditDialog(),
		});
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Evaluation Results" />
			<div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2 sm:p-4">
				{/* Empty states if KPI or forms not ready */}
				{pageState === 'missing_kpi' && (
					<Card>
						<CardContent className="p-8 text-center">
							<GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
							<CardTitle className="text-lg">KPI not found</CardTitle>
							<p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
								Add a KPI Library entry named "{kpiName}", then link the assessment forms to it.
							</p>
							<Button asChild className="mt-4" variant="outline" size="sm">
								<Link href="/kpi-libraries">Open KPI Library</Link>
							</Button>
						</CardContent>
					</Card>
				)}

				{pageState === 'no_forms' && (
					<Card>
						<CardContent className="p-8 text-center">
							<GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
							<CardTitle className="text-lg">No forms linked</CardTitle>
							<p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
								"{kpiName}" exists, but it is not linked to any form yet.
							</p>
							<Button asChild className="mt-4" variant="outline" size="sm">
								<Link href="/kpi-libraries">Link forms in KPI Library</Link>
							</Button>
						</CardContent>
					</Card>
				)}

				{pageState === 'ready' && (
					<>
						{/* Summary Metric Cards matching other modules */}
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 sm:gap-3">
							<Card>
								<CardContent className="p-3 sm:p-4">
									<div className="text-xs font-medium text-muted-foreground uppercase">Rows</div>
									<div className="text-xl sm:text-2xl font-bold mt-1">{summary.rows}</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3 sm:p-4">
									<div className="text-xs font-medium text-muted-foreground uppercase">Employees</div>
									<div className="text-xl sm:text-2xl font-bold mt-1">{summary.employees}</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3 sm:p-4">
									<div className="text-xs font-medium text-green-700 dark:text-green-400 uppercase">Pass</div>
									<div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{summary.pass}</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3 sm:p-4">
									<div className="text-xs font-medium text-red-700 dark:text-red-400 uppercase">Fail</div>
									<div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400 mt-1">{summary.fail}</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3 sm:p-4">
									<div className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase">Warning</div>
									<div className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">{summary.warning}</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3 sm:p-4">
									<div className="text-xs font-medium text-red-700 dark:text-red-400 uppercase">Training</div>
									<div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400 mt-1">{summary.training}</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="p-3 sm:p-4">
									<div className="text-xs font-medium text-muted-foreground uppercase">Not Scored</div>
									<div className="text-xl sm:text-2xl font-bold text-muted-foreground mt-1">{summary.not_scored}</div>
								</CardContent>
							</Card>
						</div>

						{/* Main Card */}
						<Card>
							<CardHeader className="flex-col space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
									<div>
										<CardTitle className="text-xl sm:text-2xl">Evaluation Results</CardTitle>
										<p className="text-sm text-muted-foreground mt-1">
											Employees scored on forms linked to <span className="font-medium text-foreground">{kpiName}</span>.
											Pass is 75 or above. Fail from 60 to 74.9 is warning. Below 60 is training.
										</p>
									</div>

									<CardAction>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={exportCsv}
											disabled={summary.rows === 0}
											className="w-full sm:w-auto"
										>
											<Download className="mr-1.5 h-4 w-4" />
											Export CSV
										</Button>
									</CardAction>
								</div>

								{/* Filters Toolbar */}
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2 w-full">
									<form
										className="w-full"
										onSubmit={(e) => {
											e.preventDefault();
											applyFilters({ search: searchInput });
										}}
									>
										<Input
											value={searchInput}
											onChange={(e) => setSearchInput(e.target.value)}
											placeholder="Search employee / dept..."
											className="w-full"
										/>
									</form>

									<Select value={filters.form_id} onValueChange={(value) => applyFilters({ form_id: value })}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Form" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All linked forms</SelectItem>
											{linkedForms.map((form) => (
												<SelectItem key={form.id} value={String(form.id)}>
													{form.title}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Select value={filters.status} onValueChange={(value) => applyFilters({ status: value })}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All statuses</SelectItem>
											<SelectItem value="pass">Pass</SelectItem>
											<SelectItem value="fail">Fail</SelectItem>
											<SelectItem value="not_scored">Not scored</SelectItem>
										</SelectContent>
									</Select>

									<Select
										value={filters.next_action}
										onValueChange={(value) => applyFilters({ next_action: value })}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Next action" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All actions</SelectItem>
											<SelectItem value="na">NA</SelectItem>
											<SelectItem value="warning">Warning</SelectItem>
											<SelectItem value="training">Training</SelectItem>
											<SelectItem value="not_scored">Not scored</SelectItem>
										</SelectContent>
									</Select>

									<Select
										value={filters.fiscal_year_id}
										onValueChange={(value) => applyFilters({ fiscal_year_id: value, fiscal_month_id: 'all' })}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Fiscal year" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All years</SelectItem>
											{fiscalYears.map((year) => (
												<SelectItem key={year.id} value={String(year.id)}>
													{year.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Select
										value={filters.fiscal_month_id}
										onValueChange={(value) => applyFilters({ fiscal_month_id: value })}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Fiscal month" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All months</SelectItem>
											{monthsForYear.map((month) => (
												<SelectItem key={month.id} value={String(month.id)}>
													{month.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Button
										type="button"
										variant="outline"
										onClick={resetFilters}
										className="w-full"
									>
										<FilterX className="mr-1.5 h-4 w-4" />
										Reset
									</Button>
								</div>
							</CardHeader>
							<hr />

							<CardContent className="p-2 sm:p-6">
								<div className="overflow-x-auto -mx-2 sm:mx-0">
									<div className="inline-block min-w-full align-middle">
										<Table>
											<TableHeader className="bg-slate-500 dark:bg-slate-700">
												<TableRow>
													<TableHead className="font-bold text-white whitespace-nowrap">Branch</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap">Department</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap">Employee Name</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap">Form</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap">Fiscal Month</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap text-right">Score</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap">Status</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap">Next Action</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap">Training Type</TableHead>
													<TableHead className="font-bold text-white whitespace-nowrap text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{rows.data.length === 0 ? (
													<TableRow>
														<TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
															{summary.rows === 0
																? 'No employees have an assessment matching these filters.'
																: 'No rows match these filters.'}
														</TableCell>
													</TableRow>
												) : (
													rows.data.map((row) => (
														<TableRow
															key={`${row.employee_id}-${row.form_id}-${row.fiscal_month_id ?? 'none'}-${row.submission_id}`}
															className="odd:bg-slate-100 dark:odd:bg-slate-800"
														>
															<TableCell>{row.branch_name}</TableCell>
															<TableCell>{row.department_name}</TableCell>
															<TableCell className="font-medium">{row.employee_name}</TableCell>
															<TableCell>{row.form_title}</TableCell>
															<TableCell>
																<div className="flex flex-col">
																	<span>{row.fiscal_month_name}</span>
																	{row.fiscal_year_name && (
																		<span className="text-xs text-muted-foreground">
																			{row.fiscal_year_name}
																		</span>
																	)}
																</div>
															</TableCell>
															<TableCell className="text-right font-mono font-semibold">
																{row.score === null ? '—' : `${row.score.toFixed(1)}`}
															</TableCell>
															<TableCell>
																<span
																	className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
																>
																	{row.status_label}
																</span>
															</TableCell>
															<TableCell>
																<span
																	className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionBadgeClass(row.next_action)}`}
																>
																	{row.next_action_label}
																</span>
															</TableCell>
															<TableCell>{row.training_type_name || '—'}</TableCell>
															<TableCell className="text-right whitespace-nowrap">
																<div className="flex items-center justify-end gap-1">
																	{row.fiscal_year_id && row.fiscal_month_id && (
																		<Button
																			type="button"
																			variant="outline"
																			size="sm"
																			onClick={() => openEditDialog(row)}
																		>
																			<Pencil className="w-3.5 h-3.5 sm:mr-1" />
																			<span className="hidden sm:inline">Edit</span>
																		</Button>
																	)}
																	<Link href={`/submissions/${row.submission_id}`}>
																		<Button variant="outline" size="sm">
																			<Eye className="w-3.5 h-3.5 sm:mr-1" />
																			<span className="hidden sm:inline">View</span>
																		</Button>
																	</Link>
																</div>
															</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</div>

								{rows.data.length > 0 && (
									<TablePagination total={rows.total} from={rows.from} to={rows.to} links={rows.links} />
								)}
							</CardContent>
						</Card>
					</>
				)}
			</div>

			{/* Edit Next Action Dialog */}
			<Dialog open={!!editRow} onOpenChange={(open) => !open && closeEditDialog()}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Next Action</DialogTitle>
						<DialogDescription>
							Override the next action or assign a specific training type for this employee.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={submitEdit} className="space-y-4">
						<div className="rounded-md border p-3 bg-muted/40 space-y-1">
							<div className="text-xs text-muted-foreground uppercase font-medium">Employee</div>
							<div className="font-semibold text-sm">{editRow?.employee_name}</div>
							<div className="text-xs text-muted-foreground pt-1">
								{editRow?.form_title} — {editRow?.fiscal_month_name}
								{editRow?.fiscal_year_name ? ` / ${editRow.fiscal_year_name}` : ''}
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="next_action">Next action *</Label>
							<Select
								value={data.next_action}
								onValueChange={(value) => {
									setData('next_action', value);
									if (value !== 'training') setData('training_type_id', '');
								}}
							>
								<SelectTrigger id="next_action">
									<SelectValue placeholder="Select next action" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="na">NA</SelectItem>
									<SelectItem value="warning">Warning</SelectItem>
									<SelectItem value="training">Training</SelectItem>
									<SelectItem value="not_scored">Not scored</SelectItem>
								</SelectContent>
							</Select>
							<InputError message={errors.next_action} />
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="training_type_id">Training type</Label>
							<Select
								value={data.training_type_id || 'none'}
								onValueChange={(value) => setData('training_type_id', value === 'none' ? '' : value)}
								disabled={data.next_action !== 'training'}
							>
								<SelectTrigger id="training_type_id">
									<SelectValue placeholder="Select training type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{trainingTypes.map((type) => (
										<SelectItem key={type.id} value={String(type.id)}>
											{type.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<InputError message={errors.training_type_id} />
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeEditDialog}>
								Cancel
							</Button>
							<Button type="submit" variant="default" disabled={processing}>
								Save Changes
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<PopupComponent />
		</AppLayout>
	);
}
